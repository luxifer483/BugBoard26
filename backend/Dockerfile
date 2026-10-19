# Prepara un backend Node con le dipendenze bloccate dal package-lock.
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node sql ./sql
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
