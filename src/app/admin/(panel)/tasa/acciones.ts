"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoTasa = { error: string } | { ok: true } | undefined;

const esquemaTasa = z.object({
  valor: z
    .number()
    .positive("La tasa tiene que ser mayor que cero.")
    .max(100000, "Esa tasa no parece real. Revísala."),
  fuente: z.enum(["bcv", "manual", "promedio"]),
});

/**
 * Fijar la tasa no pisa la anterior: agrega una nueva vigencia.
 *
 * El historial no es un lujo. Un pedido de hace dos semanas tiene que poder
 * explicar con qué tasa se calculó, y si se sobreescribiera la fila esa
 * explicación desaparecería.
 */
export async function fijarTasa(
  _previo: EstadoTasa,
  datos: FormData,
): Promise<EstadoTasa> {
  const sesion = await exigirAdmin();

  const crudo = {
    valor: Number(String(datos.get("valor") ?? "").replace(",", ".")),
    fuente: String(datos.get("fuente") ?? "manual"),
  };

  const resultado = esquemaTasa.safeParse(crudo);
  if (!resultado.success) {
    return { error: resultado.error.issues[0]?.message ?? "Revisa la tasa." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("tasas_cambio").insert({
    valor: resultado.data.valor,
    fuente: resultado.data.fuente,
    registrada_por: sesion.id,
  });

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // La tasa sale en la barra superior de toda la tienda.
  revalidatePath("/", "layout");
  return { ok: true };
}
