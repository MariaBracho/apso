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
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* En teléfono la barra lateral no cabe, y estaba simplemente escondida:
          el panel quedaba sin ninguna forma de moverse entre pedidos,
          inventario, marcas y tasa. Aquí va la misma navegación en horizontal. */}
      <header className="bg-superficie border-borde-sutil sticky top-0 z-30 border-b lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 pt-4">
          <Link href="/admin/pedidos" className="flex items-center gap-2">
            <Isotipo className="text-cian h-5 w-auto" />
            <span className="font-display text-texto tracking-display font-semibold lowercase">
              apso
            </span>
          </Link>

          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="text-cian hover:text-cian/80 shrink-0 text-xs transition-colors"
            >
              Ver tienda ↗
            </Link>
            <form action={salir}>
              <button
                type="submit"
                className="text-texto-meta hover:text-texto shrink-0 text-xs transition-colors"
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        <div className="px-5 py-3">
          <NavPanel orientacion="horizontal" />
        </div>
      </header>

      <aside className="bg-superficie border-borde-sutil hidden w-56 shrink-0 flex-col border-r p-5 lg:flex">
        <Link href="/admin/productos" className="mb-8 flex items-center gap-2.5">
          <Isotipo className="text-cian h-6 w-auto" />
          <span className="font-display text-texto tracking-display text-lg font-semibold lowercase">
            apso
          </span>
        </Link>

        <NavPanel />

        {/* Ver la tienda es parte del trabajo: se publica un producto y hay que
            comprobar cómo quedó. Sin esto había que escribir la dirección a
            mano o abrir otra pestaña. */}
        <Link
          href="/"
          className="text-cian hover:text-cian/80 mt-6 px-3.5 text-sm transition-colors"
        >
          Ir a la tienda ↗
        </Link>

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
