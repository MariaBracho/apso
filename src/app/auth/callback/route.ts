import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Vuelta de Google.
 *
 * Cambia el código por una sesión y decide a dónde mandar a la persona: si
 * todavía no tiene WhatsApp, al paso de completar el perfil; si ya lo tiene,
 * a donde iba.
 *
 * Las cookies de sesión se acumulan y se pegan a mano a la respuesta final.
 * En un Route Handler no basta con escribirlas a través de `next/headers`: si
 * devuelves un `NextResponse` construido aparte, se quedan por el camino y la
 * siguiente petición llega sin sesión.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const codigo = searchParams.get("code");
  const destino = searchParams.get("destino") ?? "/mis-pedidos";

  const cookiesPendientes: Array<{
    name: string;
    value: string;
    options?: Record<string, unknown>;
  }> = [];

  const responder = (ruta: string) => {
    const respuesta = NextResponse.redirect(`${origin}${ruta}`);
    for (const cookie of cookiesPendientes) {
      respuesta.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return respuesta;
  };

  if (!codigo) {
    return responder("/entrar?error=sin_codigo");
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(lista) {
          cookiesPendientes.push(...lista);
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(codigo);
  if (error) {
    return responder("/entrar?error=intercambio");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return responder("/entrar?error=sin_sesion");
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("whatsapp")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil?.whatsapp) {
    return responder(
      `/perfil/completar?destino=${encodeURIComponent(destino)}`,
    );
  }

  return responder(destino);
}
