"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  agregarExistencias,
  ajustarStock,
} from "@/app/admin/(panel)/pedidos/acciones";

/**
 * Stock desde el listado, con dos gestos distintos.
 *
 * El número se toca para corregir el total, que es lo que se hace al cuadrar
 * con el conteo físico. El «+» suma lo que acaba de llegar, que es como se
 * piensa al recibir mercancía: no se calcula el nuevo total, se dice cuántas
 * entraron. Los dos quedan en el historial, y ahí sí se distinguen.
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
  const [entrando, setEntrando] = useState(false);
  const [llegaron, setLlegaron] = useState("");
  const [pendiente, iniciar] = useTransition();

  const sumar = () =>
    iniciar(async () => {
      const cuantas = Number(llegaron);
      if (!cuantas) {
        setEntrando(false);
        setLlegaron("");
        return;
      }

      const resultado = await agregarExistencias(id, cuantas);
      if (resultado && "error" in resultado) {
        toast.error(resultado.error);
        return;
      }

      setEntrando(false);
      setLlegaron("");
      toast.success(
        `${nombre}: entraron ${cuantas}, quedan ${stock + cuantas}`,
      );
    });

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

  if (entrando) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-texto-meta text-xs">+</span>
        <input
          autoFocus
          value={llegaron}
          inputMode="numeric"
          disabled={pendiente}
          placeholder="5"
          onChange={(e) => setLlegaron(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") sumar();
            if (e.key === "Escape") {
              setEntrando(false);
              setLlegaron("");
            }
          }}
          onBlur={sumar}
          aria-label={`Cuántas unidades entraron de ${nombre}`}
          className="bg-superficie-2 border-exito text-texto w-14 rounded border px-2 py-0.5 text-right text-sm outline-none"
        />
      </span>
    );
  }

  if (!editando) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setValor(String(stock));
            setEditando(true);
          }}
          aria-label={`Corregir el stock de ${nombre}, ahora ${stock}`}
          className="text-texto-2 hover:text-cian rounded px-2 py-0.5 transition-colors"
        >
          {stock}
        </button>

        <button
          type="button"
          onClick={() => setEntrando(true)}
          title="Sumar unidades que llegaron"
          aria-label={`Sumar unidades que llegaron de ${nombre}`}
          className="text-texto-meta hover:text-exito hover:border-exito border-borde rounded border px-1.5 leading-none transition-colors"
        >
          +
        </button>
      </span>
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
