"use client";

import { useState } from "react";

import { WHATSAPP_VISIBLE, enlaceWhatsapp } from "@/lib/contacto";

/**
 * Envío del pedido por WhatsApp, con salida para quien no lo tenga instalado.
 *
 * El botón nombra lo que hace —enviar el pedido— y no la app que se abre:
 * «Abrir WhatsApp» sonaba a un paso de más cuando en realidad es el paso que
 * cierra la compra.
 *
 * El caso borde está en el flujo 02: si no puede abrir WhatsApp, se le muestra
 * el mensaje para copiar y el número. El pedido ya quedó registrado igual, así
 * que nadie se queda sin poder comprar por esto.
 */
export function BotonWhatsapp({ mensaje }: { mensaje: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="space-y-3">
      <a
        href={enlaceWhatsapp(mensaje)}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 block w-full px-6 py-3.5 text-center text-sm font-semibold transition-colors"
      >
        Envía tu pedido por WhatsApp
      </a>

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(mensaje);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          } catch {
            setCopiado(false);
          }
        }}
        className="border-borde text-texto-2 hover:border-cian hover:text-cian rounded-pildora block w-full border px-6 py-3 text-sm font-semibold transition-colors"
      >
        {copiado ? "Copiado" : "Copiar el mensaje"}
      </button>

      <p className="text-texto-meta text-center text-xs">
        ¿No te abre WhatsApp? Escríbenos al{" "}
        <span className="text-texto-2">{WHATSAPP_VISIBLE}</span> con el mensaje
        de arriba.
      </p>
    </div>
  );
}
