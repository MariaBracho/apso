import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormularioPerfil } from "@/app/(tienda)/perfil/formulario";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mi perfil" };

/**
 * Los datos de la persona, en un solo sitio.
 *
 * Existe para que el pedido no vuelva a pedirlos. El nombre y el correo son de
 * Google y se muestran hechos; el número es lo único que se escribe a mano, y
 * lo único que puede cambiar.
 */
export default async function PaginaPerfil() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/entrar?destino=/perfil");

  const iniciales = sesion.nombre
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
        Mi perfil
      </h1>
      <p className="text-texto-2 mt-1 text-sm">
        Con esto llenamos tus pedidos, para que no lo escribas cada vez.
      </p>

      <div className="bg-superficie border-borde-sutil rounded-tarjeta mt-8 flex items-center gap-3 border p-4">
        <div className="bg-hueso text-violeta font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-texto truncate text-sm font-medium">
            {sesion.nombre}
          </p>
          <p className="text-texto-meta truncate text-xs">{sesion.correo}</p>
        </div>
      </div>

      {/* Se dice por qué no se pueden tocar, en vez de dejar dos campos
          apagados sin explicación. */}
      <p className="text-texto-meta mt-2 text-xs leading-relaxed">
        El nombre y el correo los pone tu cuenta de Google, así que aquí no se
        cambian. Si quieres otro nombre, cámbialo en Google y vuelve a entrar.
      </p>

      <div className="border-borde-sutil mt-8 border-t pt-8">
        <FormularioPerfil whatsapp={sesion.whatsapp} />
      </div>

      <p className="text-texto-meta mt-10 text-xs">
        <Link href="/mis-pedidos" className="text-cian hover:underline">
          Ver mis pedidos
        </Link>
      </p>
    </div>
  );
}
