"use server";

import { revalidatePath } from "next/cache";

import {
  type DatosPrecios,
  type DatosTasa,
  esquemaPrecios,
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
 * Cambia el recargo y si el precio en divisas se anuncia.
 *
 * El recargo mueve el precio en bolívares de todo el catálogo de inmediato. El
 * precio en divisas no se toca — ese es el que está cargado en cada producto.
 * Los pedidos ya hechos tampoco: cada uno congeló sus precios al enviarse.
 *
 * El interruptor es solo de presentación: apagado, el catálogo y la ficha no
 * anuncian el precio en dólares, pero quien pague en divisas lo paga igual.
 */
export async function fijarPrecios(datos: DatosPrecios): Promise<EstadoTasa> {
  const sesion = await exigirAdmin();

  const resultado = await validar(esquemaPrecios, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("ajustes")
    .update({
      recargo_bs_pct: resultado.valores.recargo_bs_pct,
      mostrar_precio_divisa: resultado.valores.mostrar_precio_divisa,
      comision_venta_pct: resultado.valores.comision_venta_pct,
      actualizado_en: new Date().toISOString(),
      actualizado_por: sesion.id,
    })
    .eq("id", true);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}
