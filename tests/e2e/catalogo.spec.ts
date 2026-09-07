import { expect, test } from "@playwright/test";

import {
  ajustarProducto,
  productoPorSlug,
  recargoActual,
  rutaDe,
  tasaVigente,
} from "./soporte/datos";

test.describe("Catálogo", () => {
  test("lista productos y marca la categoría en la que se está", async ({ page }) => {
    await page.goto("/componentes");

    await expect(page.getByRole("heading", { name: "Componentes", level: 1 })).toBeVisible();

    // La categoría activa se marca con aria-current, que es lo que además lee
    // un lector de pantalla.
    const activa = page.locator('header nav a[aria-current="page"]');
    await expect(activa.first()).toHaveText("Componentes");

    await page.getByRole("link", { name: "Laptops", exact: true }).first().click();
    await page.waitForURL("**/laptops");
    await expect(page.locator('header nav a[aria-current="page"]').first()).toHaveText("Laptops");
  });

  /**
   * La comprobación más importante de la tienda.
   *
   * El cliente puede multiplicar el precio que ve por la tasa del BCV y tiene
   * que darle los bolívares de al lado. Si esto se rompe, el número deja de ser
   * auditable y la promesa de la tienda con él.
   */
  test("el precio en bolívares es el precio mostrado por la tasa del BCV", async ({ page }) => {
    const producto = await productoPorSlug("corsair-vengeance-32gb-ddr5-6000");
    const recargo = await recargoActual();
    const tasa = await tasaVigente();

    const enBolivares = Math.round(producto.precio_usd * (1 + recargo / 100) * 100) / 100;
    const bolivares = Math.round(enBolivares * tasa);

    await page.goto(await rutaDe(producto.slug));

    const panel = page.locator("main");
    await expect(panel).toContainText(formatearUsd(enBolivares));
    await expect(panel).toContainText(formatearBs(bolivares));

    // Y el de divisas, que es el que se carga en el panel, se ofrece aparte.
    if (recargo > 0) {
      await expect(page.getByText("Pagando en dólares")).toBeVisible();
      await expect(panel).toContainText(formatearUsd(producto.precio_usd));
    }
  });

  test("busca por texto y filtra por condición", async ({ page }) => {
    const producto = await productoPorSlug("corsair-vengeance-32gb-ddr5-6000");
    const restaurar = await ajustarProducto(producto.id, { condicion: "usado" });

    try {
      await page.goto("/componentes?q=corsair");
      await expect(page.getByRole("heading", { name: /corsair/i }).first()).toBeVisible();

      // La condición se muestra en la tarjeta, siempre.
      await page.goto("/componentes");
      const tarjeta = page.getByRole("link", { name: new RegExp(producto.nombre, "i") }).first();
      await expect(tarjeta).toContainText(/usado/i);

      // Y filtra: con «Usado» marcado solo queda este.
      await page.getByRole("checkbox", { name: /usado/i }).check();
      await page.waitForURL(/condicion=usado/);
      await expect(page.locator("main h3")).toHaveCount(1);
      await expect(page.locator("main h3")).toHaveText(producto.nombre);
    } finally {
      await restaurar();
    }
  });

  test("un producto despublicado sale del catálogo pero su ficha sigue en pie", async ({ page }) => {
    const producto = await productoPorSlug("corsair-vengeance-32gb-ddr5-6000");
    const ruta = await rutaDe(producto.slug);
    const restaurar = await ajustarProducto(producto.id, { activo: false });

    try {
      await page.goto("/componentes");
      await expect(page.getByRole("heading", { name: producto.nombre })).toHaveCount(0);

      // Quien lo compró llega aquí desde su pedido: no puede ser un 404.
      await page.goto(ruta);
      await expect(page.getByRole("heading", { name: producto.nombre, level: 1 })).toBeVisible();
      await expect(page.getByText("No disponible").first()).toBeVisible();
      await expect(page.getByRole("button", { name: /agregar al carrito/i })).toHaveCount(0);
    } finally {
      await restaurar();
    }
  });
});

function formatearUsd(valor: number): string {
  return `$${valor.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatearBs(valor: number): string {
  return `Bs ${valor.toLocaleString("es-VE", { maximumFractionDigits: 0 })}`;
}
