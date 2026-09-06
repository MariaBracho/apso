import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormularioWhatsapp } from "@/app/(tienda)/perfil/completar/formulario";
import { obtenerSesion } from "@/lib/sesion";

export const metadata: Metadata = { title: "Completar perfil" };

/**
 * Paso 2 del registro. Google ya resolvió la identidad; aquí solo falta el
 * WhatsApp, que es el único dato que la persona escribe a mano.
 */
export default async function PaginaCompletarPerfil({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sesion = await obtenerSesion();
  // Se dice por qué se vuelve atrás. Un redirect callado deja a la persona
  // en la pantalla de entrada sin entender qué falló ni qué hacer distinto.
  if (!sesion) redirect("/entrar?error=sesion_perdida");

  const params = await searchParams;
  const destino =
    typeof params.destino === "string" ? params.destino : "/mis-pedidos";

  const iniciales = sesion.nombre
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
        Falta una sola cosa
      </h1>

      {/* La identidad ya está resuelta y se muestra hecha, con el check en
          verde: deja claro que eso no hay que escribirlo. */}
      <div className="bg-superficie border-borde-sutil rounded-tarjeta mt-6 flex items-center gap-3 border p-4">
        <div className="bg-hueso text-violeta font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
          {iniciales}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-texto truncate text-sm font-medium">
            {sesion.nombre}
          </p>
          <p className="text-texto-meta truncate text-xs">{sesion.correo}</p>
        </div>
        <Check />
      </div>

      <div className="mt-6">
        <FormularioWhatsapp destino={destino} />
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className="text-exito shrink-0"
      aria-label="Datos confirmados por Google"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}
