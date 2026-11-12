# Planejamento — formulário para liberar PDF

Data: 12/11/2026  
Marca: Jaíne Teixeira Cortes  
Etapa: planejamento; a implementação ainda não foi iniciada.

## 1. Objetivo e decisões

Criar um site simples, bonito e rápido, pensado principalmente para celular, que registre nome, telefone e e-mail no PostgreSQL antes de liberar um PDF.

Fluxo principal:

**Câmera do celular → QR Code → formulário → cadastro salvo → confirmação → botão “Baixar PDF”.**

Confirmado pelo solicitante:

- Público quase inteiramente mobile.
- Três campos obrigatórios: nome, telefone e e-mail.
- Tela de confirmação com botão para baixar, escolhida em conversa.
- Identidade em dourado, preto e branco, usando a logo de `docs/logo.png`.
- PostgreSQL hospedado pelo solicitante, com possibilidade de Docker nos testes.
- Integração e relatório do n8n fora desta entrega.

Premissas propostas para manter a primeira versão enxuta:

- Um único PDF, igual para todos, substituível pelo responsável no servidor.
- Telefones brasileiros, com DDD; sem verificação por SMS ou WhatsApp.
- Sem conta, senha, painel administrativo ou envio do arquivo por e-mail.
- Cada novo envio intencional gera um registro; repetições técnicas do mesmo envio não geram duplicatas.

## 2. Experiência no celular

### Tela do formulário — `/`

Uma coluna, com os elementos nesta ordem:

1. Logo em uma faixa preta compacta.
2. Título curto: **“Seu material está a um passo.”**
3. Uma frase explicando o conteúdo do PDF e o preenchimento necessário.
4. Campos **Nome**, **Telefone** e **E-mail**, com rótulos sempre visíveis.
5. Botão principal: **“Liberar meu PDF”**.
6. Aviso discreto explicando a finalidade do cadastro e o uso dos dados.

O título pode ser usado na primeira versão; a descrição específica depende do material final. Evitar menus, carrosséis, pop-ups, vídeos e elementos que disputem atenção com o formulário.

Comportamento:

- Teclado adequado para telefone e e-mail, com preenchimento automático habilitado.
- Máscara de telefone que aceite digitação, colagem e edição naturalmente.
- Campos com fonte mínima de 16 px e altura aproximada de 52 px.
- Botão de largura total e área de toque confortável, com pelo menos 48 px de altura.
- Erros junto ao respectivo campo, sem apagar os dados digitados.
- Durante o envio, botão desabilitado com **“Liberando...”**.
- Se a rede ou o banco falhar, permanecer no formulário e permitir nova tentativa.
- Só avançar após o servidor confirmar que o registro foi persistido.

### Tela de confirmação — `/obrigado`

- Mensagem: **“Tudo pronto! Seu PDF está liberado.”**
- Botão de destaque: **“Baixar PDF”**.
- Texto de apoio: **“Se o arquivo abrir no navegador, use a opção de compartilhar ou salvar do seu celular.”**
- Permitir baixar novamente enquanto a autorização estiver válida, sem criar outro cadastro.
- Não iniciar o download automaticamente: a pessoa usa o botão, conforme a opção escolhida.

A aplicação solicitará o download por meio dos cabeçalhos da resposta. O resultado precisa ser conferido no Safari do iPhone e no Chrome do Android; a interface não deve afirmar que o arquivo já foi salvo no aparelho.

## 3. Direção visual

Visual limpo, com contraste e poucos elementos:

| Elemento | Proposta |
| --- | --- |
| Fundo principal | Branco `#FFFFFF` |
| Faixa da marca e texto principal | Preto suave `#111111` |
| Botão principal e pequenos destaques | Dourado `#C6A04A`, com texto preto |
| Texto secundário | Cinza `#595959` |
| Bordas dos campos | Cinza claro `#D6D6D6` |
| Foco dos campos | Contorno escuro, claramente visível |

O dourado será usado como destaque, evitando texto dourado pequeno sobre branco. O contraste dos estados finais será verificado na implementação.

A logo fornecida tem 1920 × 1080 px, fundo transparente, elementos brancos e margens externas amplas. Preparar uma versão web removendo apenas essas margens e otimizando o arquivo, preservando nome, símbolos, registros profissionais e proporções. Exibi-la sobre preto; manter o original intacto.

Tipografia sem serifa, com preferência pela pilha de fontes do sistema para carregamento rápido. Espaçamento generoso, cantos discretamente arredondados e sem animações decorativas. No desktop, manter o conteúdo centralizado, com largura máxima aproximada de 440 px. No celular, usar margens laterais de 20–24 px e permitir rolagem quando necessário.

## 4. Arquitetura recomendada

**Uma aplicação Next.js com TypeScript, executada em Node.js, com PostgreSQL e acesso ao banco pelo driver `pg`.**

As páginas, o recebimento do formulário e a entrega do PDF ficam no mesmo projeto. Uma tabela e migrações SQL versionadas são suficientes; um ORM não é necessário para este escopo. O Next.js permite hospedagem própria e configuração por variáveis de ambiente no servidor. [Documentação oficial](https://nextjs.org/docs/app/guides/self-hosting).

Alternativas consideradas:

| Abordagem | Vantagem | Custo para este projeto |
| --- | --- | --- |
| Aplicação única — recomendada | Um projeto, uma implantação e mesmo domínio para formulário e download | Requer servidor Node.js |
| Frontend estático com API separada | Permite hospedar cada parte de forma independente | Acrescenta implantação e configuração entre serviços para um fluxo pequeno |

Divisão de responsabilidades: interface do formulário, validação compartilhada, persistência dos cadastros e autorização/entrega do PDF. Credenciais e arquivo privado permanecem no servidor.

### Rotas previstas

| Rota | Responsabilidade |
| --- | --- |
| `GET /` | Apresentar o formulário |
| `POST /api/cadastros` | Validar, normalizar, salvar e emitir autorização de download |
| `GET /obrigado` | Exibir a confirmação quando houver autorização válida |
| `GET /api/download` | Conferir a autorização e entregar o PDF |

## 5. Regras de cadastro e download

### Validação dos dados

- Nome: remover espaços nas extremidades; aceitar acentos e nomes de uma única palavra; entre 2 e 120 caracteres.
- Telefone: aceitar formatação brasileira, com DDD e 10 ou 11 dígitos nacionais, com ou sem o prefixo `+55`; salvar normalizado como `+55` seguido do número nacional.
- E-mail: remover espaços nas extremidades, normalizar para minúsculas e validar formato, com limite de 254 caracteres.
- Validar no navegador para orientar o usuário e repetir a validação no servidor.
- Os dados são declarados pela pessoa; validação de formato não comprova titularidade do telefone ou e-mail.

### Reenvios e falhas

Cada envio terá um identificador aleatório, reutilizado em novas tentativas da mesma operação. Uma restrição única no banco evita dois registros por toque duplo ou por uma resposta perdida após a gravação. O servidor só reutiliza um identificador existente se os dados normalizados coincidirem; se forem diferentes, retorna conflito e a interface inicia uma nova tentativa com outro identificador.

Não haverá unicidade por telefone ou e-mail. A tabela representará cadastros enviados, e não uma lista de pessoas únicas. Assim, um relatório por dia poderá conter uma pessoa que se cadastrou novamente. Não implementar deduplicação de contatos ou relatório nesta etapa.

### Liberação do arquivo

- Salvar o cadastro antes de emitir qualquer autorização.
- Usar cookie assinado pelo servidor, com validade proposta de uma hora, `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- Incluir somente identificação do cadastro, finalidade e expiração na autorização; nunca nome, telefone ou e-mail.
- Guardar o PDF fora da pasta pública, em caminho configurado no servidor.
- Conferir assinatura e expiração em todas as solicitações do arquivo.
- Entregar o arquivo com tipo `application/pdf`, nome de download configurado e `Content-Disposition: attachment`.
- Não armazenar a confirmação e o download em cache compartilhado; usar `Cache-Control: private, no-store`.
- Acesso direto ou autorização expirada: retornar ao formulário com mensagem para preencher novamente.
- Arquivo indisponível: manter o cadastro e a autorização; mostrar erro na confirmação e permitir tentar baixar novamente.

O PDF não terá URL pública direta. Essa liberação condiciona o acesso pelo site ao cadastro, mas um arquivo recebido pode ser compartilhado pela pessoa.

## 6. PostgreSQL

Tabela proposta: `leads`.

| Campo | Tipo | Finalidade |
| --- | --- | --- |
| `id` | `uuid`, chave primária | Identificar o cadastro |
| `name` | `varchar(120)`, obrigatório | Nome informado |
| `phone` | `varchar(16)`, obrigatório | Telefone normalizado |
| `email` | `varchar(254)`, obrigatório | E-mail normalizado |
| `created_at` | `timestamptz`, obrigatório, padrão `now()` | Momento da captura |
| `submission_key` | `uuid`, obrigatório e único | Evitar repetição técnica do envio |

Criar índice em `created_at` para consultas por período. Manter a sessão do banco em UTC e considerar `America/Sao_Paulo` na definição dos intervalos dos futuros relatórios. O tipo `timestamptz` representa o instante, com conversão na apresentação conforme o fuso da sessão. [Documentação oficial](https://www.postgresql.org/docs/current/datatype-datetime.html).

Usar pool de conexões e consultas parametrizadas, sem concatenar o conteúdo dos campos no SQL. [Documentação do driver](https://node-postgres.com/features/queries).

O n8n poderá consultar a tabela futuramente com uma credencial própria de leitura. Não criar fluxo, agendamento, envio ou API de relatório neste projeto.

## 7. Execução e hospedagem

### Desenvolvimento e testes

- Criar um Docker Compose com PostgreSQL e volume persistente, usando porta local livre, vinculada a `127.0.0.1`.
- Rodar a aplicação localmente e aplicar a migração inicial.
- Usar um PDF de teste claramente identificado até receber o arquivo definitivo.
- Manter `.env.example` com nomes das configurações e sem credenciais reais.
- Fixar versões das dependências e das imagens ao implementar; não depender de tags `latest`.

### Produção

- Aplicação em um container Node.js, apontando para o PostgreSQL hospedado pelo solicitante.
- PDF montado em diretório privado, somente leitura para a aplicação; substituição pelo responsável, sem painel de upload.
- Configurações mínimas: `DATABASE_URL`, `APP_URL`, `PDF_PATH`, `PDF_DOWNLOAD_NAME` e `DOWNLOAD_COOKIE_SECRET`.
- HTTPS e proxy reverso à frente da aplicação, com limite de tamanho de requisição e controle de abuso ajustável. O proxy deverá confiar apenas na origem configurada dos cabeçalhos de encaminhamento. [Orientação oficial de hospedagem](https://nextjs.org/docs/app/guides/self-hosting).
- Banco acessível pela aplicação e pelos acessos autorizados do solicitante; credenciais fora do navegador e do repositório.
- Não registrar os dados do formulário nem o conteúdo do cookie em logs.
- Configurar backup do PostgreSQL na infraestrutura do solicitante antes de receber cadastros reais.

O QR Code deve apontar para a URL HTTPS definitiva do formulário. Gerá-lo após definir o domínio, em preto sobre branco, e testar sua leitura no tamanho em que será impresso.

## 8. Etapas e critérios de conclusão da implementação

1. **Preparar a base:** aplicação, configurações, PostgreSQL em Docker e migração. Concluído quando a aplicação conseguir gravar e consultar um registro no banco de teste.
2. **Montar a interface:** logo otimizada, formulário, validações e confirmação. Concluído quando funcionar sem rolagem horizontal em larguras de 320, 375, 390 e 430 px, com foco visível e navegação por teclado.
3. **Conectar o fluxo:** persistência, proteção contra reenvios, autorização e entrega privada do PDF. Concluído quando o caminho completo funcionar e acesso sem autorização for recusado.
4. **Verificar falhas:** banco indisponível, envio inválido, resposta perdida, autorização expirada e PDF ausente. Concluído quando houver recuperação compreensível sem registros duplicados por repetição técnica.
5. **Preparar a publicação:** configuração do servidor, PDF final, texto definitivo e URL/QR Code. Concluído após testar o fluxo no endereço final, incluindo Safari/iPhone e Chrome/Android e a leitura do QR Code por câmera.

Verificações automatizadas focadas: normalização dos campos, persistência/idempotência com PostgreSQL e bloqueio/liberação do download. Complementar com teste do fluxo completo e inspeção visual mobile. Documentar qualquer verificação em aparelho real que ainda dependa de acesso a um dispositivo.

Não medir “arquivo salvo no celular” como resultado do servidor: o cadastro salvo e a resposta de download são verificáveis pela aplicação; a ação de salvar pertence ao navegador e à pessoa.

## 9. Insumos necessários para publicar

Estas informações não impedem preparar a implementação com dados de teste:

- PDF definitivo e nome desejado para o arquivo baixado.
- Nome do material e descrição curta do seu conteúdo.
- Domínio/URL final e acesso à hospedagem da aplicação.
- Conexão do PostgreSQL de produção, entregue por meio seguro.
- Texto aprovado pela responsável sobre finalidade do cadastro e uso dos contatos. Não tratar o preenchimento como autorização genérica de marketing.

## 10. Limites desta entrega

Este documento entrega o planejamento. Nesta etapa não foram criados aplicação, containers, banco, QR Code ou implantação.

O MVP descrito compreende formulário, captura no PostgreSQL, confirmação e liberação privada de um PDF. Painel, CRM, autenticação de usuários, verificação por mensagem, catálogo de materiais, análise de downloads e automação no n8n ficam fora do escopo.
