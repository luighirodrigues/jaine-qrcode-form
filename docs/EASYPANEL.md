# Publicação no EasyPanel

O projeto pode ser implantado como um serviço **App**, usando o `Dockerfile` na raiz. A imagem de produção já foi construída e testada localmente com cadastro e download reais.

## 1. Conectar o repositório

- Tipo de serviço: **App**.
- Origem: **GitHub**.
- Repositório: `luighirodrigues/jaine-qrcode-form`.
- Branch: `main`.
- Build Path: `/`.
- Builder: **Dockerfile**.
- Caminho do Dockerfile: `Dockerfile`.

O repositório é privado; autorize sua conta/conexão GitHub no EasyPanel para acessá-lo. Também é possível usar a origem Git com uma chave de deploy somente de leitura. [Documentação do EasyPanel](https://easypanel.io/docs/services/app).

O `compose.yaml` é uma alternativa para desenvolvimento ou execução manual. Ao criar um serviço App com o Dockerfile, o EasyPanel usará as configurações do próprio painel para banco, armazenamento e domínio.

## 2. Configurar o ambiente

Na área de variáveis do serviço, configure os valores reais:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://USUARIO:SENHA@HOST_DO_POSTGRES:5432/BANCO
APP_URL=https://material.seudominio.com
PDF_PATH=/app/private/material.pdf
PDF_DOWNLOAD_NAME=Guia_MEI_2026.pdf
DOWNLOAD_COOKIE_SECRET=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO
```

- `DATABASE_URL` deve apontar para seu PostgreSQL acessível de dentro do container. Se o banco também estiver no EasyPanel, use o host interno fornecido pelo serviço. Configure TLS conforme a hospedagem do banco.
- `APP_URL` precisa ser a origem HTTPS exata usada no navegador, sem caminho adicional. Cadastros vindos de outra origem serão recusados.
- Gere um segredo aleatório de pelo menos 32 caracteres para `DOWNLOAD_COOKIE_SECRET`. Por exemplo, em um terminal Node: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Guarde o resultado somente no ambiente do painel.
- As variáveis `POSTGRES_*` e `DOCKER_DATABASE_URL` do Compose local não são necessárias para o serviço App; ele usa diretamente `DATABASE_URL`.

## 3. PDF incluído na aplicação

O arquivo `docs/Guia_MEI_2026.pdf` é versionado no repositório e copiado pelo Dockerfile para `/app/private/material.pdf`. Ele já acompanha a imagem de produção; não é necessário enviar o arquivo à VPS nem configurar Storage/Bind.

O PDF fica fora da pasta pública. O site entrega o arquivo somente por `/api/download`, após validar a autorização emitida depois do cadastro.

Se você configurou um mount em `/app/private` ou `/app/private/material.pdf` seguindo a instrução anterior, remova-o para usar o arquivo incluído na imagem; um mount sobre esse caminho encobre o PDF da aplicação.

Para atualizar o material, substitua `docs/Guia_MEI_2026.pdf`, envie o commit ao GitHub e faça novo deploy. Se mudar o nome do arquivo na origem, ajuste também o `COPY` correspondente no Dockerfile. `PDF_DOWNLOAD_NAME` controla o nome apresentado ao usuário.

## 4. Domínio, deploy e migração

1. Configure o domínio com HTTPS e **porta interna 3000**. A imagem escuta em `0.0.0.0:3000`.
2. Execute o deploy com as variáveis configuradas. O PDF já estará na imagem.
3. Abra o **Shell** do serviço e execute, antes de receber cadastros:

   ```sh
   node scripts/migrate.ts
   ```

   O comando cria a tabela `leads` e registra a migração. Pode ser executado novamente sem reaplicar as migrações já concluídas.

4. Confira os logs e faça um cadastro pelo domínio final, seguido do download.
5. Depois da conferência, gere o QR Code apontando para `APP_URL`.

O Dockerfile já define o comando de inicialização; não é preciso substituí-lo por `npm run dev`. A configuração de domínio e o Shell são recursos do serviço App. [Referência do EasyPanel](https://easypanel.io/docs/services/app).

## Antes de divulgar

- Aprove os textos do material e o aviso de uso dos contatos em `src/lib/site-content.ts` com a responsável.
- Configure o backup do PostgreSQL na sua infraestrutura.
- Confira o fluxo em iPhone/Safari e Android/Chrome e teste a leitura do QR Code impresso.

O envio ao GitHub disponibiliza o código. A configuração e a implantação no seu EasyPanel são realizadas no seu servidor.
