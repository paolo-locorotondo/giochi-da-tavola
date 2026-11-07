// Avvio per `pnpm dev`: porta 8081, così non confligge con `docker compose up` (8080).
// Il proxy di Vite (apps/web/vite.config.ts) punta alla stessa porta.
process.env.PORT ??= "8081";
process.env.SOLO_SERVER = "1";
await import("./index");

export {};
