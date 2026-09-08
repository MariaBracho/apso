import type { Metadata } from "next";
import Link from "next/link";

import { FilaCarrito } from "@/components/tienda/fila-carrito";
import { VaciarCarrito } from "@/components/tienda/vaciar-carrito";
import { obtenerAjustes, obtenerTasaVigente } from "@/lib/catalogo";
import { leerCarrito, resumir } from "@/lib/carrito";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { preciosDe } from "@/lib/precio";

export const metadata: Metadata = { title: "Tu carrito" };

export default async function PaginaCarrito() {
  const [items, tasa, { recargo }] = await Promise.all([
    leerCarrito(),
    obtenerTasaVigente(),
    obtenerAjustes(),
  ]);
  const resumen = resumir(items);
  const total = preciosDe(resumen.subtotalUsd, recargo);

  if (items.length === 0) return <CarritoVacio />;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
            Tu carrito
          </h1>
          <p className="text-texto-2 mt-1 text-sm">
            {resumen.unidades}{" "}
            {resumen.unidades === 1 ? "artículo" : "artículos"}
          </p>
        </div>

        <div className="shrink-0 pt-1.5">
          <VaciarCarrito />
        </div>
      </div>

      {resumen.cambiosDePrecio.length > 0 && (
        <AvisoCambioDePrecio cambios={resumen.cambiosDePrecio} />
      )}

      <ul className="mt-8 space-y-3">
        {items.map((item) => (
          <FilaCarrito
            key={item.id}
            item={item}
            tasa={tasa}
            recargo={recargo}
          />
        ))}
      </ul>

      <div className="bg-superficie rounded-panel mt-8 p-6">
        <Linea etiqueta="Subtotal" valor={formatearUsd(total.bolivares)} />
        <Linea
          etiqueta="Entrega"
          valor="Se acuerda en el chat"
          apagado
        />
        {tasa !== null && (
          <Linea
            etiqueta="Tasa del BCV"
            valor={`Bs ${tasa.toLocaleString("es-VE", { minimumFractionDigits: 2 })} / $`}
            apagado
          />
        )}

        <div className="border-borde mt-4 flex items-baseline justify-between border-t pt-4">
          <span className="text-texto text-sm font-medium">
            Pagando en bolívares
          </span>
          <div className="text-right">
            <p className="font-display text-ambar tracking-titular text-2xl font-semibold">
              {formatearUsd(total.bolivares)}
            </p>
            {tasa !== null && (
              <p className="text-texto-meta text-xs">
                {formatearBs(total.bolivares, tasa)}
              </p>
            )}
          </div>
        </div>

        {total.ahorro > 0 && (
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-texto-2 text-sm">
              Pagando en dólares
              <span className="text-texto-meta"> · ahorras {formatearUsd(total.ahorro)}</span>
            </span>
            <p className="font-display text-exito text-lg font-semibold">
              {formatearUsd(total.divisa)}
            </p>
          </div>
        )}

        <Link
          href="/pedido"
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 mt-6 block w-full px-6 py-3.5 text-center text-sm font-semibold transition-colors"
        >
          Continuar con el pedido
        </Link>
        <p className="text-texto-meta mt-3 text-center text-xs">
          Nada se cobra aquí. El pedido se cierra por WhatsApp.
        </p>
      </div>
    </div>
  );
}

function Linea({
  etiqueta,
  valor,
  apagado = false,
}: {
  etiqueta: string;
  valor: string;
  apagado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-1 text-sm">
      <span className="text-texto-2">{etiqueta}</span>
      <span className={apagado ? "text-texto-meta text-xs" : "text-texto"}>
        {valor}
      </span>
    </div>
  );
}

/**
 * Si el precio cambió entre agregar al carrito y llegar aquí, se dice. La
 * alternativa —recalcular callado— es exactamente lo que la marca promete no
 * hacer.
 */
function AvisoCambioDePrecio({
  cambios,
}: {
  cambios: Array<{ nombre: string; antes: number; ahora: number }>;
}) {
  return (
    <div className="border-ambar/40 bg-ambar/10 rounded-tarjeta mt-6 border p-4">
      <p className="text-ambar text-sm font-medium">
        {cambios.length === 1
          ? "Un precio cambió desde que lo agregaste"
          : "Algunos precios cambiaron desde que los agregaste"}
      </p>
      <ul className="mt-2 space-y-1">
        {cambios.map((cambio) => (
          <li key={cambio.nombre} className="text-texto-2 text-xs">
            {cambio.nombre}: {formatearUsd(cambio.antes)} →{" "}
            <strong className="text-texto font-medium">
              {formatearUsd(cambio.ahora)}
            </strong>
          </li>
        ))}
      </ul>
      <p className="text-texto-meta mt-2 text-xs">
        El total de arriba ya usa el precio de ahora.
      </p>
    </div>
  );
}

/** Vacío con salida: se ofrece a dónde ir, no una pantalla en blanco. */
function CarritoVacio() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
        Todavía no hay nada
      </h1>
      <p className="text-texto-2 mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        Cuando agregues algo aparece aquí. Puedes ver todo el catálogo sin
        cuenta.
      </p>
      <Link
        href="/componentes"
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 mt-8 inline-block px-6 py-3 text-sm font-semibold transition-colors"
      >
        Ver catálogo
      </Link>
    </div>
  );
}
