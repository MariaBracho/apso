"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { declararCostoInicial } from "@/app/admin/(panel)/pedidos/acciones";
import { formatearUsd } from "@/lib/formato";
import { margenDe } from "@/lib/precio";

/**
 * El margen de un producto, y la forma de cargarle costo si no lo tiene.
 *
 * El costo se carga normalmente al recibir mercancía, con el «+» del stock.
 * Pero lo que ya estaba en el estante antes de que existiera ese campo no
 * tenía dónde declararse, y sin costo no hay margen ni comisión sobre nada de
 * lo que hay hoy. Aquí se declara una vez, sobre las existencias actuales.
 */
export function EditorCosto({
  productoId,
  nombre,
  precioDivisa,
  costo,
  comision,
  stock,
}: {
  productoId: string;
  nombre: string;
  precioDivisa: number;
  costo: number | null;
  comision: number;
  stock: number;
}) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [valor, setValor] = useState("");
  const [pendiente, iniciar] = useTransition();

  const margen = margenDe(precioDivisa, costo, comision);

  const guardar = () => {
    const cuanto = valor.trim() === "" ? null : Number(valor.replace(",", "."));
    setEscribiendo(false);
    setValor("");

    if (cuanto === null || pendiente) return;

    iniciar(async () => {
      const resultado = await declararCostoInicial(productoId, cuanto);

      if (resultado && "error" in resultado) {
        toast.error(resultado.error);
        return;
      }

      toast.success(`${nombre}: costo ${formatearUsd(cuanto)} por unidad`);
    });
  };

  if (escribiendo) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="text-texto-meta text-xs">c/u $</span>
        <input
          autoFocus
          value={valor}
          inputMode="decimal"
          disabled={pendiente}
          placeholder="62"
          onChange={(e) => setValor(e.target.value.replace(/[^0-9.,]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar();
            if (e.key === "Escape") {
              setEscribiendo(false);
              setValor("");
            }
          }}
          onBlur={guardar}
          aria-label={`Cuánto costó cada unidad de ${nombre} que ya tienes`}
          className="bg-superficie-2 border-cian text-texto w-16 rounded border px-2 py-0.5 text-right text-xs outline-none"
        />
      </span>
    );
  }

  if (!margen) {
    // Sin existencias no hay a qué ponerle costo: se carga al recibirlas.
    if (stock === 0) {
      return <span className="text-texto-meta text-xs">Sin costo</span>;
    }

    return (
      <button
        type="button"
        onClick={() => setEscribiendo(true)}
        disabled={pendiente}
        title={`Declarar lo que costaron las ${stock} unidades que ya tienes`}
        className="text-texto-meta hover:text-cian text-xs underline decoration-dotted underline-offset-2 transition-colors"
      >
        Poner costo
      </button>
    );
  }

  // Vender por debajo del costo no es un margen pequeño, es una pérdida, y
  // tiene que saltar a la vista sin leer el número.
  const perdiendo = margen.monto < 0;

  return (
    <>
      <p className={`text-xs ${perdiendo ? "text-error" : "text-texto-meta"}`}>
        {perdiendo ? "−" : "+"}
        {formatearUsd(Math.abs(margen.monto))} · {margen.porcentaje} %
      </p>
      {/* La comisión debajo y con el neto al lado: el margen de arriba es lo
          que deja el producto, y este es lo que le queda a la tienda una vez
          pagada. Verlos separados evita confundir uno con el otro. */}
      {margen.comision > 0 && (
        <p className="text-texto-3 text-[11px]">
          comisión {formatearUsd(margen.comision)} · queda{" "}
          {formatearUsd(margen.neto)}
        </p>
      )}
    </>
  );
}
