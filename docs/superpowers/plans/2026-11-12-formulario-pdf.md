# Formulário para liberar PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Entregar localmente o fluxo mobile de cadastro, persistência no PostgreSQL e download autorizado de um PDF.

**Architecture:** Next.js App Router em Node.js, com páginas de formulário/confirmação e duas rotas HTTP. Acesso ao PostgreSQL por `pg`, migrações SQL e autorização por cookie assinado com HMAC. PDF em diretório privado configurável.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, PostgreSQL 17, Docker Compose, Vitest e Playwright.

**Spec:** `docs/superpowers/specs/2026-11-12-formulario-pdf-design.md`.

**Workspace:** diretório atual, sem repositório Git existente; não criar worktree nem alterar outros projetos. Execução já autorizada pelo usuário. Publicação definitiva depende dos insumos listados na especificação.

## 1. Base e ambiente local

Arquivos: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.dockerignore`, `.env.example`, `compose.yaml`, `Dockerfile`, `scripts/migrate.ts`, `db/migrations/001_leads.sql`.

- [x] Instalar versões exatas de Next/React/pg e ferramentas TypeScript/Vitest/Playwright/tsx; criar scripts `dev`, `build`, `start`, `typecheck`, `test`, `test:integration`, `test:e2e`, `db:migrate`.
- [x] Criar PostgreSQL dedicado com volume persistente, healthcheck e porta local padrão 5437, sobrescrevível por `POSTGRES_PORT`. Não usar os containers existentes.
- [x] Criar `.env.local` ignorado com credenciais aleatórias de teste, URL local e segredo aleatório de pelo menos 32 bytes. Nunca exibir os valores.
- [x] Criar migração transacional e versionada para `leads`, com seis campos e índice definidos na especificação; o migrador lê `.env.local` via configuração Next, aceita `DATABASE_URL` externo e reaplica sem duplicar a migração.
- [x] Executar `docker compose up -d db`, `npm run db:migrate` e verificar healthcheck. Resultado esperado: tabela existente e serviço independente dos outros bancos.

## 2. Domínio e persistência

Arquivos: `src/lib/lead-validation.ts`, `src/lib/db.ts`, `src/lib/leads.ts`, `src/lib/download-access.ts`, `tests/lead-validation.test.ts`, `tests/download-access.test.ts`, `tests/leads.integration.test.ts`.

- [x] Escrever e executar testes RED de normalização (acentos, nome de uma palavra, telefone com DDD/com +55, e-mail), rejeição dos campos e chave UUID.
- [x] Implementar `validateLead(input)` como união `{ success: true, data: { name, phone, email, submissionKey } }` ou `{ success: false, errors: { name?, phone?, email?, form? } }`. A validação é compartilhada com o navegador e não importa módulos Node.
- [x] Escrever testes RED de token válido, adulterado, expirado e sem dados pessoais; implementar `createDownloadToken(leadId, secret, now?)` e `verifyDownloadToken(token, secret, now?)`, validade de 3600 s e finalidade fixa `pdf-download`. Exportar `DOWNLOAD_COOKIE_NAME` e `DOWNLOAD_TTL_SECONDS`.
- [x] Implementar pool único, timeout de conexão e tratamento de erro ocioso sem dados sensíveis. Exportar `getPool()`.
- [x] Com PostgreSQL real, testar gravação, concorrência na mesma chave, reenvio idêntico e conflito de chave com dados diferentes. Implementar `saveLead(data)`, que retorna `{ id, created }`; conflito usa `SubmissionConflictError`. Usar `INSERT ... ON CONFLICT DO NOTHING RETURNING id`, seguido de consulta parametrizada e comparação. Não impor unicidade por contato.
- [x] Executar testes unitários e integração: todos verdes, limpando apenas registros criados pelos testes.

## 3. HTTP e entrega do PDF

Arquivos: `src/lib/server-config.ts`, `src/lib/request-security.ts`, `src/app/api/cadastros/route.ts`, `src/app/api/download/route.ts`, `tests/http.integration.test.ts`.

- [x] Validar variáveis privadas em tempo de requisição; não exigir banco durante o build. Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` em produção, `Path=/`, uma hora.
- [x] `POST /api/cadastros`: aceitar JSON de até 8 KiB, verificar origem contra `APP_URL`, validar campos e UUID, salvar e somente então emitir cookie. Resposta de sucesso `{ redirectTo: '/obrigado' }`, status 201 para criação e 200 para repetição. Erros: 400 com `{ errors }`, 409 para conflito, 413 para corpo grande, 415 para tipo inválido, 503 para indisponibilidade; nunca devolver dados pessoais ou erros internos.
- [x] `GET /api/download`: validar cookie; sem autorização, redirecionar para `/?status=expired`. Abrir arquivo privado configurado e transmitir com `application/pdf`, `Content-Disposition: attachment` e `Cache-Control: private, no-store`. Arquivo ausente redireciona para `/obrigado?error=file`, permitindo nova tentativa sem novo cadastro. Não aceitar caminho de arquivo do cliente.
- [x] Testar pelo HTTP real: sem cadastro não baixa, entrada inválida não grava/não emite cookie, sucesso grava e baixa, reenvio não duplica, cookie adulterado/expirado não baixa, arquivo ausente permite recuperação. Verificar cabeçalhos e bloqueio de origem externa.

## 4. Interface mobile

Arquivos: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/obrigado/page.tsx`, `src/app/globals.css`, `src/app/not-found.tsx`, `src/app/error.tsx`, `src/components/brand.tsx`, `src/components/lead-form.tsx`, `src/components/icons.tsx`, `src/lib/site-content.ts`, `public/logo.png`, `public/icon.svg`.

- [x] Aplicar tokens da especificação: branco, preto `#111111`, dourado `#C6A04A`, cinza `#595959`; sistema tipográfico sans serif. Faixa preta com logo branca preservada; margens transparentes resolvidas pela composição CSS. Original `docs/logo.png` intacto.
- [x] Formulário em uma coluna, largura máxima próxima de 440 px, título aprovado, três campos com rótulos, teclado/autocomplete apropriados, foco e erros acessíveis, botão de 52 px e aviso de finalidade. Sem conteúdo inventado sobre o PDF e sem decoração que distraia.
- [x] `LeadForm` gera chave por tentativa e a mantém em falhas de rede; trava toques concorrentes; preserva valores, exibe erro por campo e de rede, envia JSON e navega somente no sucesso. Em conflito troca a chave e solicita novo envio, sem repetir automaticamente.
- [x] Confirmação é Server Component, lê cookie assinado; inválido redireciona ao formulário. Renderizar botão/link comum para `/api/download`, aviso sobre salvar no celular e estado de arquivo indisponível.
- [x] Manter apenas o formulário como Client Component. Não colocar dados pessoais em URL, localStorage ou logs. Texto do material e aviso de privacidade ficam centralizados em `site-content.ts`.
- [x] Conferir comportamento a 320/375/390/430 px e desktop, sem overflow; testar teclado, foco de erro e estados de envio.

## 5. Material de teste, documentação e container da aplicação

Arquivos: `scripts/create-demo-pdf.mjs`, `private/material-demo.pdf`, `README.md`, `Dockerfile`, `compose.yaml`, `deploy/nginx.conf.example`.

- [x] Criar PDF de teste válido identificado como demonstração, sem prometer conteúdo final. O arquivo privado e `.env.local` não entram no build público.
- [x] Docker multi-stage com saída standalone do Next, usuário sem privilégios, PDF por volume somente leitura e banco externo substituível por `DATABASE_URL`.
- [x] Documentar comandos locais, migração, variáveis, troca do PDF, configuração do PostgreSQL próprio, proxy HTTPS/limites e backup sob responsabilidade da hospedagem. Não criar n8n, CRM ou painel.
- [x] Documentar que o servidor valida a liberação e entrega; não consegue comprovar que a pessoa salvou no aparelho.

## 6. Verificação e entrega

Arquivos: `playwright.config.ts`, `tests/e2e/flow.spec.ts`, `docs/VERIFICACAO.md`.

- [x] `npm run test` e `npm run test:integration`: passar com banco real isolado; preservar cadastros de outras execuções/projetos.
- [x] `npm run typecheck` e `npm run build`: concluir sem erro. Testar também a aplicação iniciada em modo de produção.
- [x] Playwright: preencher formulário, verificar confirmação e download; testar validações, edição/colagem do telefone, recuperação de falha e ausência de overflow em tamanhos mobile. Não simular aparelho físico como se fosse teste físico.
- [x] Inspecionar screenshot mobile/desktop e console; corrigir problemas observados, sem repetir suítes já aprovadas se não houve alterações relacionadas.
- [x] Revisão independente em duas etapas: aderência à especificação, depois qualidade/correção. Corrigir achados relevantes e repetir verificações afetadas.
- [x] Registrar comandos/resultados e pendências reais de publicação (PDF, conteúdo, domínio, conexão de produção e teste físico). Entregar aplicação local, instruções e resultado das verificações; não publicar externamente sem infraestrutura fornecida.


## Resultado da execução

Implementação local concluída e revisada. Resultados e pendências de publicação em docs/VERIFICACAO.md. PDF de demonstração em uso; publicação e testes físicos dependem dos insumos finais do solicitante.

