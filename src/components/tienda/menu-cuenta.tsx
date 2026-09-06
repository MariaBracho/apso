"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { salirDeLaCuenta } from "@/app/(tienda)/entrar/acciones";

/**
 * Menú de la cuenta en la barra superior.
 *
 * El avatar antes solo enlazaba a «Mis pedidos», y salir estaba enterrado
 * dentro de esa pantalla. Hacer clic en tu propia foto y encontrar ahí tus
 * pedidos y la salida es lo que espera cualquiera.
 */
export function MenuCuenta({
  nombre,
  esAdmin = false,
}: {
  nombre: string;
  esAdmin?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarFuera = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    };
    const alEscapar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };

    document.addEventListener("mousedown", alPulsarFuera);
    document.addEventListener("keydown", alEscapar);
    return () => {
      document.removeEventListener("mousedown", alPulsarFuera);
      document.removeEventListener("keydown", alEscapar);
    };
  }, [abierto]);

  const iniciales = nombre
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        aria-label={`Tu cuenta, ${nombre}`}
        className="bg-hueso text-violeta font-display flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
      >
        {iniciales}
      </button>

      {abierto && (
        <div
          role="menu"
          className="bg-superficie border-borde rounded-tarjeta absolute right-0 z-40 mt-2 w-56 border p-1.5 shadow-lg"
        >
          <p className="text-texto-meta truncate px-3 py-2 text-xs">{nombre}</p>

          {/* El panel va primero y separado: quien administra la tienda entra
              por aquí a diario, y hasta ahora tenía que escribir /admin a mano. */}
          {esAdmin && (
            <>
              <Link
                href="/admin/pedidos"
                role="menuitem"
                onClick={() => setAbierto(false)}
                className="text-cian hover:bg-superficie-2 block rounded-[10px] px-3 py-2 text-sm transition-colors"
              >
                Ir al panel
              </Link>
              <hr className="border-borde-sutil my-1.5" />
            </>
          )}

          <Link
            href="/mis-pedidos"
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="text-texto-2 hover:bg-superficie-2 hover:text-texto block rounded-[10px] px-3 py-2 text-sm transition-colors"
          >
            Mis pedidos
          </Link>

          <form action={salirDeLaCuenta}>
            <button
              type="submit"
              role="menuitem"
              className="text-texto-2 hover:bg-superficie-2 hover:text-texto block w-full rounded-[10px] px-3 py-2 text-left text-sm transition-colors"
            >
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
