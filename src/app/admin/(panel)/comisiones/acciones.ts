"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoComision = { error: string } | { ok: true; pagadas: number };

/**
 * Marca como pagadas todas las comisiones pendientes de una persona.
 *
 * De golpe y no una por una porque así es como se liquida: se le paga a
 * alguien lo que se le debe hasta hoy, no el pedido A-0131 por separado. Se
 * guarda la fecha y quién liquidó, que es lo que después explica el monto.
 *
 * Solo toca las que estaban sin pagar. Si entre que se abrió la pantalla y se
 * pulsó el botón alguien liquidó otra, esta no la vuelve a marcar ni cambia su
 * fecha.
 */
export async function liquidarComisiones(
  perfilId: string,
): Promise<EstadoComision> {
  const sesion = await exigirAdmin();

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("comisiones")
    .update({
      pagada_en: new Date().toISOString(),
      pagada_por: sesion.id,
    })
    .eq("perfil_id", perfilId)
    .is("pagada_en", null)
    .select("id");

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/admin/comisiones");
  return { ok: true, pagadas: data?.length ?? 0 };
}
