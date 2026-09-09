import { expect, test } from "@playwright/test";

import {
  ajustarAjustes,
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
  });

  /**
   * El precio en divisas se anuncia solo si la tienda lo enciende.
   *
   * Es un interruptor de presentación: apagado no aparece en la tarjeta ni en
   * la ficha, pero lo que se cobra no cambia — eso lo decide el método de pago
   * y se comprueba en `pedido.spec.ts`.
   */
  test("el precio en divisas se anuncia solo cuando la tienda lo enciende", async ({ page }) => {
    const producto = await productoPorSlug("corsair-vengeance-32gb-ddr5-6000");
    const ruta = await rutaDe(producto.slug);
    const recargo = await recargoActual();

    // Sin recargo los dos precios son el mismo y no hay nada que anunciar.
    test.skip(recargo === 0, "Hace falta un recargo para que haya dos precios.");

    const restaurar = await ajustarAjustes({ mostrar_precio_divisa: false });
    try {
      await page.goto(ruta);
      await expect(page.getByText("Pagando en dólares")).toHaveCount(0);

      await page.goto("/componentes");
      await expect(page.getByText(/en divisas/i)).toHaveCount(0);

      await ajustarAjustes({ mostrar_precio_divisa: true });

      await page.goto(ruta);
      await expect(page.getByText("Pagando en dólares")).toBeVisible();
      await expect(page.locator("main")).toContainText(formatearUsd(producto.precio_usd));

      await page.goto("/componentes");
      await expect(page.getByText(/en divisas/i).first()).toBeVisible();
    } finally {
      await restaurar();
    }
  });

  /**
   * El buscador de la barra mira toda la tienda.
   *
   * Apuntaba a `/componentes` fijo, así que «lenovo» devolvía nada aunque
   * hubiera Lenovo en el catálogo: ninguna es un componente. Se comprueba
   * desde Laptops, que es donde se notó, y desde Componentes, que es donde
   * fallaba siempre.
   */
  test("el buscador encuentra en toda la tienda, no solo en la sección donde estás", async ({ page }) => {
    const lenovo = await productoPorSlug("lenovo-ideapad-slim-3-15");

    for (const desde of ["/laptops", "/componentes"]) {
      await page.goto(desde);
      await page.getByRole("searchbox").first().fill("lenovo");
      await page.getByRole("searchbox").first().press("Enter");

      await page.waitForURL(/\/buscar\?q=lenovo/);
      await expect(
        page.getByRole("heading", { name: new RegExp(lenovo.nombre, "i") }),
      ).toBeVisible();
    }
  });

  /**
   * Busca sola mientras se escribe, sin pulsar Enter.
   *
   * Y no apila una entrada de historial por cada pausa: se entra a la búsqueda
   * una vez y de ahí en adelante se reemplaza, así «atrás» devuelve a la
   * sección donde estaba y no recorre letra por letra.
   */
  test("el buscador consulta solo al dejar de escribir", async ({ page }) => {
    const lenovo = await productoPorSlug("lenovo-ideapad-slim-3-15");

    await page.goto("/laptops");
    await page.getByRole("searchbox").first().fill("lenovo");

    await page.waitForURL(/\/buscar\?q=lenovo/, { timeout: 5_000 });
    await expect(
      page.getByRole("heading", { name: new RegExp(lenovo.nombre, "i") }),
    ).toBeVisible();

    // Afinar la búsqueda no agrega historial: atrás vuelve a la sección.
    await page.getByRole("searchbox").first().fill("thinkpad");
    await page.waitForURL(/\/buscar\?q=thinkpad/, { timeout: 5_000 });

    await page.goBack();
    await expect(page).toHaveURL(/\/laptops/);
  });

  /**
   * «Todo» no es una categoría: ningún producto cuelga de ella. Es la forma de
   * ver el catálogo sin obligar a adivinar si lo que se busca es un componente
   * o una laptop, y es a donde llevan el logo y «ver la tienda».
   */
  test("«Todo» muestra el catálogo entero y filtra igual", async ({ page }) => {
    await page.goto("/componentes");
    const enComponentes = await page.locator("main h3").count();

    await page.getByRole("link", { name: "Todo", exact: true }).first().click();
    await page.waitForURL(/\/todo/);

    await expect(page.locator('header nav a[aria-current="page"]').first()).toHaveText("Todo");
    const enTodo = await page.locator("main h3").count();
    expect(enTodo).toBeGreaterThan(enComponentes);

    // Los filtros siguen funcionando sin una categoría que los acote.
    await page.getByRole("checkbox", { name: /laptops/i }).first().check();
    await page.waitForURL(/tipo=laptops/);
    await expect(page.locator("main h3").first()).toBeVisible();
    expect(await page.locator("main h3").count()).toBeLessThan(enTodo);
  });

  test("el logo lleva al catálogo entero", async ({ page }) => {
    await page.goto("/componentes");
    await page.getByRole("link", { name: /apso, ver el catálogo/i }).click();

    await page.waitForURL(/\/todo/);
    await expect(page.getByRole("heading", { name: "Todo el catálogo" })).toBeVisible();
  });

  test("una búsqueda sin resultados ofrece las dos secciones", async ({ page }) => {
    await page.goto("/buscar?q=zzzznoexiste");

    await expect(page.getByText(/No encontramos «zzzznoexiste»/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Componentes" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Laptops" }).last()).toBeVisible();
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

  /**
   * Procedencia y garantía se cargan por producto.
   *
   * La ficha decía siempre «de EE. UU.» y «del fabricante» porque ninguno de
   * los dos se podía editar. No siempre es así, y afirmarlo manda al cliente a
   * reclamarle a quien no responde.
   */
  test("la ficha dice de dónde viene y quién responde por la garantía", async ({ page }) => {
    const producto = await productoPorSlug("corsair-vengeance-32gb-ddr5-6000");
    const ruta = await rutaDe(producto.slug);

    // La de por vida se apaga a la vez: la base no deja tener las dos.
    const restaurar = await ajustarProducto(producto.id, {
      procedencia: "Venezuela",
      garantia_respalda: "apso",
      garantia_vitalicia: false,
      garantia_meses: 6,
    });

    try {
      await page.goto(ruta);
      const ficha = page.locator("main");
      await expect(ficha).toContainText("de Venezuela");
      await expect(ficha).toContainText("6 meses, de apso");
      await expect(ficha).not.toContainText("del fabricante");
    } finally {
      await restaurar();
    }

    // Y al restaurarlo vuelve a decir lo de siempre, que es lo normal.
    await page.goto(ruta);
    await expect(page.locator("main")).toContainText("de EE. UU.");
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
