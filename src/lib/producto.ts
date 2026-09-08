/**
 * Tipos y reglas de producto, sin nada de servidor.
 *
 * Vive aparte de `catalogo.ts` a propósito: allí están las consultas, que
 * importan `next/headers`, y este módulo lo usan también componentes de
 * cliente (la etiqueta de disponibilidad sale en el carrito). Mezclarlos
 * arrastra el cliente de Supabase al bundle del navegador.
 */

export type Disponibilidad = "en_stock" | "por_pedido" | "sin_stock";

/**
 * En qué estado llega el equipo.
 *
 * «Reacondicionado» pasó por taller y se probó; «usado» se vende tal como
 * llegó. Son cosas distintas y se pagan distinto, así que la tienda las nombra
 * por separado en vez de meterlas en el mismo cajón.
 */
export type Condicion = "nuevo" | "reacondicionado" | "usado";

export const NOMBRE_CONDICION: Record<Condicion, string> = {
  nuevo: "Nuevo",
  reacondicionado: "Reacondicionado",
  usado: "Usado",
};

/** En el mismo orden que el enum de la base: de mejor a peor estado. */
export const CONDICIONES: Condicion[] = [
  "nuevo",
  "reacondicionado",
  "usado",
];

/**
 * Quién responde si el equipo falla.
 *
 * No es lo mismo que cuánto dura: se puede tener doce meses del fabricante o
 * doce meses de la tienda. Decirlo importa porque es a quién hay que tocarle la
 * puerta, y mandar al cliente al fabricante cuando responde apso lo deja dando
 * vueltas.
 */
export type Respaldo = "fabricante" | "apso";

export const RESPALDOS: Respaldo[] = ["fabricante", "apso"];

export const NOMBRE_RESPALDO: Record<Respaldo, string> = {
  fabricante: "El fabricante",
  apso: "apso",
};

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

/**
 * Lo que hace falta para enlazar y mostrar un producto desde un pedido.
 *
 * Es nulo cuando la línea perdió el producto detrás: `pedido_items.producto_id`
 * es `on delete set null`.
 */
export type ProductoEnPedido = {
  slug: string;
  categoria: { slug: string } | null;
  imagenes: Array<{ url: string; alt: string | null; orden: number }>;
} | null;

/** Los campos que hay que pedir para armar un `ProductoEnPedido`. */
export const CAMPOS_PRODUCTO_EN_PEDIDO = `
  slug,
  categoria:categorias (slug),
  imagenes:producto_imagenes (url, alt, orden)
`;

/** La dirección de la ficha, o null si no hay adónde enlazar. */
export function rutaProducto(producto: ProductoEnPedido): string | null {
  if (!producto?.categoria) return null;
  return `/${producto.categoria.slug}/${producto.slug}`;
}

/**
 * La foto principal: la de orden más bajo, igual que en la tienda.
 *
 * Se ordena aquí en vez de confiar en lo que devuelva la consulta.
 */
export function fotoPrincipal(
  producto: ProductoEnPedido,
): { url: string; alt: string | null } | undefined {
  return [...(producto?.imagenes ?? [])].sort((a, b) => a.orden - b.orden)[0];
}

export type ProductoListado = {
  id: string;
  slug: string;
  nombre: string;
  resumen: string | null;
  precio_usd: number;
  stock: number;
  dias_encargo: number | null;
  condicion: Condicion;
  categoria: CategoriaRef;
  marca: MarcaRef | null;
  /** En orden. La primera es la que sale en la tarjeta del catálogo. */
  imagenes: ImagenProducto[];
};

export type ProductoFicha = ProductoListado & {
  descripcion: string | null;
  especificaciones: Especificacion[];
  procedencia: string;
  garantia_meses: number | null;
  garantia_vitalicia: boolean;
  garantia_respalda: Respaldo;
};

/**
 * La garantía en una línea: cuánto dura y quién responde.
 *
 * Sin duración no se inventa ninguna — se dice a quién preguntar. Prometer
 * doce meses porque suele ser eso sería justo la clase de promesa que la tienda
 * no puede cumplir.
 */
export function textoGarantia(producto: {
  garantia_vitalicia: boolean;
  garantia_meses: number | null;
  garantia_respalda: Respaldo;
}): string {
  const deQuien =
    producto.garantia_respalda === "apso" ? "de apso" : "del fabricante";

  if (producto.garantia_vitalicia) return `De por vida, ${deQuien}`;

  if (producto.garantia_meses === null) {
    return producto.garantia_respalda === "apso"
      ? "Consúltanos por la garantía"
      : "Consultar con el fabricante";
  }

  const años = producto.garantia_meses / 12;
  if (Number.isInteger(años) && años >= 1) {
    return `${años} ${años === 1 ? "año" : "años"}, ${deQuien}`;
  }
  return `${producto.garantia_meses} meses, ${deQuien}`;
}

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
