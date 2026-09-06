import Link from "next/link";
import type { ReactNode } from "react";

import { salir } from "@/app/admin/entrar/acciones";
import { Isotipo } from "@/components/marca/isotipo";
import { NavPanel } from "@/components/admin/nav-panel";
import { exigirAdmin } from "@/lib/sesion";

/**
 * Envoltura del panel.
 *
 * La guardia va aquí, en el servidor, y no en el proxy: el proxy solo hace la
 * redirección optimista mirando la cookie. Este layout es el que comprueba de
 * verdad contra el servidor de auth que hay sesión y que es admin.
 */
export default async function LayoutPanel({
  children,
}: {
  children: ReactNode;
}) {
  const sesion = await exigirAdmin();

  return (
    <div className="flex min-h-dvh">
      <aside className="bg-superficie border-borde-sutil hidden w-56 shrink-0 flex-col border-r p-5 lg:flex">
        <Link href="/admin/productos" className="mb-8 flex items-center gap-2.5">
          <Isotipo className="text-cian h-6 w-auto" />
          <span className="font-display text-texto tracking-display text-lg font-semibold lowercase">
            apso
          </span>
        </Link>

        <NavPanel />

        <div className="mt-auto pt-6">
          <p className="text-texto-2 truncate text-xs">{sesion.nombre}</p>
          <p className="text-texto-meta truncate text-xs">{sesion.correo}</p>
          <form action={salir}>
            <button
              type="submit"
              className="text-texto-meta hover:text-texto mt-2 text-xs transition-colors"
            >
              Salir
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
