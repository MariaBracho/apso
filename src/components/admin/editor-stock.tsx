"use client";

import { useState, useTransition } from "react";

import { ajustarStock } from "@/app/admin/(panel)/pedidos/acciones";

/**
 * Ajuste rápido de stock desde el listado.
 *
 * El inventario real lo cuenta una persona, y cuadrarlo a mano tiene que ser
 * de un clic. El descuento automático al confirmar un pago cubre la venta;
 * esto cubre todo lo demás: lo que llegó, lo que se rompió, lo que se contó mal.
 */
export function EditorStock({
  id,
  stock,
  nombre,
}: {
  id: string;
  stock: number;
  nombre: string;
}) {
  const [valor, setValor] = useState(String(stock));
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const guardar = () =>
    iniciar(async () => {
      setError(null);
      const numero = Number(valor);
      const resultado = await ajustarStock(id, numero);
      if (resultado && "error" in resultado) {
        setError(resultado.error);
        return;
      }
      setEditando(false);
    });

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setValor(String(stock));
          setEditando(true);
        }}
        aria-label={`Cambiar el stock de ${nombre}, ahora ${stock}`}
        className="text-texto-2 hover:text-cian rounded px-2 py-0.5 transition-colors"
      >
        {stock}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={valor}
        inputMode="numeric"
        disabled={pendiente}
        onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
        onKeyDown={(e) => {
          if (e.key === "Enter") guardar();
          if (e.key === "Escape") setEditando(false);
        }}
        onBlur={guardar}
        aria-label={`Stock de ${nombre}`}
        aria-invalid={error !== null}
        className="bg-superficie-2 border-cian text-texto rounded w-14 border px-2 py-0.5 text-right text-sm outline-none"
      />
      {error && (
        <span role="alert" className="text-error text-xs">
          !
        </span>
      )}
    </span>
  );
}
