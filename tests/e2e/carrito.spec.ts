import { expect, test } from "@playwright/test";

import { productoPorSlug } from "./soporte/datos";
import { agregarAlCarrito } from "./soporte/tienda";

const SLUG = "corsair-vengeance-32gb-ddr5-6000";

test.describe("Carrito", () => {
  test("agrega un producto y lo muestra con su foto y su precio", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);

    await agregarAlCarrito(page, SLUG);
    await page.goto("/carrito");

    await expect(page.getByRole("link", { name: producto.nombre })).toBeVisible();
    await expect(page.getByText("1 artículo", { exact: true })).toBeVisible();

    // Los dos precios: el de pagar en bolívares manda y el de divisas se
    // ofrece como descuento.
    await expect(page.getByText("Pagando en bolívares")).toBeVisible();
    await expect(page.getByText(/Pagando en dólares/)).toBeVisible();
  });

  test("el botón de restar se apaga en una unidad", async ({ page }) => {
    await agregarAlCarrito(page, SLUG);
    await page.goto("/carrito");

    const menos = page.getByRole("button", { name: /quitar uno de/i });
    // Bajar de uno borraba la línea entera, que es lo que hace «Quitar».
    await expect(menos).toBeDisabled();

    await page.getByRole("button", { name: /agregar uno de|sumar uno de|más/i }).first().click();
    await expect(menos).toBeEnabled();
  });

  test("vaciar el carrito pregunta antes de borrar", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);

    await agregarAlCarrito(page, SLUG);
    await page.goto("/carrito");

    await page.getByRole("button", { name: "Vaciar carrito" }).click();

    // El primer clic solo pregunta: el producto sigue ahí.
    await expect(page.getByText("¿Vaciar el carrito?")).toBeVisible();
    await expect(page.getByRole("link", { name: producto.nombre })).toBeVisible();

    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("link", { name: producto.nombre })).toBeVisible();

    await page.getByRole("button", { name: "Vaciar carrito" }).click();
    await page.getByRole("button", { name: "Sí, vaciar" }).click();

    await expect(page.getByRole("heading", { name: "Todavía no hay nada" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver catálogo" })).toBeVisible();
  });
});
