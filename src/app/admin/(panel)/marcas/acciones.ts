"use server";

import { revalidatePath } from "next/cache";

import { type DatosMarca, esquemaMarca, validar } from "@/lib/esquemas";
import { exigirAdmin } from "@/lib/sesion";
import { generarSlug } from "@/lib/texto";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoMarca = { error: string } | { ok: true };

/** Código de Postgres para «ya existe una fila con esa clave única». */
const DUPLICADO = "23505";
/** Código de Postgres para «hay filas que apuntan a esta». */
const REFERENCIADA = "23503";

function preparar(datos: DatosMarca) {
  return {
    nombre: datos.nombre,
    slug: datos.slug === "" ? generarSlug(datos.nombre) : datos.slug,
  };
}

export async function crearMarca(datos: DatosMarca): Promise<EstadoMarca> {
  await exigirAdmin();

  const resultado = await validar(esquemaMarca, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("marcas").insert(preparar(resultado.valores));

  if (error?.code === DUPLICADO) {
    return { error: "Ya existe una marca con ese nombre o esa dirección." };
  }
  if (error) return { error: `No se pudo crear: ${error.message}` };

  revalidatePath("/admin/marcas");
  // El selector de marca del formulario de producto se arma en el servidor,
  // así que también hay que refrescarlo o la marca nueva no aparece.
  revalidatePath("/admin/productos", "layout");
  return { ok: true };
}

export async function actualizarMarca(
  id: string,
  datos: DatosMarca,
): Promise<EstadoMarca> {
  await exigirAdmin();

  const resultado = await validar(esquemaMarca, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("marcas")
    .update(preparar(resultado.valores))
    .eq("id", id);

  if (error?.code === DUPLICADO) {
    return { error: "Ya existe una marca con ese nombre o esa dirección." };
  }
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/marcas");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Borra la marca.
 *
 * La llave foránea de productos es `on delete restrict`, así que una marca con
 * productos no se puede borrar y la base lo impide. Se cuenta antes para poder
 * decir cuántos son: «no se pudo» a secas obliga a adivinar qué estorba.
 */
export async function eliminarMarca(id: string): Promise<EstadoMarca> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();

  const { count } = await supabase
    .from("productos")
    .select("id", { count: "exact", head: true })
    .eq("marca_id", id);

  if (count && count > 0) {
    return {
      error: `Esta marca tiene ${count} ${count === 1 ? "producto" : "productos"}. Cámbiales la marca antes de borrarla.`,
    };
  }

  const { error } = await supabase.from("marcas").delete().eq("id", id);

  // Puede seguir fallando aunque el conteo diera cero: alguien pudo asignarle
  // un producto entre la comprobación y el borrado.
  if (error?.code === REFERENCIADA) {
    return { error: "Esta marca acaba de recibir un producto. Recarga y vuelve a intentar." };
  }
  if (error) return { error: `No se pudo borrar: ${error.message}` };

  revalidatePath("/admin/marcas");
  revalidatePath("/", "layout");
  return { ok: true };
}
