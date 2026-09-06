"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoPerfil = { error: string } | undefined;

const esquema = z.object({
  whatsapp: z
    .string()
    .regex(/^[0-9]{10}$/, "El WhatsApp son 10 dígitos, sin el 0 ni el +58."),
  destino: z.string().startsWith("/", "Destino inválido."),
});

/**
 * Guarda el WhatsApp y reclama los pedidos que la persona hizo sin cuenta.
 *
 * Se puede comprar como invitado y registrarse después; al confirmar el
 * número, los pedidos que llevan ese mismo WhatsApp pasan a su historial. Sin
 * esto, registrarse borraría de un plumazo todo lo que compró antes.
 */
export async function guardarWhatsapp(
  _previo: EstadoPerfil,
  datos: FormData,
): Promise<EstadoPerfil> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/entrar");

  const validado = esquema.safeParse({
    whatsapp: String(datos.get("whatsapp") ?? "").replace(/[^0-9]/g, ""),
    destino: String(datos.get("destino") ?? "/mis-pedidos"),
  });

  if (!validado.success) {
    return { error: validado.error.issues[0]?.message ?? "Revisa el número." };
  }

  const numero = `+58${validado.data.whatsapp}`;
  const supabase = await crearClienteServidor();

  const { error } = await supabase
    .from("perfiles")
    .update({ whatsapp: numero, whatsapp_verificado: true })
    .eq("id", sesion.id);

  if (error) {
    // El índice único del WhatsApp es lo que impide dos cuentas con el mismo
    // número. El flujo 01 pide avisar y ofrecer continuar con la que existe,
    // no duplicar en silencio.
    return {
      error:
        error.code === "23505"
          ? "Ese número ya está en otra cuenta. Entra con el correo que usaste esa vez, o escríbenos y lo resolvemos."
          : `No se pudo guardar: ${error.message}`,
    };
  }

  await supabase.rpc("reclamar_pedidos_por_whatsapp");

  revalidatePath("/mis-pedidos");
  redirect(validado.data.destino);
}
