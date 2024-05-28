FROM node:20.11.0 as build

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

FROM node:20.11.0-slim

RUN apt update && apt install curl libssl-dev -y --no-install-recommends

WORKDIR /app

COPY --chown=node:node --from=build /app/entrypoint.sh entrypoint.sh
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/.env .env
COPY --chown=node:node --from=build /app/package*.json ./

RUN chmod +x entrypoint.sh
RUN npm install --omit=dev --legacy-peer-deps

ENV NODE_ENV production

EXPOSE $HTTP_PORT

CMD ["./entrypoint.sh"]
