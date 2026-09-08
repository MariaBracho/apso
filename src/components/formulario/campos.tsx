"use client";

import type { ReactNode } from "react";

/**
 * Piezas compartidas de formulario.
 *
 * El error va pegado al campo que falla, no en un resumen arriba. En un
 * formulario de quince campos, "revisa los datos" obliga a buscar cuál.
 */

export const estiloEntrada =
  "bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-cian rounded-tarjeta w-full border px-3.5 py-2.5 text-sm outline-none";

export const estiloEntradaMal =
  "bg-superficie-2 border-error text-texto placeholder:text-texto-meta rounded-tarjeta w-full border px-3.5 py-2.5 text-sm outline-none";

export function Campo({
  etiqueta,
  ayuda,
  error,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-texto-2 mb-1.5 block text-sm">{etiqueta}</span>
      {children}
      {error ? (
        <span role="alert" className="text-error mt-1 block text-xs">
          {error}
        </span>
      ) : (
        ayuda && (
          <span className="text-texto-meta mt-1 block text-xs">{ayuda}</span>
        )
      )}
    </label>
  );
}

export function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="etiqueta text-texto-3 text-[10px]">{titulo}</h2>
        {nota && (
          <p className="text-texto-meta mt-1.5 text-xs leading-relaxed">
            {nota}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

export function ErrorServidor({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;

  return (
    <p
      role="alert"
      className="border-error/40 bg-error/10 rounded-tarjeta text-texto-2 border p-4 text-sm leading-relaxed"
    >
      {mensaje}
    </p>
  );
}

/** Casilla con su etiqueta al lado, para los sí/no. */
export function Interruptor({
  etiqueta,
  ...props
}: { etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        {...props}
        className="accent-cian h-4 w-4 cursor-pointer"
      />
      <span className="text-texto-2">{etiqueta}</span>
    </label>
  );
}
