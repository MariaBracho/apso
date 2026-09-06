import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Usa la clave pública: todo lo que devuelve pasa por las políticas de RLS.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesAEscribir) {
          try {
            for (const { name, value, options } of cookiesAEscribir) {
              almacenCookies.set(name, value, options);
            }
          } catch {
            // Los Server Components no pueden escribir cookies. Se ignora
            // porque el refresco de sesión lo hace el proxy.
          }
        },
      },
    },
  );
}
