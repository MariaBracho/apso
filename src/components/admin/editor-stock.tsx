"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

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
  const [pendiente, iniciar] = useTransition();

  const guardar = () =>
    iniciar(async () => {
      const numero = Number(valor);

      if (numero === stock) {
        setEditando(false);
        return;
      }

      const resultado = await ajustarStock(id, numero);
      if (resultado && "error" in resultado) {
        toast.error(resultado.error);
        setValor(String(stock));
        return;
      }

      setEditando(false);
      toast.success(`${nombre}: ${stock} → ${numero} en inventario`);
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
      className="bg-superficie-2 border-cian text-texto w-14 rounded border px-2 py-0.5 text-right text-sm outline-none"
    />
  );
}
