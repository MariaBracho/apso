import { expect, test } from "@playwright/test";

import {
  ajustarAjustes,
  borrarPedido,
  db,
  productoPorSlug,
  recargoActual,
  rutaDe,
} from "./soporte/datos";
import { entrarComoAdmin } from "./soporte/sesion";

const SLUG = "corsair-vengeance-32gb-ddr5-6000";

test.describe("Panel", () => {
  test("sin sesión, el panel manda a entrar", async ({ page }) => {
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/admin\/entrar/);
    await expect(page.getByLabel("Correo")).toBeVisible();
  });

  test("con sesión se llega al inventario y a la tienda", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const recargo = await recargoActual();

    await entrarComoAdmin(page);
    await page.goto("/admin/productos");

    await expect(page.getByRole("heading", { name: "Inventario", level: 1 })).toBeVisible();

    // Las dos columnas de precio, cada una nombrada: el que se carga y el que
    // ve el cliente. La cuenta entre las dos es la misma que hace la tienda.
    await expect(page.getByText("En divisas")).toBeVisible();
    await expect(page.getByText("A tasa BCV")).toBeVisible();

    const enBolivares = Math.round(producto.precio_usd * (1 + recargo / 100) * 100) / 100;
    const fila = page.getByRole("row", { name: new RegExp(producto.nombre, "i") });
    await expect(fila).toContainText(
      `$${enBolivares.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    );

    await expect(page.getByRole("link", { name: /ir a la tienda/i })).toBeVisible();
  });
});

test.describe("Inventario", () => {
  test("sumar existencias mueve el stock y queda en el historial", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/productos");

    const fila = page.getByRole("row", { name: new RegExp(producto.nombre, "i") });
    await fila.getByRole("button", { name: /sumar unidades que llegaron/i }).click();
    await fila.getByRole("textbox", { name: /cuántas unidades entraron/i }).fill("5");
    await fila.getByRole("textbox", { name: /cuántas unidades entraron/i }).press("Enter");

    try {
      // El stock sube, y el movimiento explica de dónde salió.
      await expect
        .poll(async () => (await productoPorSlug(SLUG)).stock, { timeout: 15_000 })
        .toBe(antes + 5);

      // Exactamente uno: confirmar con Enter dispara también el blur al
      // navegar, y sin protección la entrada se registraba dos veces.
      const { data } = await db
        .from("movimientos_inventario")
        .select("cantidad, motivo, stock_resultante")
        .eq("producto_id", producto.id);

      expect(data).toHaveLength(1);
      expect(data![0].cantidad).toBe(5);
      expect(data![0].motivo).toBe("entrada");
      expect(data![0].stock_resultante).toBe(antes + 5);

      // Y se ve en la ficha del producto.
      await page.goto(`/admin/productos/${producto.id}`);
      await expect(page.getByText("Historial de inventario")).toBeVisible();
      await expect(page.getByText("Entró mercancía")).toHaveCount(1);
    } finally {
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});

test.describe("Marcas", () => {
  test("crea una marca y no deja borrar las que tienen productos", async ({ page }) => {
    await entrarComoAdmin(page);
    await page.goto("/admin/marcas");

    const nombre = `Prueba ${Date.now()}`;

    await page.getByLabel("Nombre", { exact: true }).fill(nombre);
    await page.getByRole("button", { name: "Crear marca" }).click();

    try {
      // Acotado a `main`: el toast de confirmación también es un <li> y lleva
      // el mismo nombre dentro.
      const listado = page.locator("main").getByRole("listitem");
      const fila = listado.filter({ hasText: nombre });
      await expect(fila).toBeVisible();
      await expect(fila).toContainText("sin productos");

      // Recién creada no tiene productos: se puede borrar.
      await expect(fila.getByRole("button", { name: "Borrar" })).toBeEnabled();

      // Una con productos, no: la llave foránea lo impediría igual, así que se
      // dice antes en vez de dejar que falle la base.
      const conProductos = listado.filter({ hasText: /^Corsair/ });
      await expect(conProductos.getByRole("button", { name: "Borrar" })).toBeDisabled();

      await fila.getByRole("button", { name: "Borrar" }).click();
      await expect(listado.filter({ hasText: nombre })).toHaveCount(0);
    } finally {
      await db.from("marcas").delete().eq("nombre", nombre);
    }
  });
});

test.describe("Pedidos", () => {
  test("el buscador filtra por cliente, número y producto", async ({ page }) => {
    const numero = `Z-${Date.now().toString().slice(-4)}`;
    await db.from("pedidos").insert({
      numero,
      cliente_nombre: "Zoraida Perdomo",
      cliente_whatsapp: "+584145558899",
      estado: "por_confirmar",
      entrega: "punto_fijo",
      metodo_pago: "zelle",
      tasa_cambio: 790,
      subtotal_usd: 100,
      total_usd: 100,
    });

    try {
      await entrarComoAdmin(page);
      await page.goto("/admin/pedidos");

      const buscador = page.getByRole("searchbox", { name: "Buscar pedidos" });
      await expect(page.getByText("Zoraida Perdomo")).toBeVisible();

      await buscador.fill("zoraida");
      await expect(page.getByText("Zoraida Perdomo")).toBeVisible();

      // El teléfono se busca sin el prefijo, que es como se copia de WhatsApp.
      await buscador.fill("4145558899");
      await expect(page.getByText("Zoraida Perdomo")).toBeVisible();

      await buscador.fill("zzzz");
      await expect(page.getByText(/Ningún pedido coincide/)).toBeVisible();
    } finally {
      await borrarPedido(numero);
    }
  });
});

test.describe("Precios de la tienda", () => {
  /**
   * El interruptor decide si la tienda anuncia el precio pagando en dólares.
   *
   * Se comprueba de punta a punta —marcar, guardar, mirar la ficha— porque lo
   * que importa no es que la casilla quede marcada sino que el catálogo le
   * haga caso.
   */
  test("anunciar el precio en divisas se enciende desde el panel", async ({ page }) => {
    const restaurar = await ajustarAjustes({ mostrar_precio_divisa: false });
    const ruta = await rutaDe(SLUG);

    try {
      await page.goto(ruta);
      await expect(page.getByText("Pagando en dólares")).toHaveCount(0);

      await entrarComoAdmin(page);
      await page.goto("/admin/tasa");

      const interruptor = page.getByRole("checkbox", {
        name: /anunciar el precio pagando en dólares/i,
      });
      await expect(interruptor).not.toBeChecked();

      await interruptor.check();
      await page.getByRole("button", { name: /guardar precios/i }).click();
      await expect(page.getByText(/precios guardados/i)).toBeVisible();

      await page.goto(ruta);
      await expect(page.getByText("Pagando en dólares")).toBeVisible();
    } finally {
      await restaurar();
    }
  });
});
