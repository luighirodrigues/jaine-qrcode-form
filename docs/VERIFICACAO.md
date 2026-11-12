# Verificação da implementação

Data: 12/11/2026.

## Resultado

Aplicação local implementada e verificada com PostgreSQL real. O formulário registra os dados antes da liberação, abre a confirmação e entrega o PDF por rota autorizada. O arquivo disponível nesta etapa é identificado como demonstração.

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | 65 testes passaram, em 6 arquivos |
| `npm run test:integration` | 12 testes passaram: PostgreSQL real e HTTP contra a aplicação |
| `npm run test:e2e` | 9 testes passaram no Chromium com emulação mobile |
| `npm run typecheck` | Tipos de rotas gerados e TypeScript sem erro |
| `npm run build` | Build de produção concluído |
| `npm run db:migrate`, repetido | Migração inicial aplicada e segunda execução sem reaplicar |
| `docker compose --env-file .env.local build app` | Imagem construída, incluindo novo build sem segredos locais |
| Migração dentro do container da aplicação | Executada com sucesso pelo usuário sem privilégios |
| Integração contra o container de produção em porta temporária 3001 | Os mesmos 12 testes de PostgreSQL/HTTP passaram |
| Navegador contra o container de produção em porta temporária 3001 | Os mesmos 9 testes passaram, incluindo cadastro, cookie e download |

As repetições em produção validam o ambiente do container; não representam testes adicionais no total de 86 casos.

## O que foi conferido

- Nome com acentos e nome de uma palavra; telefone brasileiro com DDD; colagem com `+55`; normalização de e-mail.
- Indicação de campos inválidos e foco no primeiro erro.
- Falha de rede mantém os campos e a chave da operação na tentativa seguinte.
- Persistência real, reenvio idêntico, conflito de chave e oito envios concorrentes com apenas uma linha.
- Contatos iguais podem se cadastrar novamente com outra chave.
- Validação de origem, tipo JSON e limite real do corpo de 8 KiB.
- Nenhum cookie emitido quando a gravação falha, nos testes de rota.
- Confirmação e arquivo bloqueados sem autorização; cookie adulterado ou expirado recusado.
- Resposta de download contém bytes PDF e cabeçalhos de arquivo privado.
- Arquivo ausente, caminho não regular e recuperação com o mesmo token cobertos nos testes de rota.
- Layout sem overflow horizontal em 320, 375, 390, 430 e 1280 px.
- Inspeção visual das capturas mobile e desktop; console sem erros após hidratação.
- Revisão independente de aderência à especificação e revisão independente de qualidade, ambas aprovadas após corrigir a recuperação de falhas de arquivo.

Os dados fictícios gerados pelos testes foram removidos por suas chaves. Um registro fictício de uma verificação inicial foi removido por combinação exata de nome e e-mail de teste. Nenhum outro banco/container foi alterado.

## Ambiente entregue

- Preview de desenvolvimento: `http://localhost:3000` enquanto o processo local estiver em execução.
- PostgreSQL: `jaine-qrcode-db-1`, porta local 5437, volume persistente próprio.
- Credenciais de teste em `.env.local`, ignorado pelo Git e excluído da imagem Docker.
- Container temporário `jaine-qrcode-app-check` usado para validar produção; encerrado após os testes.
- A logo original permanece intacta; enquadramento das margens feito em CSS.
- Instruções de execução, troca do PDF e hospedagem em `README.md`.

## Pendências de publicação

1. Receber o PDF definitivo e aprovar nome/descrição do material.
2. Aprovar o texto final sobre finalidade e uso dos contatos.
3. Configurar domínio HTTPS, hospedagem e PostgreSQL de produção, incluindo backup.
4. Gerar o QR Code da URL definitiva e conferir sua leitura no tamanho de impressão.
5. Testar a experiência em iPhone/Safari e Android/Chrome físicos, incluindo a ação de salvar o arquivo.

Não houve publicação externa. A emulação Chromium não equivale a teste em aparelhos físicos. O servidor não comprova que um PDF entregue foi salvo no telefone.
