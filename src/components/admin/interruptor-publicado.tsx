"use client";

import { useTransition } from "react";

import { alternarPublicado } from "@/app/admin/(panel)/productos/acciones";

/**
 * Publica o despublica sin salir del listado. No hay borrar: un producto
 * borrado se lleva por delante el historial de quien lo compró.
 */
export function InterruptorPublicado({
  id,
  activo,
  nombre,
}: {
  id: string;
  activo: boolean;
  nombre: string;
}) {
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={`${activo ? "Ocultar" : "Mostrar"} ${nombre} en la tienda`}
      disabled={pendiente}
      onClick={() => iniciar(() => alternarPublicado(id, !activo))}
      className={`rounded-pildora inline-flex h-5 w-9 items-center transition-colors disabled:opacity-50 ${
        activo ? "bg-cian" : "bg-superficie-3"
      }`}
    >
      <span
        className={`bg-hueso h-3.5 w-3.5 rounded-full transition-transform ${
          activo ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}
