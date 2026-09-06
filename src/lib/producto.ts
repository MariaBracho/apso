/**
 * Tipos y reglas de producto, sin nada de servidor.
 *
 * Vive aparte de `catalogo.ts` a propósito: allí están las consultas, que
 * importan `next/headers`, y este módulo lo usan también componentes de
 * cliente (la etiqueta de disponibilidad sale en el carrito). Mezclarlos
 * arrastra el cliente de Supabase al bundle del navegador.
 */

export type Disponibilidad = "en_stock" | "por_pedido" | "sin_stock";

export type CategoriaRef = {
  slug: string;
  nombre: string;
};

export type MarcaRef = {
  slug: string;
  nombre: string;
};

/** Lista ordenada: el orden en que se leen las especificaciones importa. */
export type Especificacion = {
  clave: string;
  valor: string;
};

export type Categoria = {
  id: string;
  slug: string;
  nombre: string;
  padre_id: string | null;
};

export type ImagenProducto = {
  url: string;
  alt: string | null;
};

export type ProductoListado = {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  precio_usd: number;
  precio_referencia_usd: number | null;
  stock: number;
  dias_encargo: number | null;
  categoria: CategoriaRef;
  marca: MarcaRef | null;
  /** En orden. La primera es la que sale en la tarjeta del catálogo. */
  imagenes: ImagenProducto[];
};

export type ProductoFicha = ProductoListado & {
  descripcion: string | null;
  especificaciones: Especificacion[];
  condicion: "nuevo" | "reacondicionado";
  procedencia: string;
  garantia_meses: number | null;
  garantia_vitalicia: boolean;
};

/**
 * Estado de disponibilidad de un producto.
 *
 * "Por pedido" solo se dice cuando hay un plazo real del proveedor detrás; si
 * no hay plazo, se dice sin stock y no se promete nada.
 */
export function disponibilidadDe(producto: {
  stock: number;
  dias_encargo: number | null;
}): Disponibilidad {
  if (producto.stock > 0) return "en_stock";
  if (producto.dias_encargo !== null) return "por_pedido";
  return "sin_stock";
}
