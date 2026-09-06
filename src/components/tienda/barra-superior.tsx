import Link from "next/link";

import { Logo } from "@/components/marca/isotipo";
import { MenuCuenta } from "@/components/tienda/menu-cuenta";
import type { Categoria } from "@/lib/catalogo";
import { formatearTasa } from "@/lib/formato";

/**
 * Barra superior de las pantallas de cliente.
 *
 * La tasa del día vive aquí y se ve en todas las pantallas: es el dato que el
 * cliente venezolano revisa antes que el precio.
 */
export function BarraSuperior({
  categorias,
  tasa,
  enCarrito,
  sesion,
}: {
  categorias: Categoria[];
  tasa: number | null;
  enCarrito: number;
  sesion: { nombre: string; esAdmin: boolean } | null;
}) {
  return (
    <header className="border-borde-sutil bg-fondo/95 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-6">
        <Link href="/" aria-label="apso, ir al inicio">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {categorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/${categoria.slug}`}
              className="text-texto-2 hover:text-texto hover:bg-superficie rounded-pildora px-3 py-1.5 text-sm transition-colors"
            >
              {categoria.nombre}
            </Link>
          ))}
        </nav>

        <form action="/componentes" className="ml-auto hidden md:block">
          <input
            type="search"
            name="q"
            placeholder="Busca RAM, gráfica, laptop…"
            aria-label="Buscar en el catálogo"
            className="bg-superficie-2 border-borde-sutil text-texto placeholder:text-texto-meta focus:border-cian rounded-pildora w-64 border px-4 py-2 text-sm outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <TasaDelDia tasa={tasa} />

          <Link
            href="/carrito"
            className="text-texto-2 hover:text-texto hover:bg-superficie rounded-pildora relative p-2 transition-colors"
            aria-label={
              enCarrito > 0
                ? `Ver el carrito, ${enCarrito} ${enCarrito === 1 ? "artículo" : "artículos"}`
                : "Ver el carrito"
            }
          >
            <IconoCarrito />
            {enCarrito > 0 && (
              <span className="bg-cian text-superficie font-display absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
                {enCarrito}
              </span>
            )}
          </Link>

          {sesion ? (
            <MenuCuenta nombre={sesion.nombre} esAdmin={sesion.esAdmin} />
          ) : (
            <Link
              href="/entrar"
              className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-4 py-2 text-sm font-semibold transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function TasaDelDia({ tasa }: { tasa: number | null }) {
  if (tasa === null) return null;

  return (
    <div className="hidden text-right sm:block">
      <p className="etiqueta text-texto-meta text-[9px]">Tasa hoy</p>
      <p className="font-display text-texto-2 text-sm font-medium">
        {formatearTasa(tasa)}
      </p>
    </div>
  );
}

/** Trazo de 2 px, extremos rectos, monocromo (manual de marca, §10). */
function IconoCarrito() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M3 4h3l2.4 11h9.2L20 7H7" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="18" cy="19" r="1.5" />
    </svg>
  );
}
