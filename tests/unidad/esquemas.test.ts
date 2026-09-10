import { describe, expect, it } from "vitest";

import {
  esquemaMarca,
  esquemaPedido,
  esquemaProducto,
  esquemaTasa,
  validar,
} from "@/lib/esquemas";

const PRODUCTO_BASE = {
  nombre: "Corsair Vengeance 32 GB",
  slug: "corsair-vengeance-32-gb",
  categoria_id: "11111111-1111-4111-8111-111111111111",
  marca_id: null,
  resumen: null,
  descripcion: null,
  especificaciones: [{ clave: "Capacidad", valor: "2 × 16 GB" }],
  precio_usd: 120,
  costo_usd: null,
  stock: 3,
  dias_encargo: null,
  condicion: "nuevo",
  procedencia: "EE. UU.",
  garantia_respalda: "fabricante",
  garantia_meses: 12,
  garantia_vitalicia: false,
  destacado: false,
  activo: true,
};

describe("esquemaProducto · especificaciones", () => {
  it("acepta una fila completa", async () => {
    const r = await validar(esquemaProducto, PRODUCTO_BASE);
    expect(r.ok).toBe(true);
  });

  it("acepta una fila del todo vacía, que es la que trae el formulario", async () => {
    const r = await validar(esquemaProducto, {
      ...PRODUCTO_BASE,
      especificaciones: [{ clave: "", valor: "" }],
    });
    expect(r.ok).toBe(true);
  });

  it("rechaza una fila a medias en vez de descartarla en silencio", async () => {
    // Antes se escribía la etiqueta, se guardaba, y la especificación no
    // aparecía en ninguna parte sin que nada lo dijera.
    const soloClave = await validar(esquemaProducto, {
      ...PRODUCTO_BASE,
      especificaciones: [{ clave: "Capacidad", valor: "" }],
    });
    expect(soloClave.ok).toBe(false);
    if (!soloClave.ok) expect(soloClave.error).toMatch(/a medias/i);

    const soloValor = await validar(esquemaProducto, {
      ...PRODUCTO_BASE,
      especificaciones: [{ clave: "", valor: "2 × 16 GB" }],
    });
    expect(soloValor.ok).toBe(false);
  });
});

describe("esquemaProducto · condición", () => {
  it("acepta las tres condiciones que existen", async () => {
    for (const condicion of ["nuevo", "reacondicionado", "usado"]) {
      const r = await validar(esquemaProducto, { ...PRODUCTO_BASE, condicion });
      expect(r.ok, `${condicion} debería valer`).toBe(true);
    }
  });

  it("rechaza una condición inventada", async () => {
    const r = await validar(esquemaProducto, { ...PRODUCTO_BASE, condicion: "roto" });
    expect(r.ok).toBe(false);
  });
});

describe("esquemaProducto · precio y dirección", () => {
  it("acepta la coma decimal, que es como se escriben los precios aquí", async () => {
    const r = await validar(esquemaProducto, { ...PRODUCTO_BASE, precio_usd: "120,50" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valores.precio_usd).toBe(120.5);
  });

  it("rechaza un precio de cero o negativo", async () => {
    for (const precio of [0, -5]) {
      const r = await validar(esquemaProducto, { ...PRODUCTO_BASE, precio_usd: precio });
      expect(r.ok, `${precio} no debería valer`).toBe(false);
    }
  });

  it("rechaza direcciones con mayúsculas o espacios", async () => {
    for (const slug of ["Corsair Vengeance", "CORSAIR", "con espacio"]) {
      const r = await validar(esquemaProducto, { ...PRODUCTO_BASE, slug });
      expect(r.ok, `${slug} no debería valer`).toBe(false);
    }
  });
});

describe("esquemaPedido · WhatsApp", () => {
  const BASE = {
    cliente_nombre: "María",
    whatsapp: "4246056110",
    cliente_correo: null,
    entrega: "punto_fijo",
    estado_destino: null,
    ciudad_destino: null,
    metodo_pago: "pago_movil",
    para_que_lo_usa: null,
  };

  it("acepta los diez dígitos sin prefijo", async () => {
    const r = await validar(esquemaPedido, BASE);
    expect(r.ok).toBe(true);
  });

  it("rechaza el número con +58 delante o con menos dígitos", async () => {
    for (const whatsapp of ["+584246056110", "04246056110", "424605611", ""]) {
      const r = await validar(esquemaPedido, { ...BASE, whatsapp });
      expect(r.ok, `${whatsapp} no debería valer`).toBe(false);
    }
  });

  it("un envío nacional exige estado y ciudad, y que la ciudad sea de ese estado", async () => {
    const envio = { ...BASE, entrega: "envio_nacional" };

    // Sin destino no se puede despachar nada.
    expect((await validar(esquemaPedido, envio)).ok).toBe(false);
    expect(
      (await validar(esquemaPedido, { ...envio, estado_destino: "Zulia" })).ok,
    ).toBe(false);

    // El par tiene que existir: las dos son reales, pero Punto Fijo no es del
    // Zulia, y una encomienda a ese destino no llega a ninguna parte.
    expect(
      (
        await validar(esquemaPedido, {
          ...envio,
          estado_destino: "Zulia",
          ciudad_destino: "Punto Fijo",
        })
      ).ok,
    ).toBe(false);

    // Y un estado que no existe tampoco pasa, aunque venga con una ciudad.
    expect(
      (
        await validar(esquemaPedido, {
          ...envio,
          estado_destino: "Vargas",
          ciudad_destino: "La Guaira",
        })
      ).ok,
    ).toBe(false);

    const bueno = await validar(esquemaPedido, {
      ...envio,
      estado_destino: "Falcón",
      ciudad_destino: "Punto Fijo",
    });
    expect(bueno.ok).toBe(true);
  });
});

describe("esquemaMarca", () => {
  it("deja la dirección vacía, que después se saca del nombre", async () => {
    const r = await validar(esquemaMarca, { nombre: "Corsair", slug: "" });
    expect(r.ok).toBe(true);
  });

  it("rechaza un nombre vacío", async () => {
    const r = await validar(esquemaMarca, { nombre: "  ", slug: "" });
    expect(r.ok).toBe(false);
  });
});

describe("esquemaTasa", () => {
  it("acepta la tasa del BCV con coma", async () => {
    const r = await validar(esquemaTasa, { valor: "807,39", fuente: "bcv" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.valores.valor).toBe(807.39);
  });

  it("rechaza una tasa fuera de rango, que casi siempre es un cero de más", async () => {
    for (const valor of [0, -1, 1_000_000]) {
      const r = await validar(esquemaTasa, { valor, fuente: "bcv" });
      expect(r.ok, `${valor} no debería valer`).toBe(false);
    }
  });
});
