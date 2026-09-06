"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPCIONES = [
  { valor: "precio-asc", etiqueta: "Precio, menor primero" },
  { valor: "precio-desc", etiqueta: "Precio, mayor primero" },
  { valor: "nuevos", etiqueta: "Lo más nuevo" },
];

export function SelectorOrden() {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="text-texto-meta flex items-center gap-2 text-xs">
      Ordenar por:
      <select
        value={params.get("orden") ?? "precio-asc"}
        onChange={(e) => {
          const siguientes = new URLSearchParams(params.toString());
          siguientes.set("orden", e.target.value);
          router.replace(`?${siguientes.toString()}`, { scroll: false });
        }}
        className="bg-superficie-2 border-borde-sutil text-texto-2 rounded-pildora cursor-pointer border px-3 py-1.5 outline-none"
      >
        {OPCIONES.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
