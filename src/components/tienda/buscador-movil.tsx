"use client";

import { Suspense, useEffect, useState } from "react";

import { CampoBusqueda } from "@/components/tienda/campo-busqueda";

/**
 * Buscador para pantallas donde el campo no cabe en la barra.
 *
 * Estaba oculto por debajo de 768 px, o sea que quien entra desde el teléfono
 * —la mayoría— no podía buscar nada: le tocaba recorrer el catálogo entero.
 *
 * Va detrás de una lupa y no en una fila fija porque la barra es pegajosa: una
 * fila más le come pantalla a los productos en todas las vistas, para algo que
 * se usa a ratos.
 */
export function BuscadorMovil() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;

    const alEscapar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alEscapar);
    return () => document.removeEventListener("keydown", alEscapar);
  }, [abierto]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Buscar en el catálogo"
        aria-expanded={false}
        className="text-texto-2 hover:text-texto hover:bg-superficie rounded-pildora p-2 transition-colors md:hidden"
      >
        <IconoLupa />
      </button>
    );
  }

  return (
    // El formulario navega solo: es un GET a la misma dirección que usa el
    // buscador de escritorio, así funciona igual sin sesión y sin JavaScript.
    <form
      action="/buscar"
      className="bg-fondo absolute inset-x-0 top-0 z-40 flex h-16 items-center gap-2 px-6 md:hidden"
    >
      <Suspense fallback={<div className="min-w-0 flex-1" />}>
        <CampoBusqueda
          autoFocus
          clase="bg-superficie-2 border-borde-sutil text-texto placeholder:text-texto-meta focus:border-cian rounded-pildora min-w-0 flex-1 border px-4 py-2 text-sm outline-none"
        />
      </Suspense>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        aria-label="Cerrar la búsqueda"
        className="text-texto-meta hover:text-texto shrink-0 px-2 text-sm transition-colors"
      >
        Cancelar
      </button>
    </form>
  );
}

/** Trazo de 2 px, extremos rectos, monocromo (manual de marca, §10). */
function IconoLupa() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16" y1="16" x2="21" y2="21" />
    </svg>
  );
}
