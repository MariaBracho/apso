import { expect, test } from "@playwright/test";

import {
  ajustarAjustes,
  borrarPedido,
  db,
  productoPorSlug,
  recargoActual,
  tasaVigente,
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
      // Con costo aparece de dónde salió la plata: la compra sale de la caja.
      await page
        .getByLabel(new RegExp(`con qué se pagó la compra de ${producto.nombre}`, "i"))
        .selectOption("efectivo");
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
    // Sin costo no hay margen que mostrar. En vez de un número inventado se
    // ofrece cargarlo, que es lo accionable.
    await expect(fila.getByRole("button", { name: "Poner costo" })).toBeVisible();

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

      // Y se ve en el módulo, con lo vendido al lado y el botón de liquidar.
      await page.goto("/admin/vendedores");
      await expect(page.getByRole("heading", { name: "Vendedores" })).toBeVisible();
      await expect(page.getByText(numero)).toBeVisible();
      await expect(page.getByText(/vendidos en \d+ pedidos?/)).toBeVisible();
      await expect(page.getByText(/de margen/)).toBeVisible();
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
      await page.goto("/admin/vendedores");
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

test.describe("Quién atiende el pedido", () => {
  /**
   * Se puede corregir, y la comisión va detrás.
   *
   * `atendido_por` se pone solo con quien mueve el estado, y eso no siempre es
   * quien vendió: alguien vende y otro despacha. Sin poder cambiarlo, la
   * comisión se le paga al equivocado.
   */
  test("cambiar de vendedor mueve la comisión, salvo si ya se pagó", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    // Hace falta un segundo vendedor: con uno solo no hay nada que elegir.
    const { data: otro } = await db
      .from("perfiles")
      .select("id, nombre, roles")
      .neq("correo", "admin@apso.com.ve")
      .limit(1)
      .single();
    // Solo vendedor, sin el panel: es justo el caso que el rol separado hace
    // posible y que con una única columna no cabía.
    await db
      .from("perfiles")
      .update({ roles: ["cliente", "vendedor"] })
      .eq("id", otro!.id);

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

    const { data: pedido } = await db.from("pedidos").select("id").eq("numero", numero).single();

    try {
      // Nace con quien lo registró, y la comisión también.
      const selector = page.getByLabel("Quién atiende este pedido");
      await expect(selector).toBeVisible();

      await selector.selectOption(otro!.id);
      await expect(page.getByText("La comisión de este pedido va con él.")).toBeVisible();

      const { data: movida } = await db
        .from("comisiones")
        .select("perfil_id")
        .eq("pedido_id", pedido!.id)
        .single();
      expect(movida!.perfil_id).toBe(otro!.id);

      // Una vez pagada ya no se mueve: ese dinero salió, y cambiarla de dueño
      // descuadraría la liquidación de ese mes.
      await db
        .from("comisiones")
        .update({ pagada_en: new Date().toISOString(), pagada_por: otro!.id })
        .eq("pedido_id", pedido!.id);

      await page.reload();
      const { data: admin } = await db
        .from("perfiles").select("id").eq("correo", "admin@apso.com.ve").single();
      await page.getByLabel("Quién atiende este pedido").selectOption(admin!.id);
      await expect(
        page.getByText("La comisión ya estaba pagada, así que se queda con quien la cobró."),
      ).toBeVisible();

      const { data: quieta } = await db
        .from("comisiones").select("perfil_id").eq("pedido_id", pedido!.id).single();
      expect(quieta!.perfil_id).toBe(otro!.id);

      // El pedido sí cambió de manos, que es un hecho aparte de la comisión.
      const { data: reasignado } = await db
        .from("pedidos").select("atendido_por").eq("id", pedido!.id).single();
      expect(reasignado!.atendido_por).toBe(admin!.id);
    } finally {
      await db.from("comisiones").delete().eq("pedido_id", pedido!.id);
      await borrarPedido(numero);
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
      await db.from("perfiles").update({ roles: otro!.roles }).eq("id", otro!.id);
    }
  });
});

test.describe("Mis ventas y comisiones", () => {
  /**
   * La vista de quien cobra, no la de quien paga.
   *
   * «Comisiones» agrupa por persona y sirve para liquidar; esta muestra solo
   * lo propio. Sin ese corte, ver lo que gana otro es mirar la pantalla de al
   * lado.
   */
  test("muestra las ventas propias con su comisión, y no las ajenas", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await db.rpc("mover_inventario", {
      p_producto: producto.id, p_cantidad: 3, p_motivo: "entrada", p_costo: 60,
    });

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Zoraida Perdomo");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4145558899");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];
    const { data: pedido } = await db.from("pedidos").select("id").eq("numero", numero).single();

    try {
      await page.goto("/admin/mis-ventas");
      await expect(page.getByRole("heading", { name: "Mis ventas y comisiones" })).toBeVisible();
      await expect(page.getByText(numero)).toBeVisible();
      await expect(page.getByText("por cobrar").first()).toBeVisible();

      // El monto también en bolívares, y con la tasa pelada: el recargo del
      // catálogo cubre reponer inventario, y una comisión no repone nada.
      const tasa = await tasaVigente();

      const margen = producto.precio_usd - 60;
      const { data: ajustes } = await db.from("ajustes").select("comision_venta_pct").single();
      const esperada = Math.round(margen * (Number(ajustes!.comision_venta_pct) / 100) * 100) / 100;
      await expect(
        page.getByText(`$${esperada.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`).first(),
      ).toBeVisible();

      const enBolivares = Math.round(esperada * tasa).toLocaleString("es-VE", { maximumFractionDigits: 0 });
      await expect(page.getByText(`Bs ${enBolivares}`).first()).toBeVisible();

      // Reasignado a otra persona, deja de ser una venta propia.
      const { data: otro } = await db
        .from("perfiles").select("id, roles").neq("correo", "admin@apso.com.ve").limit(1).single();
      await db.from("perfiles").update({ roles: ["cliente", "vendedor"] }).eq("id", otro!.id);

      try {
        await db.from("pedidos").update({ atendido_por: otro!.id }).eq("id", pedido!.id);
        await db.from("comisiones").update({ perfil_id: otro!.id }).eq("pedido_id", pedido!.id);

        // Se comprueba que ese pedido desapareció, no que la lista quedó
        // vacía: la cuenta puede tener otras ventas de antes.
        await page.goto("/admin/mis-ventas");
        await expect(page.getByText(numero)).toHaveCount(0);
      } finally {
        await db.from("perfiles").update({ roles: otro!.roles }).eq("id", otro!.id);
      }
    } finally {
      await db.from("comisiones").delete().eq("pedido_id", pedido!.id);
      await borrarPedido(numero);
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});

test.describe("Costo del stock que ya está", () => {
  /**
   * Lo que ya estaba en el estante no tenía dónde declarar su costo: el «+»
   * es para mercancía que llega, y usarlo duplicaría las existencias. Sin esto
   * no hay margen ni comisión sobre nada de lo que hay hoy.
   */
  test("«Poner costo» declara sin mover el stock, y corregirlo reemplaza", async ({ page }) => {
    const producto = await productoPorSlug("crucial-p3-plus-1tb");
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/productos");

    const fila = page.getByRole("row", { name: new RegExp(producto.nombre, "i") });
    await fila.getByRole("button", { name: "Poner costo" }).click();
    await page
      .getByLabel(new RegExp(`cuánto costó cada unidad de ${producto.nombre}`, "i"))
      .fill("38");
    await page.keyboard.press("Enter");

    try {
      await expect(page.getByText(/costo \$38/)).toBeVisible();

      // El stock no se movió: no llegó mercancía, solo se dijo qué costó.
      const { data } = await db
        .from("productos").select("stock").eq("id", producto.id).single();
      expect(data!.stock).toBe(antes);

      const { data: costo } = await db
        .from("costos_producto")
        .select("costo_promedio_usd, unidades_con_costo")
        .eq("producto_id", producto.id)
        .single();
      expect(Number(costo!.costo_promedio_usd)).toBeCloseTo(38, 2);
      expect(costo!.unidades_con_costo).toBe(antes);

      // Y ya hay margen, con su comisión.
      await page.reload();
      const margen = producto.precio_usd - 38;
      await expect(fila).toContainText(
        `${Math.round((margen / producto.precio_usd) * 100)} %`,
      );

      // Ya no ofrece cargarlo: ahora se corrige desde la ficha del producto.
      await expect(fila.getByRole("button", { name: "Poner costo" })).toHaveCount(0);

      // Corregirlo reemplaza la declaración en vez de sumar otra: si sumara,
      // las mismas unidades entrarían dos veces y el promedio se arrastraría
      // hacia el último número escrito.
      const { error } = await db.rpc("declarar_costo_inicial", {
        p_producto: producto.id, p_costo: 99,
      });
      expect(error).toBeNull();

      const { data: promedio } = await db
        .from("costos_producto")
        .select("costo_promedio_usd, unidades_con_costo")
        .eq("producto_id", producto.id)
        .single();
      // 99, no el promedio de 38 y 99.
      expect(Number(promedio!.costo_promedio_usd)).toBeCloseTo(99, 2);
      expect(promedio!.unidades_con_costo).toBe(antes);
    } finally {
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});

test.describe("Caja", () => {
  /**
   * Lo que responde «cuánto hay en caja».
   *
   * El monto se escribe en la moneda del método y el servidor lo lleva a
   * dólares: un Pago Móvil de Bs 82.000 son 100 dólares, no 82.000. Guardarlo
   * sin convertir metería una fortuna en la caja.
   */
  test("un pago en bolívares entra convertido, y el saldo va por método", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;
    const tasa = await tasaVigente();

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Cómo pagó").selectOption("pago_movil");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Cliente de prueba");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];
    const { data: pedido } = await db.from("pedidos").select("id, total_usd").eq("numero", numero).single();

    try {
      // Antes de cobrar, el pedido dice cuánto falta.
      await expect(page.getByText(/Faltan \$/)).toBeVisible();

      const enBolivares = Math.round(Number(pedido!.total_usd) * tasa);
      await page.getByRole("button", { name: "Registrar pago" }).click();
      await page.getByLabel("Cómo pagó").last().selectOption("pago_movil");
      await page.getByLabel(/Monto en bolívares/).fill(String(enBolivares));
      await page.getByLabel(/^Referencia/).fill("001122334455");
      await page.getByRole("button", { name: "Guardar pago" }).click();
      await expect(page.getByText("Pago registrado")).toBeVisible();

      // Se guardó en dólares, no en bolívares.
      const { data: pago } = await db
        .from("pagos")
        .select("monto_usd, metodo, tasa_cambio, estado")
        .eq("pedido_id", pedido!.id)
        .single();
      expect(Number(pago!.monto_usd)).toBeCloseTo(Number(pedido!.total_usd), 1);
      expect(Number(pago!.tasa_cambio)).toBeCloseTo(tasa, 2);
      expect(pago!.estado).toBe("verificado");

      await expect(page.getByText("Cobrado completo")).toBeVisible();

      // Y sale en la caja, atribuido a su método.
      await page.goto("/admin/caja");
      await expect(page.getByRole("heading", { name: "Caja" })).toBeVisible();
      const fila = page.getByRole("listitem").filter({ hasText: "Pago Móvil" });
      await expect(fila).toContainText(
        `$${Number(pago!.monto_usd).toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      );
    } finally {
      await db.from("pagos").delete().eq("pedido_id", pedido!.id);
      await db.from("comisiones").delete().eq("pedido_id", pedido!.id);
      await borrarPedido(numero);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });

  /**
   * Un gasto en bolívares también se convierte, y resta del neto: sin gastos
   * el margen se lee como si fuera lo que quedó.
   */
  test("un gasto resta de la caja y se puede borrar", async ({ page }) => {
    const tasa = await tasaVigente();

    await entrarComoAdmin(page);
    await page.goto("/admin/caja");

    await page.getByLabel("Categoría del gasto").selectOption("aduana");
    await page.getByLabel(/En qué se gastó/).fill("Aduana del lote de prueba");
    await page.getByLabel("De dónde salió la plata").selectOption("transferencia_bs");
    await page.getByLabel(/Monto en bolívares/).fill(String(Math.round(50 * tasa)));
    await page.getByRole("button", { name: "Anotar gasto" }).click();
    await expect(page.getByText("Gasto anotado")).toBeVisible();

    try {
      const { data } = await db
        .from("gastos")
        .select("id, monto_usd, categoria, metodo")
        .eq("descripcion", "Aduana del lote de prueba")
        .single();

      expect(Number(data!.monto_usd)).toBeCloseTo(50, 1);
      expect(data!.categoria).toBe("aduana");

      await expect(page.getByText("Aduana del lote de prueba")).toBeVisible();
      await expect(page.getByText(/en gastos/)).toBeVisible();

      // Un gasto mal anotado descuadra la caja, así que se quita.
      await page
        .getByRole("button", { name: /borrar el gasto «Aduana del lote de prueba»/i })
        .click();
      await expect(page.getByText(/fuera de la caja/)).toBeVisible();

      const { data: despues } = await db
        .from("gastos")
        .select("id")
        .eq("descripcion", "Aduana del lote de prueba");
      expect(despues).toHaveLength(0);
    } finally {
      await db.from("gastos").delete().eq("descripcion", "Aduana del lote de prueba");
    }
  });
});

test.describe("La caja cuadra", () => {
  /**
   * Comprar mercancía saca plata de la caja pero no es un gasto: es efectivo
   * convertido en inventario, y se vuelve costo al venderse. Anotarlo como
   * gasto restaría ese costo dos veces —una en el margen y otra aquí— y la
   * ganancia saldría negativa siempre.
   */
  test("la compra de mercancía sale de la caja, aparte de los gastos", async ({ page }) => {
    const producto = await productoPorSlug("crucial-p3-plus-1tb");
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/productos");

    const fila = page.getByRole("row", { name: new RegExp(producto.nombre, "i") });
    await fila.getByRole("button", { name: new RegExp(`sumar unidades.*${producto.nombre}`, "i") }).click();
    await page.getByLabel(new RegExp(`cuántas unidades entraron de ${producto.nombre}`, "i")).fill("4");
    await page.getByLabel(new RegExp(`cuánto costó cada unidad de ${producto.nombre}`, "i")).fill("38");
    await page.getByLabel(new RegExp(`con qué se pagó la compra de ${producto.nombre}`, "i")).selectOption("zelle");
    await page.keyboard.press("Enter");
    await expect(page.getByText(/salieron de Zelle/)).toBeVisible();

    try {
      // 4 × 38 = 152 fuera de Zelle.
      await page.goto("/admin/caja");
      await expect(page.getByText("$152 en mercancía")).toBeVisible();

      const zelle = page.getByRole("listitem").filter({ hasText: "Zelle" });
      await expect(zelle).toContainText("$-152");

      // Y no aparece como gasto: son cosas distintas.
      await expect(page.getByText("$0 en gastos")).toBeVisible();
    } finally {
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });

  /**
   * Un pedido cobrado y luego devuelto no está cobrado. Antes el stock volvía
   * y la comisión se borraba, pero el dinero seguía contado como ingreso y no
   * había forma de arreglarlo desde el panel.
   */
  test("un reembolso descuenta lo cobrado y sale de la caja", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Cliente devuelto");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];
    const { data: pedido } = await db.from("pedidos").select("id, total_usd").eq("numero", numero).single();
    const total = Number(pedido!.total_usd);

    try {
      // Se cobra completo.
      await page.getByRole("button", { name: "Registrar pago" }).click();
      await page.getByLabel(/Monto en dólares/).fill(String(total));
      await page.getByLabel(/^Referencia/).fill("REF-COBRO-1");
      await page.getByRole("button", { name: "Guardar pago" }).click();
      await expect(page.getByText("Cobrado completo")).toBeVisible();

      // Y se devuelve la mitad.
      const mitad = Math.round((total / 2) * 100) / 100;
      await page.getByRole("button", { name: "Devolver" }).click();
      await expect(page.getByText("Devolviendo dinero al cliente")).toBeVisible();
      await page.getByLabel(/Monto en dólares/).fill(String(mitad));
      await page.getByLabel(/^Referencia/).fill("REF-DEVUELTA-1");
      await page.getByRole("button", { name: "Guardar pago" }).click();
      await expect(page.getByText("Reembolso registrado")).toBeVisible();

      // Lo cobrado baja: no está cobrado lo que se devolvió.
      await expect(page.getByText(new RegExp(`Faltan \\$${mitad}`.replace(".", "\\.")))).toBeVisible();

      const { data: filas } = await db
        .from("pagos")
        .select("tipo, monto_usd")
        .eq("pedido_id", pedido!.id)
        .order("creado_en");
      expect(filas!.map((f) => f.tipo)).toEqual(["cobro", "reembolso"]);
      // El reembolso se guarda en positivo: el signo lo pone quien suma.
      expect(Number(filas![1].monto_usd)).toBeGreaterThan(0);

      // En la caja el neto es lo cobrado menos lo devuelto.
      await page.goto("/admin/caja");
      const efectivo = page.getByRole("listitem").filter({ hasText: "Efectivo" });
      await expect(efectivo).toContainText(
        `$${mitad.toLocaleString("es-VE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
      );
    } finally {
      await db.from("pagos").delete().eq("pedido_id", pedido!.id);
      await db.from("comisiones").delete().eq("pedido_id", pedido!.id);
      await borrarPedido(numero);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});

test.describe("Costo desde la ficha del producto", () => {
  /**
   * Un costo mal tecleado quedaba grabado para siempre: la base se negaba a
   * declararlo dos veces para que las mismas unidades no entraran otra vez al
   * promedio. La intención era buena y el efecto malo.
   */
  test("se escribe y se corrige desde el formulario del producto", async ({ page }) => {
    const producto = await productoPorSlug("crucial-p3-plus-1tb");

    await entrarComoAdmin(page);
    await page.goto(`/admin/productos/${producto.id}`);

    const campo = page.getByLabel(/Costo de compra/);
    await expect(campo).toHaveValue("");

    // Se escribe mal a propósito.
    await campo.fill("380");
    // El margen sale mientras se teclea: a este precio, eso es pérdida.
    await expect(page.getByText(/Pierdes/)).toBeVisible();

    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await page.waitForURL(/\/admin\/productos$/);

    try {
      let { data } = await db
        .from("costos_producto")
        .select("costo_promedio_usd")
        .eq("producto_id", producto.id)
        .single();
      expect(Number(data!.costo_promedio_usd)).toBeCloseTo(380, 2);

      // Y se corrige: la ficha lo trae y lo reemplaza, no lo suma.
      await page.goto(`/admin/productos/${producto.id}`);
      await expect(page.getByLabel(/Costo de compra/)).toHaveValue("380");

      await page.getByLabel(/Costo de compra/).fill("38");
      await expect(page.getByText(/Margen/)).toBeVisible();
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await page.waitForURL(/\/admin\/productos$/);

      ({ data } = await db
        .from("costos_producto")
        .select("costo_promedio_usd")
        .eq("producto_id", producto.id)
        .single());
      // 38, no el promedio de 380 y 38: es una corrección, no un lote nuevo.
      expect(Number(data!.costo_promedio_usd)).toBeCloseTo(38, 2);

      const { data: movimientos } = await db
        .from("movimientos_inventario")
        .select("id")
        .eq("producto_id", producto.id)
        .eq("motivo", "inventario_inicial");
      expect(movimientos).toHaveLength(1);
    } finally {
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: producto.stock }).eq("id", producto.id);
    }
  });
});

test.describe("Pedidos sin vendedor", () => {
  /**
   * «Nadie» es una respuesta y no la ausencia de una: hay ventas que hizo el
   * sitio sin que nadie vendiera nada, y atribuírselas a quien las despachó le
   * pagaría comisión por un trabajo que no hizo.
   */
  test("dejar un pedido sin vendedor le quita la comisión", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await db.rpc("declarar_costo_inicial", { p_producto: producto.id, p_costo: 60 });

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Venta del sitio");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];
    const { data: pedido } = await db.from("pedidos").select("id").eq("numero", numero).single();

    try {
      // Nace con comisión, porque lo registró alguien.
      const { data: nacida } = await db
        .from("comisiones").select("id").eq("pedido_id", pedido!.id).maybeSingle();
      expect(nacida).not.toBeNull();

      await page.getByLabel("Quién atiende este pedido").selectOption("");
      await expect(page.getByText("Este pedido queda sin vendedor")).toBeVisible();
      await expect(page.getByText("No paga comisión: la venta la hizo el sitio.")).toBeVisible();

      const { data: pedidoSinVendedor } = await db
        .from("pedidos").select("atendido_por").eq("id", pedido!.id).single();
      expect(pedidoSinVendedor!.atendido_por).toBeNull();

      const { data: comision } = await db
        .from("comisiones").select("id").eq("pedido_id", pedido!.id).maybeSingle();
      expect(comision).toBeNull();

      await page.reload();
      await expect(page.getByText("Sin vendedor: este pedido no paga comisión.")).toBeVisible();
    } finally {
      await db.from("comisiones").delete().eq("pedido_id", pedido!.id);
      await borrarPedido(numero);
      await db.from("movimientos_inventario").delete().eq("producto_id", producto.id);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });

  /**
   * Quien lo toca primero lo reclama, y después no se lo quita nadie. Antes se
   * reescribía en cada cambio de estado: quien marcaba «entregado» un pedido
   * que vendió otro se llevaba la atribución, y con ella la comisión.
   */
  test("mover el estado no le roba el pedido a quien lo vendió", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    const { data: otro } = await db
      .from("perfiles").select("id, roles").neq("correo", "admin@apso.com.ve").limit(1).single();
    await db.from("perfiles").update({ roles: ["cliente", "vendedor"] }).eq("id", otro!.id);

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre", { exact: true }).fill("Cliente de prueba");
    await page.getByRole("textbox", { name: /WhatsApp/ }).fill("4141112233");
    // Sin marcar como entregado: se mueve el estado después, a mano.
    await page.getByRole("checkbox", { name: /ya está pagado y entregado/i }).uncheck();
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];
    const { data: pedido } = await db.from("pedidos").select("id").eq("numero", numero).single();

    try {
      // Se le pasa al otro vendedor. Se espera a que el selector muestre el
      // valor nuevo: es la señal de que el servidor respondió y la página se
      // volvió a pintar. Clicar antes cae sobre un render a medias.
      const selector = page.getByLabel("Quién atiende este pedido");
      await selector.selectOption(otro!.id);
      // El aviso también queda en el historial del pedido, así que se busca en
      // la región de notificaciones y no en toda la página.
      await expect(
        page.getByRole("region", { name: /notification/i }).getByText(/Pasa a atenderlo/),
      ).toBeVisible();
      await expect(selector).toHaveValue(otro!.id);

      // Y el admin lo marca como pagado: el pedido sigue siendo del otro.
      await page.getByRole("button", { name: "Confirmado y pagado" }).click();
      await expect(page.getByText(/Pedido en «Confirmado y pagado»/)).toBeVisible();

      const { data: despues } = await db
        .from("pedidos").select("atendido_por").eq("id", pedido!.id).single();
      expect(despues!.atendido_por).toBe(otro!.id);

      // Y la comisión nació a nombre suyo, no de quien movió el estado.
      const { data: comision } = await db
        .from("comisiones").select("perfil_id").eq("pedido_id", pedido!.id).single();
      expect(comision!.perfil_id).toBe(otro!.id);
    } finally {
      await db.from("comisiones").delete().eq("pedido_id", pedido!.id);
      await borrarPedido(numero);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
      await db.from("perfiles").update({ roles: otro!.roles }).eq("id", otro!.id);
    }
  });
});

test.describe("Cambio de divisas", () => {
  /**
   * El caso que lo motivó: un hub cobrado en bolívares por el equivalente a
   * $9,52 a tasa BCV, que al cambiarlo en Binance dejó $7,56. Esos $1,96 no
   * aparecían en ningún lado — la caja seguía diciendo que había 9,52.
   */
  test("mueve la plata de un método a otro y deja ver lo que se pierde", async ({ page }) => {
    const tasa = await tasaVigente();

    await entrarComoAdmin(page);
    await page.goto("/admin/caja");

    const enBolivares = Math.round(9.52 * tasa);
    await page.getByLabel("De dónde salió el cambio").selectOption("pago_movil");
    await page.getByLabel(/Cuánto salió/).fill(String(enBolivares));
    await page.getByLabel("A dónde entró el cambio").selectOption("binance");
    await page.getByLabel(/Cuánto llegó/).fill("7.56");

    // La cuenta sale antes de guardar, que es donde sirve.
    await expect(page.getByText(/Se pierden/)).toBeVisible();
    await expect(page.getByText(/por dólar, contra/)).toBeVisible();

    await page.getByRole("button", { name: "Registrar cambio" }).click();
    await expect(page.getByText("Cambio registrado")).toBeVisible();

    try {
      const { data } = await db
        .from("conversiones")
        .select("metodo_origen, monto_origen_usd, metodo_destino, monto_destino_usd")
        .order("creado_en", { ascending: false })
        .limit(1)
        .single();

      expect(data!.metodo_origen).toBe("pago_movil");
      expect(data!.metodo_destino).toBe("binance");
      expect(Number(data!.monto_origen_usd)).toBeCloseTo(9.52, 1);
      expect(Number(data!.monto_destino_usd)).toBeCloseTo(7.56, 2);

      // Los saldos se mueven en las dos puntas, y el neto baja la diferencia.
      await page.reload();
      // El primero de cada uno es el de saldos; el otro es la fila del cambio.
      const pagoMovil = page.getByRole("listitem").filter({ hasText: "Pago Móvil" }).first();
      const binance = page.getByRole("listitem").filter({ hasText: "Binance" }).first();
      await expect(pagoMovil).toContainText("$-9,52");
      await expect(binance).toContainText("$7,56");
      await expect(page.getByText(/perdidos al cambiar/)).toBeVisible();
    } finally {
      await db.from("conversiones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }
  });
});

test.describe("Quién compró, en una venta de mostrador", () => {
  /**
   * El nombre se escribía a mano cada vez, así que el mismo cliente terminaba
   * como tres personas distintas para la base y ninguna con su historial
   * completo.
   */
  test("busca un cliente que ya existe y rellena sus datos", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;
    const { data: cliente } = await db
      .from("perfiles").select("nombre, correo, whatsapp")
      .eq("correo", "admin@apso.com.ve").single();

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);

    // Se busca por correo, que es la otra forma de acordarse de alguien.
    await page.getByLabel("Nombre del cliente").fill("admin@apso");
    await page.getByRole("button", { name: new RegExp(cliente!.nombre, "i") }).click();

    await expect(page.getByLabel("Nombre del cliente")).toHaveValue(cliente!.nombre);
    await expect(page.getByLabel(/Correo/)).toHaveValue(cliente!.correo);
    await expect(page.getByRole("textbox", { name: /WhatsApp/ })).toHaveValue(
      cliente!.whatsapp!.replace("+58", ""),
    );

    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];

    try {
      const { data } = await db
        .from("pedidos").select("cliente_nombre, cliente_correo").eq("numero", numero).single();
      expect(data!.cliente_nombre).toBe(cliente!.nombre);
      expect(data!.cliente_correo).toBe(cliente!.correo);
    } finally {
      const { data: p } = await db.from("pedidos").select("id").eq("numero", numero).single();
      await db.from("comisiones").delete().eq("pedido_id", p!.id);
      await borrarPedido(numero);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });

  /**
   * Alguien compra un cable en efectivo y se va. Exigir el número obligaría a
   * inventarlo, y un número falso en la base se ve igual que uno verdadero.
   */
  test("se registra sin WhatsApp, y el panel no ofrece escribirle", async ({ page }) => {
    const producto = await productoPorSlug(SLUG);
    const antes = producto.stock;

    await entrarComoAdmin(page);
    await page.goto("/admin/pedidos/nuevo");
    await page.getByLabel("Agregar producto").selectOption(producto.id);
    await page.getByLabel("Nombre del cliente").fill("Cliente de paso");
    await page.getByRole("button", { name: "Registrar la venta" }).click();
    await page.waitForURL(/\/admin\/pedidos\/[0-9a-f-]{36}/);
    const numero = (await page.getByRole("heading", { level: 1 }).textContent())!.match(/A-\d+/)![0];

    try {
      const { data } = await db
        .from("pedidos").select("id, cliente_whatsapp").eq("numero", numero).single();
      expect(data!.cliente_whatsapp).toBeNull();

      await expect(page.getByText("Sin número")).toBeVisible();
      // Sin número no hay a quién escribirle: el botón no está.
      await expect(page.getByRole("link", { name: /escribir al cliente/i })).toHaveCount(0);
    } finally {
      const { data: p } = await db.from("pedidos").select("id").eq("numero", numero).single();
      await db.from("comisiones").delete().eq("pedido_id", p!.id);
      await borrarPedido(numero);
      await db.from("productos").update({ stock: antes }).eq("id", producto.id);
    }
  });
});
