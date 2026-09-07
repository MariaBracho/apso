import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Solo lo unitario. Lo de `tests/e2e` lo corre Playwright, que necesita un
    // navegador y la base levantada; mezclarlos haría que `vitest` intentara
    // ejecutarlo y fallara por razones que no tienen que ver con el código.
    include: ["tests/unidad/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
