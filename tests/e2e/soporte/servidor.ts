import type { FullConfig } from "@playwright/test";

/**
 * Comprueba que en el puerto esté apso y no otra aplicación.
 *
 * `reuseExistingServer` hace que Playwright aproveche lo que ya esté
 * escuchando, y eso es lo que se quiere el 99% de las veces. Pero si ahí hay
 * otro proyecto, las pruebas corren contra él y fallan una por una con
 * mensajes que no señalan la causa: «no encuentro el botón de entrar»,
 * «la URL no es la esperada». Este aviso cuesta un fetch y ahorra esa búsqueda.
 */
export default async function comprobarServidor(config: FullConfig) {
  const url = config.projects[0]?.use?.baseURL;
  if (!url) return;

  let html: string;
  try {
    html = await fetch(url).then((r) => r.text());
  } catch {
    // Todavía no hay nada escuchando: Playwright lo va a levantar él mismo.
    return;
  }

  if (!/apso/i.test(html)) {
    throw new Error(
      `En ${url} hay otra aplicación, no apso. Ciérrala o corre las pruebas ` +
        `en otro puerto:\n\n  PORT=3100 pnpm test:e2e\n`,
    );
  }
}
