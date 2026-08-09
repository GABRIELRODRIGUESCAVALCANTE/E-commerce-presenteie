# 🎁 E-commerce Presenteie

Um E-commerce completo, seguro e moderno, focado em presentes personalizados e retiradas no local. Construído com as melhores práticas de segurança e desenvolvimento ágil, garantindo estabilidade e escalabilidade para vendas.

## 🚀 Tecnologias Utilizadas

### Backend (Node.js)
- **Express.js:** Roteamento e gerenciamento da API.
- **PostgreSQL:** Banco de Dados Relacional.
- **pg (node-postgres):** Pool de conexões e transações assíncronas nativas (`BEGIN`/`COMMIT`).
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

## 🛡️ Segurança (Security By Design)
A arquitetura deste projeto passou por uma bateria rigorosa de testes, apresentando robustez total contra ataques comuns:

- **Anti-Fraude de Preços (Server-Side Calculation):** Todos os valores financeiros no checkout são recalculados baseados nos preços intocáveis do banco de dados, protegidos por locks de linha (`FOR UPDATE`) para evitar estourar o estoque.
- **Zero Vazamento de Credenciais:** As credenciais críticas ficam retidas em variáveis de ambiente `.env`, impossíveis de serem empurradas ao GitHub devido a exclusões rígidas no `.gitignore`.
- **Prevenção de IDOR e Hijacking:** O servidor nunca confia no ID do usuário passado pelo corpo das requisições; toda operação lê diretamente a sessão criptografada decodificada nos cabeçalhos HTTP.
- **Exclusões Seguras (Soft-Deletes):** Para não quebrar relações de pedidos antigos (chaves estrangeiras), a exclusão de produtos do catálogo apenas "arquiva" o item (`ativo = false`), escondendo-o da vitrine, sem danificar a base contábil.
- **Integração de Notificações Assíncronas:** Hooks de banco disparam e-mails via Nodemailer num fio independente da API, garantindo que o servidor não sofra *timeout* em picos.

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
DB_NAME=postgres
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

No frontend (dentro da pasta `front/`), crie outro `.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_ADMIN_EMAIL=seu_email@gmail.com
```

### 3. Rodando os Servidores

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
