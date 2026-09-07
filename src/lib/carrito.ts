import "server-only";

import { cookies } from "next/headers";

import { crearClienteServicio } from "@/lib/supabase/servicio";

/**
 * Carrito de invitado.
 *
 * Se puede armar un carrito sin cuenta — no hay muro de registro — así que el
 * carrito se identifica con un token en una cookie httpOnly y lo maneja el
 * servidor con la clave de servicio. El navegador nunca escribe en la base.
 */

export const COOKIE_CARRITO = "apso_carrito";
const DIAS_DE_VIDA = 30;

export type ItemCarrito = {
  id: string;
  cantidad: number;
  precio_usd_agregado: number;
  producto: {
    id: string;
    slug: string;
    nombre: string;
    precio_usd: number;
    stock: number;
    dias_encargo: number | null;
    categoria: { slug: string };
    marca: { nombre: string } | null;
    imagenes: Array<{ url: string; alt: string | null; orden: number }>;
  };
};

const CAMPOS = `
  id, cantidad, precio_usd_agregado,
  producto:productos!inner (
    id, slug, nombre, precio_usd, stock, dias_encargo,
    categoria:categorias!inner (slug),
    marca:marcas (nombre),
    imagenes:producto_imagenes (url, alt, orden)
  )
`;

/**
 * Lee el carrito sin crearlo. Sirve desde Server Components, que no pueden
 * escribir cookies.
 */
export async function leerCarrito(): Promise<ItemCarrito[]> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_CARRITO)?.value;
  if (!token) return [];

  const supabase = crearClienteServicio();

  const { data: carrito } = await supabase
    .from("carritos")
    .select("id")
    .eq("token", token)
    .maybeSingle();

  if (!carrito) return [];

  const { data } = await supabase
    .from("carrito_items")
    .select(CAMPOS)
    .eq("carrito_id", carrito.id)
    .order("creado_en")
    .returns<ItemCarrito[]>();

  return data ?? [];
}

/**
 * El id del carrito de quien llama, sin crear ninguno. Es la referencia contra
 * la que se comprueba que un item le pertenezca: como estas operaciones usan
 * la clave de servicio, que salta RLS, sin este acotado cualquiera podría
 * tocar el carrito de otro sabiendo el id de una fila.
 */
export async function obtenerCarritoActual(): Promise<string | null> {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_CARRITO)?.value;
  if (!token) return null;

  const supabase = crearClienteServicio();
  const { data } = await supabase
    .from("carritos")
    .select("id")
    .eq("token", token)
    .maybeSingle();

  return data?.id ?? null;
}

/** Cuántas unidades hay en total. Es el número del globo del carrito. */
export async function contarCarrito(): Promise<number> {
  const items = await leerCarrito();
  return items.reduce((total, item) => total + item.cantidad, 0);
}

/**
 * Devuelve el id del carrito, creándolo si hace falta. Solo desde server
 * actions o route handlers: escribe la cookie.
 */
export async function obtenerOCrearCarrito(): Promise<string> {
  const almacen = await cookies();
  const supabase = crearClienteServicio();
  const token = almacen.get(COOKIE_CARRITO)?.value;

  if (token) {
    const { data } = await supabase
      .from("carritos")
      .select("id")
      .eq("token", token)
      .maybeSingle();

    if (data) return data.id;
  }

  const { data: nuevo, error } = await supabase
    .from("carritos")
    .insert({})
    .select("id, token")
    .single();

  if (error || !nuevo) throw new Error("No se pudo abrir el carrito");

  almacen.set(COOKIE_CARRITO, nuevo.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * DIAS_DE_VIDA,
  });

  return nuevo.id;
}

export type ResumenCarrito = {
  items: ItemCarrito[];
  subtotalUsd: number;
  unidades: number;
  /**
   * Productos cuyo precio cambió desde que se agregaron. La regla del flujo 02
   * es avisar antes de seguir, nunca cambiar el precio en silencio.
   */
  cambiosDePrecio: Array<{
    nombre: string;
    antes: number;
    ahora: number;
  }>;
};

export function resumir(items: ItemCarrito[]): ResumenCarrito {
  const subtotalUsd = items.reduce(
    (total, item) => total + item.producto.precio_usd * item.cantidad,
    0,
  );

  const cambiosDePrecio = items
    .filter((item) => item.producto.precio_usd !== item.precio_usd_agregado)
    .map((item) => ({
      nombre: item.producto.nombre,
      antes: item.precio_usd_agregado,
      ahora: item.producto.precio_usd,
    }));

  return {
    items,
    subtotalUsd,
    unidades: items.reduce((total, item) => total + item.cantidad, 0),
    cambiosDePrecio,
  };
}
