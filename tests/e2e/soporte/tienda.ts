import { type Page, expect } from "@playwright/test";

import { rutaDe } from "./datos";

/**
 * Agrega un producto al carrito desde su ficha.
 *
 * El botón es un componente de cliente y Playwright lo considera pulsable en
 * cuanto aparece en pantalla, aunque React todavía no le haya enganchado el
 * manejador: la primera pulsación se puede perder.
 *
 * Por eso se reintenta, pero antes de reintentar se espera de verdad a que el
 * contador suba. Sin esa espera, el reintento llegaba encima de un clic que sí
 * había funcionado y el carrito terminaba con dos unidades en vez de una — un
 * helper que corrompe lo que va a comprobar.
 */
export async function agregarAlCarrito(page: Page, slug: string, unidades = 1) {
  await page.goto(await rutaDe(slug));

  for (let i = 0; i < unidades; i++) {
    const objetivo = (await unidadesEnCarrito(page)) + 1;

    await expect(async () => {
      await page.getByRole("button", { name: /agregar al carrito/i }).click();
      await expect(contadorDelCarrito(page)).toHaveAttribute(
        "aria-label",
        new RegExp(`${objetivo}\\s+art`),
        { timeout: 4_000 },
      );
    }).toPass({ timeout: 25_000 });
  }
}

function contadorDelCarrito(page: Page) {
  return page.getByRole("link", { name: /ver el carrito/i });
}

/** Lo que dice el contador del carrito en la barra superior. */
export async function unidadesEnCarrito(page: Page): Promise<number> {
  const etiqueta = (await contadorDelCarrito(page).getAttribute("aria-label")) ?? "";
  const encontrado = etiqueta.match(/(\d+)\s+art/);
  return encontrado ? Number(encontrado[1]) : 0;
}
