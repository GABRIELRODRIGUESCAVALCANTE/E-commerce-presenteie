# 🎁 E-commerce Presenteie

Um E-commerce completo, seguro e moderno, focado em presentes personalizados e retiradas no local. Construído com as melhores práticas de segurança e desenvolvimento ágil, garantindo estabilidade, observabilidade e escalabilidade para vendas.

---

## 🚀 Tecnologias Utilizadas

### Backend (Node.js)
- **Express.js:** Roteamento e gerenciamento da API.
- **PostgreSQL:** Banco de Dados Relacional.
- **pg (node-postgres):** Pool de conexões e transações assíncronas nativas (`BEGIN`/`COMMIT`).
- **Pino & Pino-HTTP:** Sistema profissional de logging JSON de alta performance.
- **Auditoria de Segurança (PostgreSQL JSONB):** Registros persistentes de ações críticas com cálculo de diff (`old_values` vs `new_values`).
- **Better Auth:** Autenticação completa e segura (Google OAuth, Sessões seguras em banco de dados).
- **Nodemailer:** Disparos de E-mail via SMTP do Gmail.
- **Cloudinary:** Armazenamento escalável e otimizado para as fotos dos presentes.
- **Helmet & Express-Rate-Limit:** Blindagem do servidor contra ataques de força bruta, XSS, MIME Sniffing, etc.
- **Multer:** Uploads seguros de imagem em memória (buffer).

### Frontend (React + Vite)
- **React.js:** Componentização da interface.
- **Vite:** Compilador HMR ultrarrápido para desenvolvimento.
- **Axios:** Cliente HTTP com suporte a *Credentials* em cross-origin (CORS).
- **React Router Dom:** Navegação de página única (SPA) com URLs compartilháveis (busca, filtros e produtos).
- **CSS com Design Tokens:** Paleta com contraste AA, tipografia Fraunces + Inter, componentes padronizados e layout responsivo (mobile first).

---

## 🛡️ Segurança e Observabilidade (Security & Audit By Design)

- **Auditoria Persistente:** Operações críticas (criação/edição/exclusão de produtos, alteração de estoque, criação e atualização de pedidos, acessos não autorizados) geram registros auditáveis em tabela PostgreSQL `audit_logs`.
- **Rastreabilidade por `requestId`:** Correlação end-to-end entre requisições HTTP, logs da aplicação e registros no banco via cabeçalho `X-Request-ID`.
- **Redação Automática de Dados Sensíveis:** Senhas, tokens, cartões e segredos são omitidos tanto nos logs JSON quanto nas colunas `JSONB` de auditoria.
- **Anti-Fraude de Preços (Server-Side Calculation):** Todos os valores financeiros no checkout são recalculados baseados nos preços intocáveis do banco de dados, protegidos por locks de linha (`FOR UPDATE`) para evitar estourar o estoque.
- **Zero Vazamento de Credenciais:** As credenciais críticas ficam retidas em variáveis de ambiente `.env`.
- **Exclusões Seguras (Soft-Deletes):** A exclusão de produtos arquiva o item (`ativo = false`), preservando relacionamentos contábeis em `itens_pedido`.

- **Verificação de E-mail no Servidor:** O cadastro por e-mail/senha só é aceito pelo Better Auth após a validação do código OTP (antes a checagem existia apenas no front-end).
- **Rate limiting por contexto:** Limite restrito em login, cadastro e redefinição de senha; consultas de sessão usam o limite global.

Para documentação completa sobre o sistema de auditoria e logs, veja [AUDIT.md](AUDIT.md).

---

## 🗂️ Estrutura do Projeto

```
├── server.js                 # API Express (rotas, Better Auth, regras de pedido)
├── lib/ middleware/ services/ # Logger, requestId e auditoria
├── migrations/               # SQL idempotente (schema da loja, auditoria, OTP)
├── scripts/                  # migrate.js e set-admin-password.js
├── tests/                    # node:test + supertest (unitários e integração)
└── front/
    ├── index.html            # Metadados de SEO/compartilhamento
    ├── nginx.conf            # Servidor de produção (cache e cabeçalhos de segurança)
    └── src/
        ├── api/              # Cliente axios e funções de cada endpoint
        ├── components/       # Header, Footer, ProductCard, CartDrawer, Field, Icon...
        ├── context/          # Providers: Auth, Cart, Toast
        ├── hooks/            # useCart, useAuth, useToast, useDialog, usePageMeta...
        ├── pages/            # Home, ProductPage, CartPage, Checkout, Auth, MyOrders, admin/
        ├── styles/           # tokens.css, base.css, components.css, pages.css
        └── utils/            # Formatação, imagens otimizadas, máscaras
```

### Páginas do front-end

| Rota | Descrição |
| :--- | :--- |
| `/` | Vitrine com busca (`?busca=`), categoria (`?categoria=`) e ordenação (`?ordem=`) |
| `/produto/:id/:slug` | Página do produto (URL compartilhável, produtos relacionados) |
| `/carrinho` · `/checkout` · `/pedido-confirmado` | Fluxo de compra com retirada no local |
| `/auth` · `/esqueci-senha` · `/redefinir-senha` | Login, cadastro com OTP, Google e recuperação de senha |
| `/meus-pedidos` | Histórico com linha do tempo do status |
| `/admin` | Painel (pedidos, estoque, novo produto) — carregado sob demanda |

---

## 💻 Como Rodar o Projeto Localmente

### Pré-Requisitos
1. Node.js (v18+)
2. PostgreSQL (v14+) rodando na máquina
3. Uma conta Cloudinary para imagens
4. Conta Google Cloud para chaves OAuth (Better Auth)

### 1. Clonando e Instalando Dependências

```bash
# Clone este repositório
git clone https://github.com/GABRIELRODRIGUESCAVALCANTE/E-commerce-presenteie.git

# Instale as dependências do Backend
cd E-commerce-presenteie
npm install

# Instale as dependências do Frontend
cd front
npm install
```

### 2. Configurando Variáveis de Ambiente
Na raiz do backend, crie um arquivo chamado `.env` baseando-se no `.env.example`:

```env
PORT=3001
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=presenteie

LOG_LEVEL=info
AUDIT_RETENTION_DAYS=90

BETTER_AUTH_SECRET="gerar-chave-super-segura-aqui"

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_secret

# E-mail Admin
ADMIN_EMAIL=seu_email@gmail.com
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app_do_gmail

# Cloudinary (upload das fotos dos produtos)
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

No front-end, crie `front/.env` a partir de `front/.env.example` (apenas `VITE_API_URL`). O acesso ao painel admin é decidido pelo back-end (`ADMIN_EMAIL`), então `VITE_ADMIN_EMAIL` não é mais necessário.

### 3. Migrations e Banco de Dados

```bash
# Cria/atualiza as tabelas do Better Auth, da loja (categorias, produtos, pedidos),
# de auditoria e de verificação de e-mail. Tudo é idempotente e também roda no startup.
npm run migrate
```

### Definindo a senha do administrador

```bash
# A senha nunca deve ficar escrita no código. Sem e-mails, usa ADMIN_EMAIL do .env.
NEW_ADMIN_PASSWORD='uma-senha-forte' npm run set-admin-password -- admin@seudominio.com
```

### 4. Executando os Testes

```bash
# Roda a suíte de testes (unitários + integração). Requer o PostgreSQL configurado no .env.
npm test

# Front-end: lint e build de produção
cd front && npm run lint && npm run build
```

### 5. Rodando os Servidores

```bash
# Em um terminal (Inicia o Backend na porta 3001)
npm run dev

# Em outro terminal (Inicia o Frontend Vite na porta 5173)
cd front
npm run dev
```

Pronto! O app estará disponível no navegador em `http://localhost:5173`.

---

## ☁️ Deploy em produção

Passo a passo completo para subir em uma instância nova da Oracle Cloud (Ubuntu + Docker + nginx + HTTPS): veja **[DEPLOY.md](DEPLOY.md)**.

---

## 🐳 Como Rodar com Docker

O projeto já possui suporte completo a containers com **Docker** e **Docker Compose**, incluindo o banco PostgreSQL, Backend Node.js e Frontend com Nginx:

### 1. Subir toda a stack com Docker Compose
```bash
# Crie o .env a partir do exemplo e defina BETTER_AUTH_SECRET (obrigatório)
cp .env.docker.example .env
sed -i "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$(openssl rand -hex 32)/" .env

# Constrói as imagens e inicia os containers em segundo plano
docker compose up --build -d

# Para visualizar os logs em tempo real
docker compose logs -f

# Para parar a aplicação
docker compose down
```

A aplicação ficará disponível em:
- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001/api`
- **PostgreSQL:** `localhost:5432`

### 2. Gerar imagens Docker individualmente

```bash
# Imagem do Backend
docker build -t presenteie-backend:latest .

# Imagem do Frontend
docker build -t presenteie-frontend:latest ./front
```

---
Feito com 💖 para entregar a melhor experiência de compra!
