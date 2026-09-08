import { expect, test } from "@playwright/test";

import {
  borrarPedido,
  db,
  productoPorSlug,
  recargoActual,
  vaciarCarritoDe,
} from "./soporte/datos";
import { entrarComoAdmin } from "./soporte/sesion";
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

test.describe("Pedido con cuenta", () => {
  /**
   * Quien tiene sesión no vuelve a escribir su contacto.
   *
   * El nombre y el correo los puso Google y el número está en el perfil, así
   * que el formulario no los pide y el servidor los lee de ahí. Se comprueba
   * contra lo que quedó guardado: es lo que decide a quién se le escribe.
   */
  test("no pide el contacto y lo toma del perfil", async ({ page }) => {
    await entrarComoAdmin(page);

    const { data: perfil } = await db
      .from("perfiles")
      .select("nombre, correo, whatsapp")
      .eq("correo", "admin@apso.com.ve")
      .single();

    await agregarAlCarrito(page, SLUG);
    await page.goto("/pedido");

    // Ni un campo de contacto en pantalla: se muestran hechos.
    await expect(page.getByLabel("Tu nombre")).toHaveCount(0);
    await expect(page.getByLabel("Tu WhatsApp")).toHaveCount(0);
    await expect(page.getByText(perfil!.nombre)).toBeVisible();
    await expect(page.getByText(perfil!.whatsapp!)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /cambiar el número en mi perfil/i }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Enviar mi pedido" }).click();
    await page.waitForURL("**/pedido/confirmado");

    const titulo = await page.getByRole("heading", { level: 1 }).textContent();
    const numero = titulo!.match(/A-\d+/)![0];

    try {
      const { data } = await db
        .from("pedidos")
        .select("cliente_nombre, cliente_whatsapp, cliente_correo, perfil_id")
        .eq("numero", numero)
        .single();

      expect(data!.cliente_nombre).toBe(perfil!.nombre);
      expect(data!.cliente_whatsapp).toBe(perfil!.whatsapp);
      expect(data!.cliente_correo).toBe(perfil!.correo);
      // Y queda colgado de la cuenta, que es lo que lo lleva a «Mis pedidos».
      expect(data!.perfil_id).not.toBeNull();
    } finally {
      await borrarPedido(numero);
    }
  });

  test("el número se cambia desde Mi perfil y el pedido usa el nuevo", async ({ page }) => {
    await entrarComoAdmin(page);
    await page.goto("/perfil");

    // El nombre y el correo se ven, pero no se editan.
    await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
    await expect(page.getByText("admin@apso.com.ve")).toBeVisible();
    await expect(page.getByLabel(/correo/i)).toHaveCount(0);

    const original = "4246056110";
    const nuevo = "4147778899";

    await page.getByLabel("Tu WhatsApp").fill(nuevo);
    await page.getByRole("button", { name: "Guardar número" }).click();
    await expect(page.getByText("Número guardado")).toBeVisible();

    try {
      const { data } = await db
        .from("perfiles")
        .select("whatsapp")
        .eq("correo", "admin@apso.com.ve")
        .single();
      expect(data!.whatsapp).toBe(`+58${nuevo}`);

      // Y el pedido ya se anuncia con el número nuevo. Hace falta algo en el
      // carrito: sin nada que pedir, esa pantalla devuelve al carrito.
      await agregarAlCarrito(page, SLUG);
      await page.goto("/pedido");
      await expect(page.getByText(`+58${nuevo}`)).toBeVisible();
    } finally {
      await db
        .from("perfiles")
        .update({ whatsapp: `+58${original}` })
        .eq("correo", "admin@apso.com.ve");
      await vaciarCarritoDe("admin@apso.com.ve");
    }
  });
});
