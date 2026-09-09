"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { registrarGasto } from "@/app/admin/(panel)/caja/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosGasto, esquemaGasto } from "@/lib/esquemas";
import { CATEGORIAS_GASTO, NOMBRE_GASTO } from "@/lib/gasto";
import { NOMBRE_PAGO } from "@/lib/pedido";
import { esPagoEnDivisa } from "@/lib/precio";

/**
 * Anotar un gasto.
 *
 * El monto va en la moneda del método, igual que en los pagos: nadie convierte
 * a mano un Pago Móvil antes de anotarlo. La fecha la pone quien carga y no es
 * la de hoy, porque los gastos se anotan en lote y con `now()` todos caerían
 * el mismo día — que es justo lo que impide después leer un mes.
 */
export function FormularioGasto({ tasa }: { tasa: number | null }) {
  const hoy = new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosGasto>({
    resolver: yupResolver(esquemaGasto),
    defaultValues: {
      fecha: hoy,
      categoria: "flete_internacional",
      descripcion: "",
      monto: 0,
      metodo: "efectivo",
    },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const metodo = useWatch({ control, name: "metodo" });
  const enDivisa = esPagoEnDivisa(metodo);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await registrarGasto(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    reset({
      fecha: datos.fecha,
      categoria: datos.categoria,
      descripcion: "",
      monto: 0,
      metodo: datos.metodo,
    });
    toast.success("Gasto anotado");
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Fecha del gasto" error={errors.fecha?.message}>
          <input
            {...register("fecha")}
            type="date"
            max={hoy}
            className={errors.fecha ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>

        <Campo etiqueta="Categoría" error={errors.categoria?.message}>
          <select
            aria-label="Categoría del gasto"
            {...register("categoria")}
            className={estiloEntrada}
          >
            {CATEGORIAS_GASTO.map((c) => (
              <option key={c} value={c}>
                {NOMBRE_GASTO[c]}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        etiqueta="En qué se gastó"
        ayuda="Concreto: dentro de un mes esto es lo único que va a quedar."
        error={errors.descripcion?.message}
      >
        <input
          {...register("descripcion")}
          placeholder="Flete del lote de RAM de septiembre"
          className={errors.descripcion ? estiloEntradaMal : estiloEntrada}
        />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="De dónde salió" error={errors.metodo?.message}>
          <select
            aria-label="De dónde salió la plata"
            {...register("metodo")}
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
          etiqueta={enDivisa ? "Monto en dólares" : "Monto en bolívares"}
          ayuda={
            enDivisa
              ? undefined
              : tasa === null
                ? "Sin tasa cargada no se puede convertir."
                : `Se guarda a Bs ${tasa.toLocaleString("es-VE", { minimumFractionDigits: 2 })} por dólar.`
          }
          error={errors.monto?.message}
        >
          <input
            {...register("monto")}
            inputMode="decimal"
            className={errors.monto ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>
      </div>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Anotar gasto"}
      </button>
    </form>
  );
}
