"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { vaciarCarrito } from "@/app/(tienda)/carrito/acciones";

/**
 * Vaciar el carrito, con confirmación en el propio botón.
 *
 * Se pregunta porque armar un carrito cuesta trabajo y un clic de más lo
 * borraría entero. Se pregunta ahí mismo y no con un `confirm()` del navegador
 * ni un modal: el aviso vive donde está la acción, sin tapar la lista que se
 * está a punto de perder.
 */
export function VaciarCarrito() {
  const [preguntando, setPreguntando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  if (!preguntando) {
    return (
      <button
        type="button"
        onClick={() => setPreguntando(true)}
        className="text-texto-meta hover:text-error text-xs transition-colors"
      >
        Vaciar carrito
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-texto-2">¿Vaciar el carrito?</span>

      <button
        type="button"
        disabled={pendiente}
        onClick={() =>
          iniciar(async () => {
            await vaciarCarrito();
            setPreguntando(false);
            toast("Carrito vacío");
          })
        }
        className="text-error hover:text-error/80 font-medium transition-colors disabled:opacity-50"
      >
        {pendiente ? "Vaciando…" : "Sí, vaciar"}
      </button>

      <button
        type="button"
        disabled={pendiente}
        onClick={() => setPreguntando(false)}
        className="text-texto-meta hover:text-texto transition-colors"
      >
        Cancelar
      </button>
    </div>
  );
}
