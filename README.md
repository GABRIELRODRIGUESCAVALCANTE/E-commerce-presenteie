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
- **React Router Dom:** Navegação de página única (SPA).
- **CSS Vanilla Premium:** Estilização baseada em tokens com animações suaves e design moderno, totalmente responsivo.

---

## 🛡️ Segurança e Observabilidade (Security & Audit By Design)

- **Auditoria Persistente:** Operações críticas (criação/edição/exclusão de produtos, alteração de estoque, criação e atualização de pedidos, acessos não autorizados) geram registros auditáveis em tabela PostgreSQL `audit_logs`.
- **Rastreabilidade por `requestId`:** Correlação end-to-end entre requisições HTTP, logs da aplicação e registros no banco via cabeçalho `X-Request-ID`.
- **Redação Automática de Dados Sensíveis:** Senhas, tokens, cartões e segredos são omitidos tanto nos logs JSON quanto nas colunas `JSONB` de auditoria.
- **Anti-Fraude de Preços (Server-Side Calculation):** Todos os valores financeiros no checkout são recalculados baseados nos preços intocáveis do banco de dados, protegidos por locks de linha (`FOR UPDATE`) para evitar estourar o estoque.
- **Zero Vazamento de Credenciais:** As credenciais críticas ficam retidas em variáveis de ambiente `.env`.
- **Exclusões Seguras (Soft-Deletes):** A exclusão de produtos arquiva o item (`ativo = false`), preservando relacionamentos contábeis em `itens_pedido`.

Para documentação completa sobre o sistema de auditoria e logs, veja [AUDIT.md](file:///home/gabriel/Documents/Projeto-presenteie/AUDIT.md).

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
```

### 3. Migrations e Banco de Dados

```bash
# Executa as migrations para criar as tabelas de auditoria e controle
npm run migrate
```

### 4. Executando os Testes

```bash
# Roda a suíte de testes de auditoria e segurança
npm test
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
Feito com 💖 para entregar a melhor experiência de compra!
