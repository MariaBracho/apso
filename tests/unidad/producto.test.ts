import { describe, expect, it } from "vitest";

import {
  disponibilidadDe,
  fotoPrincipal,
  rutaProducto,
  textoGarantia,
} from "@/lib/producto";

describe("disponibilidadDe", () => {
  it("con existencias, en stock", () => {
    expect(disponibilidadDe({ stock: 3, dias_encargo: null })).toBe("en_stock");
    // El stock manda aunque haya plazo de encargo cargado.
    expect(disponibilidadDe({ stock: 1, dias_encargo: 10 })).toBe("en_stock");
  });

  it("sin existencias pero con plazo, por pedido", () => {
    expect(disponibilidadDe({ stock: 0, dias_encargo: 12 })).toBe("por_pedido");
  });

  it("sin existencias y sin plazo, sin stock: no se promete nada", () => {
    // El manual de marca prohíbe prometer lo que no se controla, así que sin
    // un plazo real del proveedor detrás no se dice «por pedido».
    expect(disponibilidadDe({ stock: 0, dias_encargo: null })).toBe("sin_stock");
  });
});

describe("rutaProducto", () => {
  it("arma la dirección de la ficha", () => {
    expect(rutaProducto({ slug: "corsair-32", categoria: { slug: "ram" }, imagenes: [] }))
      .toBe("/ram/corsair-32");
  });

  it("devuelve null cuando la línea perdió el producto", () => {
    // `pedido_items.producto_id` es `on delete set null`: no hay adónde
    // enlazar y la pantalla tiene que saberlo en vez de armar `/undefined/`.
    expect(rutaProducto(null)).toBeNull();
    expect(rutaProducto({ slug: "corsair-32", categoria: null, imagenes: [] })).toBeNull();
  });
});

describe("fotoPrincipal", () => {
  it("devuelve la de orden más bajo, no la primera que llegue", () => {
    // No se confía en el orden de la consulta: la principal es la que decide
    // con qué imagen se vende el producto.
    const foto = fotoPrincipal({
      slug: "x",
      categoria: { slug: "ram" },
      imagenes: [
        { url: "segunda.jpg", alt: null, orden: 1 },
        { url: "principal.jpg", alt: "La buena", orden: 0 },
        { url: "tercera.jpg", alt: null, orden: 2 },
      ],
    });

    expect(foto?.url).toBe("principal.jpg");
    expect(foto?.alt).toBe("La buena");
  });

  it("devuelve undefined cuando no hay fotos ni producto", () => {
    expect(fotoPrincipal(null)).toBeUndefined();
    expect(fotoPrincipal({ slug: "x", categoria: { slug: "ram" }, imagenes: [] }))
      .toBeUndefined();
  });
});

describe("textoGarantia", () => {
  const conRespaldo = (extra: object) => ({
    garantia_vitalicia: false,
    garantia_meses: null,
    garantia_respalda: "fabricante" as const,
    ...extra,
  });

  it("dice cuánto dura y quién responde", () => {
    expect(textoGarantia(conRespaldo({ garantia_meses: 12 }))).toBe(
      "1 año, del fabricante",
    );
    expect(
      textoGarantia(conRespaldo({ garantia_meses: 24, garantia_respalda: "apso" })),
    ).toBe("2 años, de apso");
  });

  it("los meses sueltos se dicen en meses, no en años partidos", () => {
    expect(textoGarantia(conRespaldo({ garantia_meses: 6 }))).toBe(
      "6 meses, del fabricante",
    );
    expect(textoGarantia(conRespaldo({ garantia_meses: 18 }))).toBe(
      "18 meses, del fabricante",
    );
  });

  it("la de por vida también dice de quién es", () => {
    expect(textoGarantia(conRespaldo({ garantia_vitalicia: true }))).toBe(
      "De por vida, del fabricante",
    );
    expect(
      textoGarantia(
        conRespaldo({ garantia_vitalicia: true, garantia_respalda: "apso" }),
      ),
    ).toBe("De por vida, de apso");
  });

  /**
   * Sin duración cargada no se inventa ninguna, y se manda a preguntar a quien
   * de verdad responde. Mandar al fabricante algo que respalda la tienda deja
   * al cliente dando vueltas.
   */
  it("sin duración manda a preguntar a quien responde", () => {
    expect(textoGarantia(conRespaldo({}))).toBe("Consultar con el fabricante");
    expect(textoGarantia(conRespaldo({ garantia_respalda: "apso" }))).toBe(
      "Consúltanos por la garantía",
    );
  });
});
