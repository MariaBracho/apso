"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ajustarStock } from "@/app/admin/(panel)/pedidos/acciones";
import { type DatosProducto, esquemaProducto, validar } from "@/lib/esquemas";
import { exigirAdmin } from "@/lib/sesion";
import { generarSlug } from "@/lib/texto";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoProducto = { error: string } | undefined;

/**
 * Prepara los datos para la base.
 *
 * Se revalidan aquí aunque el formulario ya lo hiciera: un server action se
 * puede llamar sin pasar por el formulario, así que la validación del cliente
 * es comodidad y esta es la que protege.
 */
async function preparar(datos: DatosProducto) {
  const resultado = await validar(esquemaProducto, datos);
  if (!resultado.ok) return resultado;

  const p = resultado.valores;

  return {
    ok: true as const,
    fila: {
      nombre: p.nombre,
      slug: p.slug === "" ? generarSlug(p.nombre) : p.slug,
      categoria_id: p.categoria_id,
      marca_id: p.marca_id,
      resumen: p.resumen,
      descripcion: p.descripcion,
      // Las filas a medio llenar se descartan: una clave sin valor no dice
      // nada en la ficha.
      especificaciones: p.especificaciones.filter(
        (e) => e.clave !== "" && e.valor !== "",
      ),
      precio_usd: p.precio_usd,
      stock: p.stock,
      dias_encargo: p.dias_encargo,
      condicion: p.condicion,
      // La restricción de la base impide tener las dos a la vez.
      garantia_meses: p.garantia_vitalicia ? null : p.garantia_meses,
      garantia_vitalicia: p.garantia_vitalicia,
      destacado: p.destacado,
      activo: p.activo,
    },
  };
}

function mensajeDeError(codigo: string | undefined, detalle: string): string {
  return codigo === "23505"
    ? "Ya hay un producto con esa dirección. Cámbiala."
    : `No se pudo guardar: ${detalle}`;
}

export async function crearProducto(
  datos: DatosProducto,
): Promise<EstadoProducto> {
  await exigirAdmin();

  const preparado = await preparar(datos);
  if (!preparado.ok) return { error: preparado.error };

  const supabase = await crearClienteServidor();
  const { data: creado, error } = await supabase
    .from("productos")
    .insert(preparado.fila)
    .select("id")
    .single();

  if (error) return { error: mensajeDeError(error.code, error.message) };

  revalidatePath("/admin/productos");
  // A la edición y no al listado: las fotos necesitan un producto que ya
  // exista, así que este es el momento natural para agregarlas.
  redirect(`/admin/productos/${creado.id}`);
}

export async function actualizarProducto(
  id: string,
  datos: DatosProducto,
): Promise<EstadoProducto> {
  await exigirAdmin();

  const preparado = await preparar(datos);
  if (!preparado.ok) return { error: preparado.error };

  const supabase = await crearClienteServidor();

  // El stock sale del update y va por `mover_inventario`: escribirlo aquí lo
  // cambiaría sin dejar movimiento, y el historial tendría un salto sin
  // explicación justo donde hace falta explicar.
  const { stock, ...resto } = preparado.fila;

  const { error } = await supabase.from("productos").update(resto).eq("id", id);

  if (error) return { error: mensajeDeError(error.code, error.message) };

  const fallo = await ajustarStock(id, stock, "Cambiado desde la ficha");
  if (fallo && "error" in fallo) return { error: fallo.error };

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
