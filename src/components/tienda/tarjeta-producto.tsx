import Link from "next/link";

import { BadgeDisponibilidad } from "@/components/tienda/badge-disponibilidad";
import { FotoProducto } from "@/components/tienda/foto-producto";
import type { ProductoListado } from "@/lib/producto";
import { preciosDe } from "@/lib/precio";
import { formatearBs, formatearUsd } from "@/lib/formato";

/**
 * Tarjeta del listado.
 *
 * Jerarquía del handoff: el precio en dólares manda (ámbar, Sora), y debajo,
 * en gris pequeño, el precio en bolívares. El bolívar es lo que el cliente
 * venezolano necesita para decidir; el dólar es el precio real.
 *
 * El grande es el de pagar en bolívares porque es el caso común, y es el que
 * multiplicado por la tasa da el monto en bolívares de al lado. El de divisas
 * va debajo como lo que es: más barato por pagar en dólares.
 */
export function TarjetaProducto({
  producto,
  tasa,
  recargo,
}: {
  producto: ProductoListado;
  tasa: number | null;
  recargo: number;
}) {
  const precios = preciosDe(producto.precio_usd, recargo);

  return (
    <Link
      href={`/${producto.categoria.slug}/${producto.slug}`}
      className="group bg-superficie border-borde-sutil hover:border-cian/40 rounded-tarjeta flex flex-col border p-3 transition-colors"
    >
      <div className="relative">
        <FotoProducto
          url={producto.imagenes?.[0]?.url}
          alt={producto.imagenes?.[0]?.alt ?? producto.nombre}
          tamanos="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 45vw"
        />
        <span className="absolute top-2 right-2">
          <BadgeDisponibilidad producto={producto} sobreFoto />
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
            {formatearUsd(precios.bolivares)}
          </p>
          <p className="text-texto-meta mt-0.5 text-xs">
            {tasa !== null
              ? formatearBs(precios.bolivares, tasa)
              : "Tasa no disponible"}
          </p>
          {precios.ahorro > 0 && (
            <p className="text-exito mt-1 text-xs">
              {formatearUsd(precios.divisa)} en divisas
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
