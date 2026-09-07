import { expect, test } from "@playwright/test";

import { entrarComoAdmin } from "./soporte/sesion";

/**
 * Lo que solo existe en pantalla de teléfono.
 *
 * La mayoría entra desde el teléfono y ahí la barra es otra: las categorías
 * bajan a su propia fila, la tasa se acorta y el buscador se esconde tras una
 * lupa. Nada de esto lo cubre el proyecto de escritorio, donde estos elementos
 * ni siquiera se renderizan visibles.
 */

test.describe("Tienda en teléfono", () => {
  test("las categorías y la tasa siguen alcanzables", async ({ page }) => {
    await page.goto("/componentes");

    // Sin esto, a Laptops no había forma de llegar desde el teléfono.
    await expect(page.getByRole("link", { name: "Laptops", exact: true })).toBeVisible();

    // La tasa sale una sola vez. Se cuentan las etiquetas y no el texto del
    // monto: el monto vive dentro de un párrafo que también lo contiene, así
    // que buscarlo por texto devuelve dos por un solo bloque.
    // `:visible` importa: la de escritorio sigue en el DOM, solo oculta por
    // CSS, y contar sin filtrar daría dos siempre.
    const etiquetas = page.getByRole("banner").locator(".etiqueta:visible", { hasText: /BCV/ });
    await expect(etiquetas).toHaveCount(1);
    await expect(page.getByRole("banner")).toContainText(/Bs [\d.,]+ \/ \$/);
  });

  test("el buscador se abre desde la lupa y busca", async ({ page }) => {
    await page.goto("/componentes");

    await page.getByRole("button", { name: "Buscar en el catálogo" }).click();

    const campo = page.getByRole("searchbox", { name: "Buscar en el catálogo" });
    await expect(campo).toBeFocused();

    await campo.fill("corsair");
    await campo.press("Enter");

    await page.waitForURL(/q=corsair/);
    await expect(page.getByRole("heading", { name: /corsair/i }).first()).toBeVisible();
  });
});

test.describe("Panel en teléfono", () => {
  test("se puede navegar entre los módulos", async ({ page }) => {
    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos");

    // La barra lateral no cabe: la navegación vive arriba en horizontal.
    for (const modulo of ["Pedidos", "Inventario", "Marcas", "Tasa"]) {
      await expect(page.getByRole("link", { name: modulo, exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: "Marcas", exact: true }).click();
    await page.waitForURL("**/admin/marcas");
    await expect(page.getByRole("heading", { name: "Marcas", level: 1 })).toBeVisible();
  });
});
