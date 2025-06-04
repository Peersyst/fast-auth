FROM node:22.11.0 as base

# TODO: Include contracts CI / CD

RUN npm i -g pnpm@9.7.0

WORKDIR /app

COPY . .

RUN pnpm install

RUN pnpm run lint:packages
RUN pnpm run build:packages
RUN pnpm run test:packages
