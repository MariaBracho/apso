import { expect, test } from "@playwright/test";

import { borrarPedido, db, productoPorSlug, recargoActual } from "./soporte/datos";
import { agregarAlCarrito } from "./soporte/tienda";

const SLUG = "corsair-vengeance-32gb-ddr5-6000";

/** Envía el pedido y devuelve el número que quedó registrado. */
async function enviarPedido(
  page: import("@playwright/test").Page,
  metodoPago: string,
): Promise<string> {
  await page.goto("/pedido");

  await page.getByLabel("Tu nombre").fill("Prueba Automática");
  await page.getByLabel("Tu WhatsApp").fill("4141112233");
  // Se pulsa la etiqueta y no el radio: el input va oculto y es el label el
  // que recibe el clic, igual que cuando lo toca una persona.
  await page
    .locator("label")
    .filter({ hasText: new RegExp(`^${metodoPago}$`) })
    .click();
  await expect(page.getByRole("radio", { name: metodoPago, exact: true })).toBeChecked();

  await page.getByRole("button", { name: "Enviar mi pedido" }).click();
  await page.waitForURL("**/pedido/confirmado");

  const titulo = await page.getByRole("heading", { level: 1 }).textContent();
  const numero = titulo?.match(/A-\d+/)?.[0];
  expect(numero, "la confirmación debe mostrar el número del pedido").toBeTruthy();
  return numero!;
}

test.describe("Pedido", () => {
  /**
   * La regla de negocio más cara de romper: quien paga en bolívares paga el
   * precio con recargo, quien paga en dólares el de divisas. Se decide en el
   * servidor, así que se comprueba contra lo que quedó guardado y no contra lo
   * que se vio en pantalla.
   */
  test("pagando en bolívares se cobra el precio con recargo", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const recargo = await recargoActual();
    const esperado = Math.round(producto.precio_usd * (1 + recargo / 100) * 100) / 100;

    await agregarAlCarrito(page, SLUG);
    const numero = await enviarPedido(page, "Pago Móvil");

    try {
      const { data } = await db
        .from("pedidos")
        .select("metodo_pago, subtotal_usd, items:pedido_items (precio_usd_unitario)")
        .eq("numero", numero)
        .single();

      expect(data!.metodo_pago).toBe("pago_movil");
      expect(Number(data!.subtotal_usd)).toBeCloseTo(esperado, 2);
      // Las líneas tienen que cuadrar con el total, no llevar otro precio.
      expect(Number((data!.items as { precio_usd_unitario: number }[])[0].precio_usd_unitario))
        .toBeCloseTo(esperado, 2);
    } finally {
      await borrarPedido(numero);
    }
  });

  test("pagando en dólares se cobra el precio en divisas", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);

    await agregarAlCarrito(page, SLUG);
    const numero = await enviarPedido(page, "Zelle");

    try {
      const { data } = await db
        .from("pedidos")
        .select("metodo_pago, subtotal_usd")
        .eq("numero", numero)
        .single();

      expect(data!.metodo_pago).toBe("zelle");
      expect(Number(data!.subtotal_usd)).toBeCloseTo(producto.precio_usd, 2);
    } finally {
      await borrarPedido(numero);
    }
  });

  test("la confirmación deja el mensaje listo y vacía el carrito", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);

    await agregarAlCarrito(page, SLUG);
    const numero = await enviarPedido(page, "Pago Móvil");

    try {
      await expect(page.getByText(`Hola, soy Prueba Automática`)).toBeVisible();
      await expect(page.getByText(producto.nombre)).toBeVisible();

      // El botón nombra la acción, no la app que abre.
      const boton = page.getByRole("link", { name: "Envía tu pedido por WhatsApp" });
      await expect(boton).toBeVisible();
      await expect(boton).toHaveAttribute("href", /wa\.me\/584246056110/);

      // Y el carrito quedó vacío: el pedido ya se registró.
      await page.goto("/carrito");
      await expect(page.getByRole("heading", { name: "Todavía no hay nada" })).toBeVisible();
    } finally {
      await borrarPedido(numero);
    }
  });
});
