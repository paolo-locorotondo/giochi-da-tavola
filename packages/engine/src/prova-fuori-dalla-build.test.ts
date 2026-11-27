import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Le pagine di PROVA (prova-*.html) servono solo in sviluppo: non devono finire in produzione.
 * Due garanzie: (1) la build parte solo da index.html (vite.config.ts non dichiara altri ingressi);
 * (2) nessun file dell'app, dei giochi o dei pacchetti importa i moduli `prova` (solo le pagine prova-*.tsx).
 */
const RADICE = resolve(__dirname, "../../..");

function file(dir: string, estensioni: string[], fuori = ["node_modules", "dist", ".git"]): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    if (fuori.includes(nome)) continue;
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...file(p, estensioni, fuori));
    else if (estensioni.some((e) => nome.endsWith(e))) out.push(p);
  }
  return out;
}

describe("pagine di prova", () => {
  it("la build non ha ingressi oltre a index.html", () => {
    const cfg = readFileSync(join(RADICE, "apps/web/vite.config.ts"), "utf-8");
    expect(cfg).not.toMatch(/rollupOptions|build\s*:\s*\{[^}]*input/);
    expect(cfg).not.toMatch(/prova-/);
  });

  it("nessun file di produzione importa i moduli di prova", () => {
    const cartelle = ["apps/web/src", "apps/server/src", "games", "packages"].map((c) => join(RADICE, c));
    const intrusi: string[] = [];
    for (const dir of cartelle) {
      for (const f of file(dir, [".ts", ".tsx"])) {
        const nome = f.replaceAll("\\", "/");
        // Le pagine di prova e questo test possono nominarli; gli altri no.
        if (/\/prova[^/]*\.(ts|tsx)$/.test(nome) || nome.endsWith("prova-fuori-dalla-build.test.ts")) continue;
        const testo = readFileSync(f, "utf-8");
        if (/from\s+["'][^"']*\/prova(?:["'/]|-)/.test(testo) || /@gdt\/[a-z-]+\/prova["']/.test(testo)) intrusi.push(nome.replace(RADICE.replaceAll("\\", "/"), ""));
      }
    }
    expect(intrusi).toEqual([]);
  });
});
