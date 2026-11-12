# Material de Jaíne Teixeira Cortes

Formulário mobile para registrar nome, telefone e e-mail no PostgreSQL e liberar um PDF privado. Fluxo: QR Code → formulário → confirmação → **Baixar PDF**.

## Rodar localmente

Requisitos: Node.js 24 e Docker com Compose. Comandos a partir da raiz do projeto:

```powershell
npm ci
npm run setup:local
npm run db:up
npm run db:migrate
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). O setup cria `.env.local` com senha e segredo aleatórios, sem sobrescrever um arquivo existente. O banco do projeto é `jaine-qrcode-db-1`, com volume próprio e porta padrão **127.0.0.1:5437**. Outros containers não são usados.

Se a porta 5437 estiver ocupada, altere `POSTGRES_PORT` e a porta de `DATABASE_URL` em `.env.local` antes de subir o banco. Aguarde o healthcheck ficar saudável antes da migração. O migrador registra as migrações aplicadas e pode ser executado novamente.

Para parar o PostgreSQL sem apagar os dados:

```powershell
docker compose --env-file .env.local stop db
```

## Configurações

Use `.env.example` como referência; mantenha os valores reais fora do repositório.

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão usada pela aplicação local, migrações e testes de integração |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Inicialização do banco local Docker |
| `POSTGRES_PORT` | Porta local publicada pelo banco de teste |
| `DOCKER_DATABASE_URL` | Conexão usada pela aplicação dentro do container; pode apontar para seu PostgreSQL próprio |
| `APP_URL` | Origem exata da aplicação, por exemplo `https://material.seudominio.com`; usada para validar os envios e redirecionar |
| `PDF_PATH` | Local: `./docs/Guia_MEI_2026.pdf`. Na imagem Docker: `/app/private/material.pdf` |
| `PDF_DOWNLOAD_NAME` | Nome sugerido ao baixar o arquivo |
| `DOWNLOAD_COOKIE_SECRET` | Segredo aleatório de pelo menos 32 caracteres; trocar invalida liberações anteriores |

O formulário deve ser aberto na mesma origem configurada em `APP_URL`. Para experimentar em um celular na mesma rede, configure essa variável com o IP local do computador e a porta 3000, reinicie o dev server e abra esse mesmo endereço no telefone. O servidor de desenvolvimento já aceita conexões de rede; a disponibilidade depende da rede e do firewall do computador.

Em produção use HTTPS. O cookie é `HttpOnly`, `SameSite=Lax`, válido por uma hora, e recebe `Secure` no modo de produção.

## Trocar o material e os textos

O PDF definitivo está em `docs/Guia_MEI_2026.pdf`, versionado no GitHub. O Dockerfile inclui esse arquivo em `/app/private/material.pdf`, fora da pasta pública, para servir pela rota de download autorizada. No EasyPanel não é necessário configurar um mount para o PDF.

1. Para trocar o material, substitua `docs/Guia_MEI_2026.pdf` e envie a alteração ao GitHub.
2. Faça novo deploy para reconstruir a imagem com o arquivo atualizado. Se mudar o nome do PDF no repositório, ajuste o `COPY` no Dockerfile.
3. `PDF_DOWNLOAD_NAME` define o nome sugerido ao usuário; na imagem o padrão é `Guia_MEI_2026.pdf`. `PDF_PATH` aponta para o arquivo a ser lido.
4. Os textos do material e o aviso sobre os dados ficam em `src/lib/site-content.ts`; mudanças exigem novo build de produção.

O comando `npm run demo:pdf` continua disponível para gerar um PDF de demonstração separado, quando necessário para testes; o fluxo padrão usa o Guia MEI 2026.

A logo original está em `docs/logo.png`. A cópia em `public/logo.png` mantém o arquivo original; a composição CSS enquadra as margens transparentes sem redesenhar ou remover elementos da marca.

## Banco de dados

`leads` contém `id`, `name`, `phone`, `email`, `created_at` e `submission_key`. Telefone é salvo como `+55` seguido do número nacional; e-mail normalizado em minúsculas; datas são instantes `timestamptz`, com sessões em UTC.

Cada novo preenchimento intencional gera um registro. Repetições da mesma operação usam a mesma `submission_key` e não duplicam a linha, inclusive em concorrência. Não há unicidade por contato.

Para relatórios futuros, os limites de cada dia devem considerar `America/Sao_Paulo`. O n8n poderá usar uma credencial própria somente de leitura; integração e relatório não foram implementados.

## Verificações

Com o banco migrado e `npm run dev` aberto em outro terminal:

```powershell
npm test
npm run test:integration
npm run test:e2e
npm run typecheck
npm run build
```

Na primeira execução dos testes de navegador, instale o Chromium:

```powershell
npx playwright install chromium
```

Os testes de integração usam o banco e a aplicação locais, criam registros fictícios e removem apenas os próprios dados. Use um ambiente de teste. `TEST_BASE_URL` permite verificar uma instância servida em outra porta. Nunca aponte testes para a produção.

Os testes de navegador usam emulação mobile no Chromium. Eles não substituem a conferência em iPhone/Safari e Android/Chrome reais, nem a leitura de um QR Code impresso.

## Container da aplicação

O Dockerfile faz build multi-stage e executa o Next standalone com usuário sem privilégios. O Guia MEI 2026 está incluído em um caminho privado da imagem. Credenciais e segredos são fornecidos pelo ambiente e não entram na imagem.

```powershell
docker compose --env-file .env.local build app
# O banco deve estar disponível antes de migrar:
docker compose --env-file .env.local run --rm app node scripts/migrate.ts
docker compose --env-file .env.local --profile app up -d app
```

Para usar seu PostgreSQL, configure `DOCKER_DATABASE_URL` com o host acessível pelo container; não precisa iniciar o serviço `db` deste Compose. Configure TLS na conexão conforme a infraestrutura do banco. Para testar tudo em Docker com o banco local, rode `npm run db:up` primeiro.

O serviço da aplicação publica a porta 3000 apenas em loopback. Coloque seu proxy HTTPS à frente dele; há um exemplo ajustável em `deploy/nginx.conf.example`. Revise domínio, certificados e limite de envios conforme o público: visitantes de um evento podem compartilhar IP. O exemplo substitui os cabeçalhos de encaminhamento recebidos pelo proxy em vez de confiar nos valores enviados pelo visitante.

Configure backup do banco na sua hospedagem antes de receber contatos reais. A imagem não é um backup dos cadastros.

## Publicar e gerar o QR Code

Para hospedar no EasyPanel, siga o guia em [docs/EASYPANEL.md](docs/EASYPANEL.md), com origem GitHub, Dockerfile, variáveis e migração. O PDF já acompanha a aplicação.

O PDF definitivo e o nome do material já foram fornecidos. Ainda são necessários a aprovação dos textos, domínio, hospedagem e conexão de produção. Depois de disponibilizar a URL HTTPS definitiva, gere um QR Code preto sobre branco apontando para a raiz do site e confira a leitura no tamanho de impressão.

A liberação exige cadastro salvo. O servidor entrega o PDF por rota autorizada, sem URL pública direta, e permite novas tentativas dentro de uma hora. O navegador decide se baixa ou abre o arquivo, e a aplicação não consegue comprovar que ele foi salvo no telefone.

Planejamento: `docs/superpowers/specs/2026-11-12-formulario-pdf-design.md`. Execução: `docs/superpowers/plans/2026-11-12-formulario-pdf.md`. Resultados: `docs/VERIFICACAO.md`.
