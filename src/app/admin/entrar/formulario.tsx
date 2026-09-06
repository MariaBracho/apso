"use client";

import { useActionState } from "react";

import { entrar } from "@/app/admin/entrar/acciones";

export function FormularioEntrada() {
  const [estado, accion, pendiente] = useActionState(entrar, undefined);

  return (
    <form action={accion} className="space-y-4">
      <Campo etiqueta="Correo" nombre="correo" tipo="email" autoComplete="email" />
      <Campo
        etiqueta="Contraseña"
        nombre="clave"
        tipo="password"
        autoComplete="current-password"
      />

      {estado?.error && (
        <p role="alert" className="text-error text-sm">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

function Campo({
  etiqueta,
  nombre,
  tipo,
  autoComplete,
}: {
  etiqueta: string;
  nombre: string;
  tipo: string;
  autoComplete: string;
}) {
  return (
    <label className="block">
      <span className="etiqueta text-texto-3 mb-2 block text-[10px]">
        {etiqueta}
      </span>
      <input
        type={tipo}
        name={nombre}
        required
        autoComplete={autoComplete}
        className="bg-superficie-2 border-borde text-texto focus:border-cian rounded-tarjeta w-full border px-4 py-3 text-sm outline-none"
      />
    </label>
  );
}
