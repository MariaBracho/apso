"use client";

import { useActionState } from "react";

import { guardarWhatsapp } from "@/app/(tienda)/perfil/completar/acciones";

export function FormularioWhatsapp({ destino }: { destino: string }) {
  const [estado, accion, pendiente] = useActionState(guardarWhatsapp, undefined);

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="destino" value={destino} />

      <label className="block">
        <span className="text-texto-2 mb-1.5 block text-sm">
          ¿A qué WhatsApp te escribimos?
        </span>
        <div className="flex">
          {/* El prefijo va fijo: apso vende en Venezuela y pedirlo sería
              hacer escribir un dato que ya se sabe. */}
          <span className="border-borde bg-superficie-3 text-texto-2 flex items-center rounded-l-[0.875rem] border border-r-0 px-3.5 text-sm">
            +58
          </span>
          <input
            name="whatsapp"
            required
            autoFocus
            inputMode="numeric"
            maxLength={10}
            placeholder="4246056110"
            autoComplete="tel-national"
            className="bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-cian w-full rounded-r-[0.875rem] border px-3.5 py-2.5 text-sm outline-none"
          />
        </div>
      </label>

      <p className="text-texto-meta text-xs leading-relaxed">
        Es por donde se atiende todo el pedido. No lo usamos para nada más.
      </p>

      {estado?.error && (
        <p role="alert" className="text-error text-sm">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {pendiente ? "Guardando…" : "Listo"}
      </button>
    </form>
  );
}
