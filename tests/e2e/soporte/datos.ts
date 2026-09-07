import { createClient } from "@supabase/supabase-js";

/**
 * Acceso directo a la base para preparar y limpiar lo que necesita cada prueba.
 *
 * Con la clave de servicio a propósito: aquí se salta RLS para poder dejar el
 * mundo en un estado conocido. Lo que se comprueba es la aplicación, no lo que
 * hace este archivo.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SECRET_KEY;

if (!url || !clave) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY. Copia .env.example a .env y corre `supabase start`.",
  );
}

// Se comprueba que apunte a local: estas pruebas borran pedidos y mueven
// inventario, y correrlas contra la nube sería destruir datos reales.
if (!/127\.0\.0\.1|localhost/.test(url)) {
  throw new Error(
    `Las pruebas end-to-end solo corren contra Supabase local. NEXT_PUBLIC_SUPABASE_URL apunta a ${url}.`,
  );
}

export const db = createClient(url, clave, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** El admin sembrado en `supabase/seed.sql`. Solo existe en local. */
export const ADMIN = {
  correo: "admin@apso.com.ve",
  clave: "apso.admin.local",
};

export async function productoPorSlug(slug: string) {
  const { data, error } = await db
    .from("productos")
    .select("id, nombre, slug, precio_usd, stock, condicion, activo, categoria:categorias (slug)")
    .eq("slug", slug)
    .single();

  if (error) throw new Error(`No se encontró el producto ${slug}: ${error.message}`);
  return data as unknown as {
    id: string;
    nombre: string;
    slug: string;
    precio_usd: number;
    stock: number;
    condicion: string;
    activo: boolean;
    categoria: { slug: string };
  };
}

/** La dirección de la ficha, tal como la arma la tienda. */
export async function rutaDe(slug: string): Promise<string> {
  const p = await productoPorSlug(slug);
  return `/${p.categoria.slug}/${p.slug}`;
}

export async function recargoActual(): Promise<number> {
  const { data } = await db.from("ajustes").select("recargo_bs_pct").maybeSingle();
  return Number(data?.recargo_bs_pct ?? 0);
}

export async function tasaVigente(): Promise<number> {
  const { data } = await db
    .from("tasas_cambio")
    .select("valor")
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .single();
  return Number(data!.valor);
}

/**
 * Deja el producto exactamente como se lo pide la prueba y devuelve cómo
 * estaba, para poder restaurarlo. Sin esto una prueba le cambia el stock a otra
 * y el fallo aparece en el sitio equivocado.
 */
export async function ajustarProducto(
  id: string,
  cambios: Partial<{ stock: number; activo: boolean; condicion: string; precio_usd: number }>,
) {
  const { data: antes } = await db
    .from("productos")
    .select("stock, activo, condicion, precio_usd")
    .eq("id", id)
    .single();

  await db.from("productos").update(cambios).eq("id", id);
  return async () => {
    await db.from("productos").update(antes!).eq("id", id);
  };
}

/** Borra un pedido y todo lo que cuelga de él. */
export async function borrarPedido(numero: string) {
  const { data } = await db.from("pedidos").select("id").eq("numero", numero).maybeSingle();
  if (!data) return;

  await db.from("seriales").delete().eq("pedido_id", data.id);
  await db.from("pedido_items").delete().eq("pedido_id", data.id);
  await db.from("pedido_eventos").delete().eq("pedido_id", data.id);
  await db.from("movimientos_inventario").delete().eq("pedido_id", data.id);
  await db.from("pedidos").delete().eq("id", data.id);
}
