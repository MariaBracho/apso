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
        {/* Al catálogo y no a la portada: quien ya está dentro y toca el logo
            quiere volver a los productos, no a leer otra vez de qué va la
            tienda. La portada sigue en `/` para quien llega por primera vez. */}
        <Link href="/componentes" aria-label="apso, ver el catálogo">
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

      {/* En pantalla de teléfono no cabe nada de esto arriba, y escondido deja
          la tienda sin salida: a Componentes se llega por el logo, pero a
          Laptops no hay forma. La tasa va aquí por lo mismo — es el dato que se
          mira antes que el precio y estaba invisible en móvil. */}
      <div className="border-borde-sutil flex items-center gap-2 border-t px-6 py-2 lg:hidden">
        <nav className="flex flex-1 gap-2 overflow-x-auto">
          {categorias.map((categoria) => (
            <Link
              key={categoria.id}
              href={`/${categoria.slug}`}
              className="bg-superficie-2 text-texto-2 hover:text-texto rounded-pildora shrink-0 px-3 py-1.5 text-xs transition-colors"
            >
              {categoria.nombre}
            </Link>
          ))}
        </nav>

        {tasa !== null && (
          <p className="text-texto-meta shrink-0 text-xs">
            <span className="etiqueta text-[9px]">BCV</span>{" "}
            <span className="font-display text-texto-2 font-medium">
              {formatearTasa(tasa)}
            </span>
          </p>
        )}
      </div>
    </header>
  );
}

function TasaDelDia({ tasa }: { tasa: number | null }) {
  if (tasa === null) return null;

  return (
    <div className="hidden text-right sm:block">
      {/* Se nombra la fuente: es la del BCV y nada más, así que el cliente
          puede contrastarla. */}
      <p className="etiqueta text-texto-meta text-[9px]">Tasa BCV</p>
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
