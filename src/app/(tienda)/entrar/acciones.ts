"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Arranca el registro con Google (flujo 01, paso 3).
 *
 * Google entrega nombre, correo y foto, así que después no se vuelven a pedir.
 * El único dato que la persona escribe a mano es el WhatsApp, en el paso
 * siguiente.
 */
export async function entrarConGoogle(datos: FormData) {
  const supabase = await crearClienteServidor();
  const cabeceras = await headers();
  const origen = cabeceras.get("origin") ?? "http://localhost:3000";

  // A dónde volver después de entrar. Sirve para que quien estaba a punto de
  // enviar un pedido no pierda el sitio.
  const destino = String(datos.get("destino") ?? "/mis-pedidos");

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origen}/auth/callback?destino=${encodeURIComponent(destino)}`,
    },
  });

  if (error || !data.url) {
    redirect("/entrar?error=google");
  }

  redirect(data.url);
}

export async function salirDeLaCuenta() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/");
}
