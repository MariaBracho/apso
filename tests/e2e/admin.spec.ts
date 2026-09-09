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

test.describe("Ventas fuera de la web", () => {
  /**
   * Lo que se vende en el mostrador tiene que descontar inventario igual que
   * lo de la web, y quedar registrado con su movimiento. Si no, el stock del
   * panel se va separando del real y nadie se entera hasta contar las cajas.
   */
  test("registrar una venta descuenta el stock y deja el movimiento", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const otro = await productoPorSlug("crucial-p3-plus-1tb");
    const antes = producto.stock;
    const antesOtro = otro.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");

    await page.getByLabel("Entró por").selectOption("mostrador");
    await page.getByLabel("Cómo pagó").selectOption("efectivo");

    // Dos líneas: es lo normal en una venta de mostrador y es donde se rompe
    // un formulario de líneas si está mal armado.
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Agregar producto").selectOption(otro.id);
    await expect(page.getByRole("button", { name: /^quitar/i })).toHaveCount(2);

    await page.getByLabel("Nombre", { exact: true }).fill("Zoraida Perdomo");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4145558899");

    // Viene marcado: la venta de mostrador ya ocurrió.
    await expect(page.getByRole("checkbox", { name: /ya está pagado y entregado/i })).toBeChecked();

    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);

    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];

    try {
      await expect(page.getByText("Entró por")).toBeVisible();
      // Sale en el título y en la ficha de datos; con una basta.
      await expect(page.getByText("Zoraida Perdomo").first()).toBeVisible();

      const { data: pedido } = await db
        .from("pedidos")
        .select("origen, estado, metodo_pago, total_usd, inventario_descontado, confirmado_en, entregado_en")
        .eq("numero", numero)
        .single();

      expect(pedido!.origen).toBe("mostrador");
      expect(pedido!.estado).toBe("entregado");
      // En efectivo se cobra el precio en divisas, igual que en la web, y el
      // total es la suma de las líneas.
      expect(Number(pedido!.total_usd)).toBeCloseTo(
        producto.precio_usd + otro.precio_usd,
        2,
      );
      expect(pedido!.inventario_descontado).toBe(true);
      // Una venta que entra directo en «entregado» tenía que quedarse sin
      // fecha de confirmación, que es de donde salen los tiempos de atención.
      expect(pedido!.confirmado_en).not.toBeNull();
      expect(pedido!.entregado_en).not.toBeNull();

      // Y el stock bajó de verdad, con su movimiento colgado del pedido.
      const { data: despues } = await db
        .from("productos")
        .select("id, stock")
        .in("id", [producto.id, otro.id]);
      const stockDe = (id: string) =>
        despues!.find((p) => p.id === id)!.stock;
      expect(stockDe(producto.id)).toBe(antes - 1);
      expect(stockDe(otro.id)).toBe(antesOtro - 1);

      const { data: movimientos } = await db
        .from("movimientos_inventario")
        .select("cantidad, motivo")
        .eq("producto_id", producto.id)
        .order("creado_en", { ascending: false })
        .limit(1);
      expect(movimientos![0]).toMatchObject({ cantidad: -1, motivo: "venta" });
    } finally {
      await borrarPedido(numero);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
      await db.from("productos").update({ stock: antesOtro }).eq("id", otro.id);
    }
  });

  test("sin productos no se registra nada", async ({ page }) => {
    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");

    await page.getByLabel("Nombre", { exact: true }).fill("Nadie");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    await page.getByRole("button", { name: "Registrar la venta" }).click();

    // Se queda donde está y lo dice, en vez de registrar un pedido vacío.
    await expect(page.getByText("Agrega al menos un producto.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/pedidos\/nuevo/);
  });
});

test.describe("Costo de compra", () => {
  /**
   * El costo se carga al recibir la mercancía porque es el único momento en
   * que se sabe. Y se promedia ponderado: dos entradas a distinto precio no
   * dan la media simple de las dos.
   */
  test("dos entradas a distinto costo dan un promedio ponderado", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/productos");

    const fila = page.getByRole("row", { name: new RegExp(producto.nombre, "i") });

    // Cuatro a $50 y una a $100: el promedio es 60, no 75.
    for (const [unidades, costo] of [["4", "50"], ["1", "100"]] as const) {
      await fila.getByRole("button", { name: new RegExp(`sumar unidades.*${producto.nombre}`, "i") }).click();
      await page.getByLabel(new RegExp(`cuántas unidades entraron de ${producto.nombre}`, "i")).fill(unidades);
      await page.getByLabel(new RegExp(`cuánto costó cada unidad de ${producto.nombre}`, "i")).fill(costo);
      await page.keyboard.press("Enter");
      await expect(page.getByText(/entraron/)).toBeVisible();
      await page.waitForTimeout(300);
    }

    try {
      const { data } = await db
        .from("costos_producto")
        .select("costo_promedio_usd, unidades_con_costo")
        .eq("producto_id", producto.id)
        .single();

      expect(Number(data!.costo_promedio_usd)).toBeCloseTo(60, 2);
      expect(data!.unidades_con_costo).toBe(5);

      // Y el margen sale en el inventario, contra el precio en divisas, con
      // la comisión descontada al lado.
      await page.reload();
      const margen = producto.precio_usd - 60;
      const porcentaje = Math.round((margen / producto.precio_usd) * 100);
      await expect(fila).toContainText(`${porcentaje} %`);

      const { data: ajustes } = await db
        .from("ajustes")
        .select("comision_venta_pct")
        .single();
      const comision = Math.round(margen * (Number(ajustes!.comision_venta_pct) / 100) * 100) / 100;
      await expect(fila).toContainText(`comisión $${comision.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
    } finally {
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });

  test("una entrada sin costo se registra igual, y el margen dice que falta", async ({ page }) => {
    const producto = await productoPorSlug("crucial-p3-plus-1tb");
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/productos");

    const fila = page.getByRole("row", { name: new RegExp(producto.nombre, "i") });
    // Sin costo cargado no hay margen que mostrar, y se dice en vez de
    // dibujar un número inventado.
    await expect(fila).toContainText("Sin costo");

    await fila.getByRole("button", { name: new RegExp(`sumar unidades.*${producto.nombre}`, "i") }).click();
    await page.getByLabel(new RegExp(`cuántas unidades entraron de ${producto.nombre}`, "i")).fill("2");
    await page.keyboard.press("Enter");

    // Se registra igual: es preferible una entrada sin costo que una entrada
    // que no se anota por no tener el dato a mano.
    await expect(page.getByText("Sin costo cargado: no vas a poder ver el margen.")).toBeVisible();

    try {
      const { data } = await db
        .from("productos")
        .select("stock")
        .eq("id", producto.id)
        .single();
      expect(data!.stock).toBe(antes + 2);
    } finally {
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});

test.describe("Comisiones", () => {
  /**
   * Lo que de verdad importa: el monto se congela al venderse.
   *
   * El del inventario es una estimación que se mueve con cada compra de
   * mercancía. Si la comisión se recalculara con el costo de hoy, la de una
   * venta de la semana pasada cambiaría sola y ninguna liquidación cuadraría.
   */
  test("la comisión se genera al pagarse y no cambia si después sube el costo", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    // Costo conocido: 5 unidades a 50 $.
    await db.rpc("mover_inventario", {
      p_producto: producto.id, p_cantidad: 5, p_motivo: "entrada", p_costo: 50,
    });

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Cómo pagó").selectOption("efectivo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Cliente de prueba");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);

    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];

    try {
      const { data: ajustes } = await db.from("ajustes").select("comision_venta_pct").single();
      const pct = Number(ajustes!.comision_venta_pct);
      const margen = producto.precio_usd - 50;

      const { data: comision } = await db
        .from("comisiones")
        .select("monto_usd, margen_usd, porcentaje, items_sin_costo, pagada_en, pedido:pedidos (numero)")
        .eq("pedidos.numero", numero)
        .order("creado_en", { ascending: false })
        .limit(1)
        .single();

      expect(Number(comision!.margen_usd)).toBeCloseTo(margen, 2);
      expect(Number(comision!.monto_usd)).toBeCloseTo(Math.round(margen * (pct / 100) * 100) / 100, 2);
      expect(comision!.items_sin_costo).toBe(0);
      expect(comision!.pagada_en).toBeNull();

      // Entra mercancía al doble de precio: el promedio sube y la estimación
      // del inventario cambia, pero esta comisión ya está prometida.
      await db.rpc("mover_inventario", {
        p_producto: producto.id, p_cantidad: 5, p_motivo: "entrada", p_costo: 150,
      });

      const { data: despues } = await db
        .from("comisiones")
        .select("monto_usd, margen_usd")
        .eq("id", (await db.from("comisiones").select("id").order("creado_en", { ascending: false }).limit(1).single()).data!.id)
        .single();

      expect(Number(despues!.margen_usd)).toBeCloseTo(margen, 2);

      // Y se ve en el módulo, con el botón de liquidar.
      await page.goto("/admin/comisiones");
      await expect(page.getByRole("heading", { name: "Comisiones" })).toBeVisible();
      await expect(page.getByText(numero)).toBeVisible();
      await expect(page.getByRole("button", { name: /marcar como pagadas/i })).toBeVisible();
    } finally {
      await db.from("comisiones").delete().eq("pedido_id", (await db.from("pedidos").select("id").eq("numero", numero).single()).data!.id);
      await borrarPedido(numero);
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });

  test("liquidar pregunta antes y deja las comisiones como pagadas", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await db.rpc("mover_inventario", {
      p_producto: producto.id, p_cantidad: 3, p_motivo: "entrada", p_costo: 60,
    });

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Cliente de prueba");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];

    try {
      await page.goto("/admin/comisiones");
      await page.getByRole("button", { name: /marcar como pagadas/i }).click();

      // Pregunta antes: marcar como pagadas no se deshace desde el panel.
      await expect(page.getByText(/¿Le pagaste/)).toBeVisible();
      await page.getByRole("button", { name: "Sí, liquidar" }).click();
      await expect(page.getByText(/liquidados/)).toBeVisible();

      const { data } = await db
        .from("comisiones")
        .select("pagada_en, pagada_por")
        .order("creado_en", { ascending: false })
        .limit(1)
        .single();

      expect(data!.pagada_en).not.toBeNull();
      expect(data!.pagada_por).not.toBeNull();
    } finally {
      await db.from("comisiones").delete().eq("pedido_id", (await db.from("pedidos").select("id").eq("numero", numero).single()).data!.id);
      await borrarPedido(numero);
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});
