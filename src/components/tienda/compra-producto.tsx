"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { agregarAlCarrito } from "@/app/(tienda)/carrito/acciones";
import { enlaceWhatsapp } from "@/lib/contacto";
import { formatearBs, formatearUsd } from "@/lib/formato";

/**
 * Cantidad, agregar al carrito y salida directa a WhatsApp.
 *
 * Las dos salidas conviven a propósito: el carrito para quien ya sabe qué
 * quiere, y el chat para quien necesita preguntar. El manual es explícito en
 * que primero se pregunta el uso y después se da el precio, así que preguntar
 * nunca puede ser el camino difícil.
 */
export function CompraProducto({
  productoId,
  nombre,
  precioUsd,
  stock,
  tasa,
}: {
  productoId: string;
  nombre: string;
  precioUsd: number;
  stock: number;
  tasa: number | null;
}) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState(1);
  const [pendiente, iniciar] = useTransition();

  // Sin stock se puede pedir igual: se trae por encargo.
  const tope = stock > 0 ? stock : 99;
  const total = precioUsd * cantidad;

  const mensaje = [
    `Hola, quiero ${cantidad} × ${nombre}.`,
    `Precio en la web: ${formatearUsd(precioUsd)} c/u` +
      (cantidad > 1 ? ` · total ${formatearUsd(total)}` : ""),
    tasa !== null ? `(${formatearBs(total, tasa)} a la tasa de hoy)` : null,
    "",
    "Lo voy a usar para:",
  ]
    .filter((linea) => linea !== null)
    .join("\n");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="border-borde rounded-pildora flex items-center border">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            disabled={cantidad <= 1}
            aria-label="Quitar uno"
            className="text-texto-2 hover:text-texto px-3.5 py-2 text-lg leading-none transition-colors disabled:opacity-30"
          >
            −
          </button>
          <span
            className="font-display text-texto w-8 text-center text-sm font-semibold"
            aria-live="polite"
          >
            {cantidad}
          </span>
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.min(tope, c + 1))}
            disabled={cantidad >= tope}
            aria-label="Agregar uno"
            className="text-texto-2 hover:text-texto px-3.5 py-2 text-lg leading-none transition-colors disabled:opacity-30"
          >
            +
          </button>
        </div>

        {stock > 0 && stock <= 3 && (
          <p className="text-texto-meta text-xs">
            {stock === 1 ? "Queda uno" : `Quedan ${stock}`}
          </p>
        )}
      </div>

      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            const resultado = await agregarAlCarrito(productoId, cantidad);
            if (resultado && "error" in resultado) {
              toast.error(resultado.error);
              return;
            }
            // No se navega al carrito: el flujo 02 dice que tras agregar se
            // puede seguir viendo o ir al carrito. Arrastrar a la persona
            // fuera del catálogo le corta la compra.
            toast.success(
              cantidad === 1 ? "Agregado al carrito" : `${cantidad} agregados al carrito`,
              {
                description: nombre,
                action: {
                  label: "Ver carrito",
                  onClick: () => router.push("/carrito"),
                },
              },
            );
          })
        }
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {pendiente ? "Agregando…" : "Agregar al carrito"}
      </button>

      <a
        href={enlaceWhatsapp(mensaje)}
        target="_blank"
        rel="noopener noreferrer"
        className="border-borde text-texto-2 hover:border-cian hover:text-cian rounded-pildora block w-full border px-6 py-3 text-center text-sm font-semibold transition-colors"
      >
        Preguntar por WhatsApp
      </a>

      <p className="text-texto-meta text-center text-xs">
        Nada se cobra aquí. El pedido se cierra por WhatsApp.
      </p>
    </div>
  );
}
