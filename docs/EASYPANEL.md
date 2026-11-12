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
PDF_DOWNLOAD_NAME=material-jaine.pdf
DOWNLOAD_COOKIE_SECRET=SUBSTITUA_POR_UM_SEGREDO_ALEATORIO
```

- `DATABASE_URL` deve apontar para seu PostgreSQL acessível de dentro do container. Se o banco também estiver no EasyPanel, use o host interno fornecido pelo serviço. Configure TLS conforme a hospedagem do banco.
- `APP_URL` precisa ser a origem HTTPS exata usada no navegador, sem caminho adicional. Cadastros vindos de outra origem serão recusados.
- Gere um segredo aleatório de pelo menos 32 caracteres para `DOWNLOAD_COOKIE_SECRET`. Por exemplo, em um terminal Node: `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. Guarde o resultado somente no ambiente do painel.
- As variáveis `POSTGRES_*` e `DOCKER_DATABASE_URL` do Compose local não são necessárias para o serviço App; ele usa diretamente `DATABASE_URL`.

## 3. Disponibilizar o PDF

O PDF fica fora da imagem Docker e não é enviado ao GitHub.

Envie o arquivo definitivo para um caminho privado no seu servidor. Em **Storage**, configure um mount **Bind** desse arquivo para `/app/private/material.pdf`, com acesso somente de leitura quando disponível. Garanta que o usuário do container, UID 1001, consiga ler o arquivo. O destino precisa coincidir com `PDF_PATH`.

O mount mantém o arquivo acessível após recriar o serviço. O EasyPanel oferece armazenamento persistente e exige nova implantação ao alterar mounts. [Documentação de armazenamento](https://easypanel.io/docs/services/app#storage).

Sem o arquivo, o cadastro ainda é salvo, mas a confirmação informa que o material está indisponível e permite tentar novamente.

## 4. Domínio, deploy e migração

1. Configure o domínio com HTTPS e **porta interna 3000**. A imagem escuta em `0.0.0.0:3000`.
2. Execute o deploy com as variáveis e o mount configurados.
3. Abra o **Shell** do serviço e execute, antes de receber cadastros:

   ```sh
   node scripts/migrate.ts
   ```

   O comando cria a tabela `leads` e registra a migração. Pode ser executado novamente sem reaplicar as migrações já concluídas.

4. Confira os logs e faça um cadastro pelo domínio final, seguido do download.
5. Depois da conferência, gere o QR Code apontando para `APP_URL`.

O Dockerfile já define o comando de inicialização; não é preciso substituí-lo por `npm run dev`. A configuração de domínio e o Shell são recursos do serviço App. [Referência do EasyPanel](https://easypanel.io/docs/services/app).

## Antes de divulgar

- Substitua os textos genéricos do material em `src/lib/site-content.ts` e aprove o aviso de uso dos contatos com a responsável.
- Use o PDF definitivo e configure o backup do PostgreSQL na sua infraestrutura.
- Confira o fluxo em iPhone/Safari e Android/Chrome e teste a leitura do QR Code impresso.

O envio ao GitHub disponibiliza o código. A configuração e a implantação no seu EasyPanel são realizadas no seu servidor.
