# 🚀 Deploy do zero na Oracle Cloud (Ubuntu + Docker)

Guia para subir a Presenteie em uma instância nova da Oracle Cloud (plano gratuito), com domínio próprio e HTTPS.

```
Internet ──► nginx do servidor (80/443, HTTPS via certbot)
               ├── /      ──► container frontend  (127.0.0.1:5173)
               └── /api/  ──► container backend   (127.0.0.1:3001) ──► container db (PostgreSQL)
```

Front-end e API ficam no **mesmo domínio**, o que simplifica cookies de login e CORS.

---

## 0. Antes de começar

- **Chave SSH** no seu computador (`ssh-keygen -t ed25519 -f ~/.ssh/oracle_presenteie`) — guarde um backup dela.
- **Domínio** com acesso ao painel de DNS.
- **Credenciais**: Cloudinary (fotos), Gmail com *senha de app* (e-mails e código de cadastro) e, se quiser login com Google, um OAuth Client no Google Cloud.

## 1. Criar a instância

**Compute → Instances → Create instance**

| Campo | Valor recomendado |
| :--- | :--- |
| Image | **Canonical Ubuntu 22.04** (build *aarch64*) |
| Shape | **VM.Standard.A1.Flex** — 2 OCPUs / 12 GB (o plano gratuito permite até 4 OCPUs / 24 GB) |
| Networking | VCN com sub-rede pública e **Assign a public IPv4 address** |
| SSH keys | **Paste public keys** → conteúdo de `~/.ssh/oracle_presenteie.pub` (uma única vez) |

> "Out of capacity"? Tente 1 OCPU / 6 GB, outro horário, ou `VM.Standard.E2.1.Micro` (nesse caso faça o passo 3 — swap).

Anote o **IP público** da instância.

## 2. Liberar as portas 80 e 443

**No painel da Oracle:** Networking → Virtual cloud networks → sua VCN → sub-rede → *Security List* → **Add Ingress Rules**:
- Source CIDR `0.0.0.0/0`, protocolo TCP, *Destination port* `80`
- Source CIDR `0.0.0.0/0`, protocolo TCP, *Destination port* `443`

**No servidor** (as imagens Ubuntu da Oracle bloqueiam portas via iptables):

```bash
ssh -i ~/.ssh/oracle_presenteie ubuntu@IP_DO_SERVIDOR

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 3. (Só em máquinas com até 2 GB de RAM) Criar swap

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Instalar Docker, nginx e certbot

```bash
sudo apt update && sudo apt -y upgrade
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo apt -y install nginx certbot python3-certbot-nginx git
exit   # saia e entre de novo no SSH para o grupo "docker" valer
```

## 5. Apontar o domínio

No painel de DNS do domínio, crie (ou altere) os registros:
- `A` → `@` → IP do servidor
- `A` → `www` → IP do servidor

A propagação costuma levar de alguns minutos a 1 hora. Confira com `ping seudominio.com.br`.

## 6. Baixar o projeto e configurar o `.env`

```bash
git clone https://github.com/GABRIELRODRIGUESCAVALCANTE/E-commerce-presenteie.git presenteie
cd presenteie
# Se as melhorias ainda não estiverem na master: git checkout melhorias-frontend-ux-seguranca

cp .env.docker.example .env
# Gera os segredos automaticamente
sed -i "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=$(openssl rand -hex 32)/" .env
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$(openssl rand -hex 16)/" .env
nano .env
```

Preencha no `.env` (troque `seudominio.com.br` pelo seu domínio):

```env
FRONTEND_URL=https://seudominio.com.br
BACKEND_URL=https://seudominio.com.br
VITE_API_URL=https://seudominio.com.br/api

ADMIN_EMAIL=seu-email-de-admin@gmail.com

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=senha-de-app-do-gmail

GOOGLE_CLIENT_ID=...       # opcional
GOOGLE_CLIENT_SECRET=...   # opcional
```

> O `.env` contém segredos: nunca faça commit dele (ele já está no `.gitignore`).

## 7. Subir os containers

```bash
docker compose up -d --build
docker compose ps                 # db, backend e frontend devem estar "running"/"healthy"
curl -s http://127.0.0.1:3001/api # deve responder {"mensagem":"API da Presenteie rodando com sucesso!"}
```

As tabelas do banco são criadas automaticamente na primeira inicialização (migrations).

## 8. Configurar o nginx e o HTTPS

```bash
sudo cp deploy/nginx-presenteie.conf /etc/nginx/sites-available/presenteie
sudo sed -i 's/SEU_DOMINIO/seudominio.com.br/g' /etc/nginx/sites-available/presenteie
sudo ln -sf /etc/nginx/sites-available/presenteie /etc/nginx/sites-enabled/presenteie
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# HTTPS gratuito (Let's Encrypt), com renovação automática
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br --redirect --agree-tos -m seu-email@gmail.com -n
```

Acesse `https://seudominio.com.br` — a loja deve abrir.

## 9. Login com Google (opcional)

No Google Cloud Console → *APIs & Services* → *Credentials* → seu OAuth Client:
- **Authorized JavaScript origins:** `https://seudominio.com.br`
- **Authorized redirect URIs:** `https://seudominio.com.br/api/auth/callback/google`

## 10. Conta de administrador

Crie a conta pelo próprio site usando o e-mail definido em `ADMIN_EMAIL` (o código de verificação chega por e-mail). Se o envio de e-mail ainda não estiver configurado, crie a conta direto pelo servidor:

```bash
docker compose exec -e NEW_ADMIN_PASSWORD='uma-senha-forte' backend node scripts/set-admin-password.js
```

Depois entre no site com esse e-mail e senha: o link **Painel admin** aparece no menu.

---

## Rotina

**Atualizar para uma nova versão:**

```bash
cd ~/presenteie && git pull && docker compose up -d --build
```

**Backup do banco:**

```bash
cd ~/presenteie && docker compose exec -T db pg_dump -U postgres presenteie > ~/backup-$(date +%F).sql
```

**Ver logs:**

```bash
docker compose logs -f backend
```

## Desligar o servidor antigo

Só depois que o site novo estiver funcionando no domínio: no painel da Oracle, termine a instância antiga marcando **Permanently delete the attached boot volume**, e apague backups de volume que não forem mais necessários.
