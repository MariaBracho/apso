import { defineConfig, devices } from "@playwright/test";

// Las pruebas hablan con el Supabase local para preparar y limpiar datos, y
// esas claves viven en .env. Node 24 lo carga sin dependencias.
try {
  process.loadEnvFile(".env");
} catch {
  // Sin .env las pruebas fallan con un mensaje claro en `soporte/datos.ts`.
}

const PUERTO = 3000;

export default defineConfig({
  testDir: "./tests/e2e",

  // En serie y con un solo worker: varias pruebas tocan el mismo inventario y
  // los mismos pedidos, así que en paralelo se pisarían entre ellas y los
  // fallos serían intermitentes, que es la peor clase de fallo.
  fullyParallel: false,
  workers: 1,

  // Reintentar escondería justo eso. Si algo falla, que falle.
  retries: 0,

  // El servidor de desarrollo compila cada ruta la primera vez que se visita,
  // y eso puede pasar de diez segundos.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-VE",
  },

  projects: [
    {
      name: "escritorio",
      use: { ...devices["Desktop Chrome"] },
      // Lo de móvil se corre solo en el proyecto de teléfono; aquí no
      // probaría nada, porque a este ancho esos elementos ni existen.
      testIgnore: /movil\.spec\.ts/,
    },
    // La mayoría entra desde el teléfono, y esta tienda tiene navegación,
    // buscador y tasa distintos ahí. Solo se corren los flujos donde el
    // tamaño cambia algo.
    {
      name: "telefono",
      use: { ...devices["Pixel 7"] },
      testMatch: /movil\.spec\.ts/,
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
