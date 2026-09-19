# syntax=docker/dockerfile:1
# Estágio 1: Build da aplicação React com Vite
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci

# Copiar código-fonte da aplicação frontend
COPY . .

# Argumento para URL da API injetada no build do Vite
ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

# Compilar aplicação para produção
RUN npm run build

# Estágio 2: Servidor Web Nginx otimizado
FROM nginx:alpine

# Copiar os arquivos gerados no build para o Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração personalizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta 80 do Nginx
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
