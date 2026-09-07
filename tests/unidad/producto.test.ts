import { describe, expect, it } from "vitest";

import { disponibilidadDe, fotoPrincipal, rutaProducto } from "@/lib/producto";

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
