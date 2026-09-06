import { NextResponse, type NextRequest } from "next/server";

import { crearClienteServidor } from "@/lib/supabase/servidor";

/**
 * Vuelta de Google.
 *
 * Cambia el código por una sesión y decide a dónde mandar a la persona: si
 * todavía no tiene WhatsApp, al paso de completar el perfil; si ya lo tiene,
 * a donde iba.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  const destino = searchParams.get("destino") ?? "/mis-pedidos";

  if (!codigo) {
    return NextResponse.redirect(`${origin}/entrar?error=sin_codigo`);
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(codigo);

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?error=intercambio`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/entrar?error=sin_sesion`);
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("whatsapp")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.whatsapp) {
    return NextResponse.redirect(
      `${origin}/perfil/completar?destino=${encodeURIComponent(destino)}`,
    );
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
