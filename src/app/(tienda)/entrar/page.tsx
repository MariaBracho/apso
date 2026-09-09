import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { entrarConGoogle } from "@/app/(tienda)/entrar/acciones";
import { BotonGoogle } from "@/components/tienda/boton-google";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entrar" };

/**
 * Cada fallo dice qué pasó y qué hacer. "Algo salió mal" deja a la persona
 * repitiendo lo mismo sin saber si el problema es suyo o nuestro.
 */
const MENSAJE_ERROR: Record<string, string> = {
  sesion_perdida:
    "Entraste bien, pero la sesión no llegó a guardarse. Suele ser el navegador bloqueando cookies. Vuelve a intentarlo.",
  sin_codigo: "Google no devolvió la confirmación. Vuelve a intentarlo.",
  intercambio:
    "No pudimos validar tu ingreso con Google. Si vuelve a pasar, escríbenos por WhatsApp y lo resolvemos.",
  sin_sesion: "Google confirmó tu cuenta pero la sesión no se abrió. Inténtalo otra vez.",
  google: "No se pudo abrir Google. Revisa tu conexión y vuelve a intentarlo.",
  generico: "No se pudo completar el ingreso. Inténtalo otra vez.",
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await obtenerSesion();
  if (sesion) redirect("/mis-pedidos");

  const params = await searchParams;
  const destino =
    typeof params.destino === "string" ? params.destino : "/mis-pedidos";
  const fallo = typeof params.error === "string" ? params.error : null;

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
        Entra para seguir tus pedidos
      </h1>
      <p className="text-texto-2 mt-2 text-sm leading-relaxed">
        Con cuenta ves en qué va cada pedido y te queda el serial de lo que
        compraste, que es lo que hace falta para la garantía años después.
      </p>

      {fallo && (
        <p
          role="alert"
          className="border-error/40 bg-error/10 rounded-tarjeta text-texto-2 mt-6 border p-4 text-sm leading-relaxed"
        >
          {MENSAJE_ERROR[fallo] ?? MENSAJE_ERROR.generico}
        </p>
      )}

      <form action={entrarConGoogle} className="mt-8">
        <input type="hidden" name="destino" value={destino} />
        <BotonGoogle />
      </form>

      <p className="text-texto-meta mt-6 text-xs leading-relaxed">
        No hace falta cuenta para ver el catálogo ni para armar el carrito.{" "}
        <Link href="/todo" className="text-cian hover:text-cian/80">
          Seguir sin cuenta
        </Link>
      </p>
    </div>
  );
}
