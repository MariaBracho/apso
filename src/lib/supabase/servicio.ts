import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave de servicio: salta RLS por completo.
 *
 * Se usa solo donde el servidor tiene que escribir por cuenta de alguien que
 * no tiene sesión — el carrito de invitado y el alta del pedido. Nunca se
 * expone al navegador: `server-only` hace fallar el build si alguien lo
 * importa desde un Client Component.
 *
 * Toda entrada que llegue por aquí ya viene validada, y los precios, la tasa y
 * los totales se leen de la base, nunca de lo que mande el cliente.
 */
export function crearClienteServicio() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
