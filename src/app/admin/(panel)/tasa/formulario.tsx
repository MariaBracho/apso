"use client";

import { useActionState } from "react";

import { fijarTasa } from "@/app/admin/(panel)/tasa/acciones";

export function FormularioTasa() {
  const [estado, accion, pendiente] = useActionState(fijarTasa, undefined);

  return (
    <form action={accion} className="space-y-4">
      <h2 className="etiqueta text-texto-3 text-[10px]">Fijar tasa nueva</h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="text-texto-2 mb-1.5 block text-sm">
            Bolívares por dólar
          </span>
          <input
            name="valor"
            required
            inputMode="decimal"
            placeholder="36,50"
            className="bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-cian rounded-tarjeta w-full border px-3.5 py-2.5 text-sm outline-none"
          />
        </label>

        <label className="sm:w-40">
          <span className="text-texto-2 mb-1.5 block text-sm">Fuente</span>
          <select
            name="fuente"
            defaultValue="bcv"
            className="bg-superficie-2 border-borde text-texto focus:border-cian rounded-tarjeta w-full border px-3.5 py-2.5 text-sm outline-none"
          >
            <option value="bcv">BCV</option>
            <option value="promedio">Promedio</option>
            <option value="manual">A mano</option>
          </select>
        </label>
      </div>

      {estado && "error" in estado && (
        <p role="alert" className="text-error text-sm">
          {estado.error}
        </p>
      )}
      {estado && "ok" in estado && (
        <p role="status" className="text-exito text-sm">
          Tasa actualizada. Ya se ve en toda la tienda.
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {pendiente ? "Guardando…" : "Fijar tasa"}
      </button>
    </form>
  );
}
