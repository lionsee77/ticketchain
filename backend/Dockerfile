FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN apk add --no-cache git curl && yarn install --frozen-lockfile
COPY . .
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8545
ENTRYPOINT ["/entrypoint.sh"]
