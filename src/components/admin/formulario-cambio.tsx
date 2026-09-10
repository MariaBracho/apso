"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { registrarConversion } from "@/app/admin/(panel)/caja/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosConversion, esquemaConversion } from "@/lib/esquemas";
import { formatearUsd } from "@/lib/formato";
import { NOMBRE_PAGO } from "@/lib/pedido";
import { aUsd, cambioDe, esPagoEnDivisa } from "@/lib/precio";

/**
 * Cambiar plata de un método a otro.
 *
 * La tienda cobra en bolívares a la tasa del BCV y después los cambia a
 * dólares para reponer inventario. Ese cambio no ocurre a la tasa oficial, y
 * la diferencia no aparecía en ningún lado: la caja seguía diciendo que había
 * los dólares del BCV cuando en la mano quedaban menos.
 *
 * Se escriben las dos puntas tal como se ven en cada aplicación. La pérdida y
 * la tasa real se calculan mientras se teclea, que es donde de verdad sirven:
 * antes de guardar, y no en una hoja aparte.
 */
export function FormularioCambio({ tasa }: { tasa: number | null }) {
  const hoy = new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosConversion>({
    resolver: yupResolver(esquemaConversion),
    defaultValues: {
      fecha: hoy,
      metodo_origen: "pago_movil",
      monto_origen: 0,
      metodo_destino: "binance",
      monto_destino: 0,
    },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const origen = useWatch({ control, name: "metodo_origen" });
  const destino = useWatch({ control, name: "metodo_destino" });
  const salio = useWatch({ control, name: "monto_origen" });
  const llego = useWatch({ control, name: "monto_destino" });

  const origenEnDivisa = esPagoEnDivisa(origen);
  const destinoEnDivisa = esPagoEnDivisa(destino);

  const resumen =
    tasa !== null && Number(salio) > 0 && Number(llego) > 0
      ? cambioDe(
          aUsd(Number(salio), origen, tasa),
          tasa,
          aUsd(Number(llego), destino, tasa),
          !origenEnDivisa,
        )
      : null;

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await registrarConversion(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    reset({ ...datos, monto_origen: 0, monto_destino: 0 });
    toast.success("Cambio registrado");
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="sm:w-56">
        <Campo etiqueta="Fecha del cambio" error={errors.fecha?.message}>
          <input
            {...register("fecha")}
            type="date"
            max={hoy}
            className={errors.fecha ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="De dónde salió" error={errors.metodo_origen?.message}>
          <select
            aria-label="De dónde salió el cambio"
            {...register("metodo_origen")}
            className={estiloEntrada}
          >
            {Object.keys(NOMBRE_PAGO).map((m) => (
              <option key={m} value={m}>
                {NOMBRE_PAGO[m]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          etiqueta={origenEnDivisa ? "Cuánto salió ($)" : "Cuánto salió (Bs)"}
          error={errors.monto_origen?.message}
        >
          <input
            {...register("monto_origen")}
            inputMode="decimal"
            className={errors.monto_origen ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>

        <Campo etiqueta="A dónde entró" error={errors.metodo_destino?.message}>
          <select
            aria-label="A dónde entró el cambio"
            {...register("metodo_destino")}
            className={
              errors.metodo_destino ? estiloEntradaMal : estiloEntrada
            }
          >
            {Object.keys(NOMBRE_PAGO).map((m) => (
              <option key={m} value={m}>
                {NOMBRE_PAGO[m]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          etiqueta={destinoEnDivisa ? "Cuánto llegó ($)" : "Cuánto llegó (Bs)"}
          ayuda="Lo que quedó de verdad, no lo que debería haber quedado."
          error={errors.monto_destino?.message}
        >
          <input
            {...register("monto_destino")}
            inputMode="decimal"
            className={errors.monto_destino ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>
      </div>

      {/* La cuenta a la vista antes de guardar: es la que ella estaba haciendo
          con la calculadora, y la tasa real es lo que dice si el recargo del
          catálogo se quedó corto. */}
      {resumen && (
        <p className="border-borde-sutil rounded-tarjeta border p-3 text-sm">
          <span className={resumen.perdida > 0 ? "text-ambar" : "text-exito"}>
            {resumen.perdida > 0 ? "Se pierden " : "Se ganan "}
            <span className="font-display font-semibold">
              {formatearUsd(Math.abs(resumen.perdida))}
            </span>
          </span>
          {resumen.tasaReal !== null && tasa !== null && (
            <span className="text-texto-meta block text-xs leading-relaxed">
              Cambiaste a Bs{" "}
              {resumen.tasaReal.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
              })}{" "}
              por dólar, contra {tasa.toLocaleString("es-VE", { minimumFractionDigits: 2 })} del
              BCV: una brecha del{" "}
              {Math.round((resumen.tasaReal / tasa - 1) * 100)} %. Ese es el
              recargo que necesitarías para no perder vendiendo en bolívares.
            </span>
          )}
        </p>
      )}

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Registrar cambio"}
      </button>
    </form>
  );
}
