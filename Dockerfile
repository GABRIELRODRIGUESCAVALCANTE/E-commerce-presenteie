# syntax=docker/dockerfile:1
FROM node:20-alpine AS runner

WORKDIR /app

# Definir ambiente para produção
ENV NODE_ENV=production

# Copiar arquivos de manifesto de dependências
COPY package*.json ./

# Instalar apenas dependências de produção de forma limpa
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código-fonte da aplicação
COPY . .

# Ajustar propriedade dos arquivos para o usuário seguro não-root 'node'
RUN chown -R node:node /app

# Utilizar usuário não-root por segurança
USER node

# Porta padrão da API Express
EXPOSE 3001

# Healthcheck interno via Node HTTP
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/produtos', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

# Iniciar o servidor (executa migrations automaticamente no startup)
CMD ["node", "server.js"]
