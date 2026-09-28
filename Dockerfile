FROM node:22-alpine

WORKDIR /app

EXPOSE 7000

ENV PORT=7000
ENV NODE_OPTIONS="--openssl-legacy-provider"
ENV CI=true

CMD ["sh", "-c", "touch admin/.env && npm install && npm run build:admin && npm run admin"]
