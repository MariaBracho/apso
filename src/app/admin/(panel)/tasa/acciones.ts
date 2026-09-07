"use server";

import { revalidatePath } from "next/cache";

import {
  type DatosRecargo,
  type DatosTasa,
  esquemaRecargo,
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
 * Cambia el recargo por pagar en bolívares.
 *
 * Mueve el precio en bolívares de todo el catálogo de inmediato. El precio en
 * divisas no se toca — ese es el que está cargado en cada producto. Los pedidos
 * ya hechos tampoco: cada uno congeló sus precios al enviarse.
 */
export async function fijarRecargo(datos: DatosRecargo): Promise<EstadoTasa> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaRecargo, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("ajustes")
    .update({
      recargo_bs_pct: resultado.valores.recargo_bs_pct,
      actualizado_en: new Date().toISOString(),
      actualizado_por: sesion.id,
    })
    .eq("id", true);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}
