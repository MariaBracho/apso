import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { entrarConGoogle } from "@/app/(tienda)/entrar/acciones";
import { BotonGoogle } from "@/components/tienda/boton-google";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await obtenerSesion();
  if (sesion) redirect("/mis-pedidos");

  const params = await searchParams;
  const destino = typeof params.destino === "string" ? params.destino : "/mis-pedidos";
  const fallo = typeof params.error === "string";

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
        <p role="alert" className="text-error mt-6 text-sm">
          No se pudo completar el ingreso. Inténtalo otra vez.
        </p>
      )}

      <form action={entrarConGoogle} className="mt-8">
        <input type="hidden" name="destino" value={destino} />
        <BotonGoogle />
      </form>

      <p className="text-texto-meta mt-6 text-xs leading-relaxed">
        No hace falta cuenta para ver el catálogo ni para armar el carrito.{" "}
        <Link href="/componentes" className="text-cian hover:text-cian/80">
          Seguir sin cuenta
        </Link>
      </p>
    </div>
  );
}
