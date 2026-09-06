import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada petición y hace la redirección
 * optimista del panel.
 *
 * "Optimista" es literal: aquí solo se mira si hay sesión, no si es admin. La
 * autorización de verdad vive en `exigirAdmin()`, del lado del servidor, tal
 * como recomiendan los docs de Next — el proxy no es una solución de
 * autorización.
 */
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesAEscribir) {
          for (const { name, value } of cookiesAEscribir) {
            request.cookies.set(name, value);
          }
          respuesta = NextResponse.next({ request });
          for (const { name, value, options } of cookiesAEscribir) {
            respuesta.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ruta = request.nextUrl.pathname;
  const esPanel = ruta.startsWith("/admin");
  const esEntrada = ruta === "/admin/entrar";

  if (esPanel && !esEntrada && !user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/entrar";
    return NextResponse.redirect(destino);
  }

  if (esEntrada && user) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/admin/productos";
    return NextResponse.redirect(destino);
  }

  return respuesta;
}

export const config = {
  matcher: [
    // Todo menos estáticos e imágenes: la sesión se refresca en cada
    // navegación real.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
