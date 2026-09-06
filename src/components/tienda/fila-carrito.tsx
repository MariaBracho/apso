"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  cambiarCantidad,
  quitarDelCarrito,
} from "@/app/(tienda)/carrito/acciones";
import { BadgeDisponibilidad } from "@/components/tienda/badge-disponibilidad";
import { FotoProducto } from "@/components/tienda/foto-producto";
import type { ItemCarrito } from "@/lib/carrito";
import { formatearBs, formatearUsd } from "@/lib/formato";

export function FilaCarrito({
  item,
  tasa,
}: {
  item: ItemCarrito;
  tasa: number | null;
}) {
  const [pendiente, iniciar] = useTransition();

  const producto = item.producto;
  const total = producto.precio_usd * item.cantidad;
  // Sin stock no se bloquea el carrito: se puede pedir por encargo. El tope
  // solo aplica a lo que hay en existencia.
  const tope = producto.stock > 0 ? producto.stock : item.cantidad;

  return (
    <li
      className={`bg-superficie border-borde-sutil rounded-tarjeta flex gap-4 border p-4 ${
        pendiente ? "opacity-60" : ""
      }`}
    >
      <div className="w-20 shrink-0">
        <FotoProducto alto="aspect-square" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {producto.marca && (
              <p className="etiqueta text-texto-meta text-[10px]">
                {producto.marca.nombre}
              </p>
            )}
            <Link
              href={`/${producto.categoria.slug}/${producto.slug}`}
              className="text-texto hover:text-cian mt-0.5 block text-sm font-medium transition-colors"
            >
              {producto.nombre}
            </Link>
            <span className="mt-1.5 inline-block">
              <BadgeDisponibilidad producto={producto} />
            </span>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-display text-ambar text-lg font-semibold">
              {formatearUsd(total)}
            </p>
            {tasa !== null && (
              <p className="text-texto-meta text-xs">
                {formatearBs(total, tasa)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4">
          <div className="border-borde rounded-pildora flex items-center border">
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                iniciar(() => cambiarCantidad(item.id, item.cantidad - 1))
              }
              aria-label={`Quitar uno de ${producto.nombre}`}
              className="text-texto-2 hover:text-texto px-3 py-1.5 leading-none transition-colors disabled:opacity-30"
            >
              −
            </button>
            <span className="font-display text-texto w-7 text-center text-sm font-semibold">
              {item.cantidad}
            </span>
            <button
              type="button"
              disabled={pendiente || item.cantidad >= tope}
              onClick={() =>
                iniciar(() => cambiarCantidad(item.id, item.cantidad + 1))
              }
              aria-label={`Agregar uno de ${producto.nombre}`}
              className="text-texto-2 hover:text-texto px-3 py-1.5 leading-none transition-colors disabled:opacity-30"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                await quitarDelCarrito(item.id);
                toast(`${producto.nombre} fuera del carrito`);
              })
            }
            className="text-texto-meta hover:text-error text-xs transition-colors disabled:opacity-30"
          >
            Quitar
          </button>
        </div>
      </div>
    </li>
  );
}
