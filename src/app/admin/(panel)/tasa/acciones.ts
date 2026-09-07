"use server";

import { revalidatePath } from "next/cache";

import {
  type DatosMargen,
  type DatosTasa,
  esquemaMargen,
  esquemaTasa,
  validar,
} from "@/lib/esquemas";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoTasa = { error: string } | { ok: true } | undefined;

/**
 * Fijar la tasa no pisa la anterior: agrega una vigencia nueva.
 *
 * El historial no es un lujo. Un pedido de hace dos semanas tiene que poder
 * explicar con qué tasa se calculó, y si se sobreescribiera la fila esa
 * explicación desaparecería.
 */
export async function fijarTasa(datos: DatosTasa): Promise<EstadoTasa> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaTasa, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("tasas_cambio").insert({
    valor: resultado.valores.valor,
    fuente: resultado.valores.fuente,
    registrada_por: sesion.id,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // La tasa sale en la barra superior de toda la tienda.
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Cambia el margen de venta.
 *
 * Esto mueve el precio en bolívares de todo el catálogo de inmediato. Los
 * pedidos ya hechos no se tocan: cada uno congeló su tasa al enviarse.
 */
export async function fijarMargen(datos: DatosMargen): Promise<EstadoTasa> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaMargen, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("ajustes")
    .update({
      margen_tasa_pct: resultado.valores.margen_tasa_pct,
      actualizado_en: new Date().toISOString(),
      actualizado_por: sesion.id,
    })
    .eq("id", true);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}
