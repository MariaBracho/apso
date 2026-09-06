"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { exigirAdmin } from "@/lib/sesion";
import { generarSlug } from "@/lib/texto";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoProducto = { error: string } | undefined;

/**
 * Un producto vale si el precio es un número positivo y tiene nombre y
 * categoría. El resto son matices que el negocio puede dejar en blanco:
 * mejor un producto publicado sin resumen que uno que no se puede guardar.
 */
const esquemaProducto = z.object({
  nombre: z.string().trim().min(1, "El nombre no puede quedar vacío."),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "La dirección solo admite minúsculas, números y guiones.",
    ),
  categoria_id: z.uuid("Elige una categoría."),
  marca_id: z.uuid().nullable(),
  resumen: z.string().trim().max(200).nullable(),
  descripcion: z.string().trim().nullable(),
  especificaciones: z.array(
    z.object({ clave: z.string().trim().min(1), valor: z.string().trim().min(1) }),
  ),
  precio_usd: z.number().positive("El precio tiene que ser mayor que cero."),
  precio_referencia_usd: z
    .number()
    .positive("El precio de referencia tiene que ser mayor que cero.")
    .nullable(),
  stock: z.number().int().min(0, "El stock no puede ser negativo."),
  dias_encargo: z
    .number()
    .int()
    .positive("El plazo de encargo tiene que ser mayor que cero.")
    .nullable(),
  condicion: z.enum(["nuevo", "reacondicionado"]),
  garantia_meses: z.number().int().positive().nullable(),
  garantia_vitalicia: z.boolean(),
  destacado: z.boolean(),
  activo: z.boolean(),
});

function texto(datos: FormData, clave: string): string | null {
  const valor = String(datos.get(clave) ?? "").trim();
  return valor === "" ? null : valor;
}

function numero(datos: FormData, clave: string): number | null {
  const valor = texto(datos, clave);
  if (valor === null) return null;
  const convertido = Number(valor.replace(",", "."));
  return Number.isFinite(convertido) ? convertido : null;
}

function casilla(datos: FormData, clave: string): boolean {
  return datos.get(clave) === "on";
}

function leerFormulario(datos: FormData) {
  const claves = datos.getAll("espec_clave").map(String);
  const valores = datos.getAll("espec_valor").map(String);

  const especificaciones = claves
    .map((clave, i) => ({ clave: clave.trim(), valor: (valores[i] ?? "").trim() }))
    .filter((e) => e.clave !== "" && e.valor !== "");

  const vitalicia = casilla(datos, "garantia_vitalicia");

  return {
    nombre: String(datos.get("nombre") ?? "").trim(),
    slug: String(datos.get("slug") ?? "").trim(),
    categoria_id: String(datos.get("categoria_id") ?? ""),
    marca_id: texto(datos, "marca_id"),
    resumen: texto(datos, "resumen"),
    descripcion: texto(datos, "descripcion"),
    especificaciones,
    precio_usd: numero(datos, "precio_usd") ?? 0,
    precio_referencia_usd: numero(datos, "precio_referencia_usd"),
    stock: numero(datos, "stock") ?? 0,
    dias_encargo: numero(datos, "dias_encargo"),
    condicion: String(datos.get("condicion") ?? "nuevo"),
    // La restricción de la base impide tener las dos a la vez; se respeta aquí
    // para dar un mensaje claro en vez de un error de Postgres.
    garantia_meses: vitalicia ? null : numero(datos, "garantia_meses"),
    garantia_vitalicia: vitalicia,
    destacado: casilla(datos, "destacado"),
    activo: casilla(datos, "activo"),
  };
}

function validar(datos: FormData) {
  const crudo = leerFormulario(datos);

  if (crudo.slug === "" && crudo.nombre !== "") {
    crudo.slug = generarSlug(crudo.nombre);
  }

  const resultado = esquemaProducto.safeParse(crudo);
  if (!resultado.success) {
    const primero = resultado.error.issues[0]?.message;
    return {
      ok: false as const,
      error: primero ?? "Revisa los datos del formulario.",
    };
  }

  const p = resultado.data;

  if (p.precio_referencia_usd !== null && p.precio_referencia_usd <= p.precio_usd) {
    return {
      ok: false as const,
      error:
        "El precio de referencia tiene que ser mayor que el tuyo; si no, no hay ahorro que mostrar.",
    };
  }

  return { ok: true as const, producto: p };
}

export async function crearProducto(
  _previo: EstadoProducto,
  datos: FormData,
): Promise<EstadoProducto> {
  await exigirAdmin();

  const validado = validar(datos);
  if (!validado.ok) return { error: validado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("productos").insert(validado.producto);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya hay un producto con esa dirección. Cámbiala."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}

export async function actualizarProducto(
  id: string,
  _previo: EstadoProducto,
  datos: FormData,
): Promise<EstadoProducto> {
  await exigirAdmin();

  const validado = validar(datos);
  if (!validado.ok) return { error: validado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("productos")
    .update(validado.producto)
    .eq("id", id);

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ya hay un producto con esa dirección. Cámbiala."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}

/**
 * No se borra: se despublica. Un producto borrado se lleva por delante el
 * historial de quien lo compró, y el nombre del pedido dejaría de cuadrar con
 * nada. Dejar de mostrarlo alcanza.
 */
export async function alternarPublicado(id: string, activo: boolean) {
  await exigirAdmin();

  const supabase = await crearClienteServidor();
  await supabase.from("productos").update({ activo }).eq("id", id);

  revalidatePath("/admin/productos");
}
