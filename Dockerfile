# Un solo contenitore: costruisce l'app e avvia il server di gioco che la serve.
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @gdt/web build

FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production PORT=8080 STATIC_DIR=/app/apps/web/dist
EXPOSE 8080
WORKDIR /app/apps/server
CMD ["pnpm", "start"]
