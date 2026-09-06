import Link from "next/link";

import { BadgeDisponibilidad } from "@/components/tienda/badge-disponibilidad";
import { FotoProducto } from "@/components/tienda/foto-producto";
import type { ProductoListado } from "@/lib/producto";
import { calcularAhorro, formatearBs, formatearUsd } from "@/lib/formato";

/**
 * Tarjeta del listado.
 *
 * Jerarquía del handoff: el precio en dólares manda (ámbar, Sora), y debajo,
 * en gris pequeño, el precio en bolívares y el ahorro. El bolívar es lo que
 * el cliente venezolano necesita para decidir; el dólar es el precio real.
 */
export function TarjetaProducto({
  producto,
  tasa,
}: {
  producto: ProductoListado;
  tasa: number | null;
}) {
  const ahorro = calcularAhorro(
    producto.precio_usd,
    producto.precio_referencia_usd,
  );

  return (
    <Link
      href={`/${producto.categoria.slug}/${producto.slug}`}
      className="group bg-superficie border-borde-sutil hover:border-cian/40 rounded-tarjeta flex flex-col border p-3 transition-colors"
    >
      <div className="relative">
        <FotoProducto />
        <span className="absolute top-2 right-2">
          <BadgeDisponibilidad producto={producto} />
        </span>
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {producto.marca && (
          <span className="etiqueta text-texto-meta text-[10px]">
            {producto.marca.nombre}
          </span>
        )}

        <h3 className="text-texto group-hover:text-cian mt-1 text-sm leading-snug font-medium transition-colors">
          {producto.nombre}
        </h3>

        <div className="mt-auto pt-3">
          <p className="font-display text-ambar tracking-titular text-xl font-semibold">
            {formatearUsd(producto.precio_usd)}
          </p>
          <p className="text-texto-meta mt-0.5 text-xs">
            {tasa !== null
              ? formatearBs(producto.precio_usd, tasa)
              : "Tasa no disponible"}
            {ahorro && ` · ahorras ${formatearUsd(ahorro.monto)}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
