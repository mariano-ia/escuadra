import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

// Next carga .env.local solo; vitest no. Los evals llaman a la API real, así que
// cargamos las claves acá (parser mínimo KEY=VALUE, sin pisar lo ya seteado).
const envPath = resolve(__dirname, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      // `import "server-only"` lanza en Node fuera de Next; lo neutralizamos.
      "server-only": resolve(__dirname, "tests/eval/noop.ts"),
    },
  },
  test: {
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
