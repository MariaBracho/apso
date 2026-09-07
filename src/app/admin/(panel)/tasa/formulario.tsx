"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { fijarMargen, fijarTasa } from "@/app/admin/(panel)/tasa/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import {
  type DatosMargen,
  type DatosTasa,
  esquemaMargen,
  esquemaTasa,
} from "@/lib/esquemas";

export function FormularioTasa() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosTasa>({
    resolver: yupResolver(esquemaTasa),
    defaultValues: { valor: 0, fuente: "bcv" },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await fijarTasa(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    reset({ valor: 0, fuente: datos.fuente });
    toast.success(`Tasa fijada en Bs ${datos.valor}`, {
      description: "Ya se ve en toda la tienda.",
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <h2 className="etiqueta text-texto-3 text-[10px]">Fijar tasa nueva</h2>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Campo etiqueta="Bolívares por dólar" error={errors.valor?.message}>
            <input
              {...register("valor")}
              inputMode="decimal"
              placeholder="807,39"
              className={errors.valor ? estiloEntradaMal : estiloEntrada}
            />
          </Campo>
        </div>

        <div className="sm:w-40">
          <Campo etiqueta="Fuente">
            <select {...register("fuente")} className={estiloEntrada}>
              <option value="bcv">BCV</option>
              <option value="promedio">Promedio</option>
              <option value="manual">A mano</option>
            </select>
          </Campo>
        </div>
      </div>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Fijar tasa"}
      </button>
    </form>
  );
}

/**
 * Margen de venta.
 *
 * Es lo que separa la tasa del BCV de la que se cobra. Existe porque la tienda
 * cobra en bolívares pero repone comprando dólares: vender a tasa BCV pelada
 * significa perder la diferencia en cada venta.
 */
export function FormularioMargen({ margen }: { margen: number }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosMargen>({
    resolver: yupResolver(esquemaMargen),
    defaultValues: { margen_tasa_pct: margen },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await fijarMargen(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    toast.success(`Margen fijado en ${datos.margen_tasa_pct} %`, {
      description: "Los precios en bolívares del catálogo ya cambiaron.",
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <h2 className="etiqueta text-texto-3 text-[10px]">Margen de venta</h2>

      <div className="sm:w-56">
        <Campo
          etiqueta="Porcentaje sobre el BCV"
          ayuda="En 0 se vende a tasa BCV pelada."
          error={errors.margen_tasa_pct?.message}
        >
          <input
            {...register("margen_tasa_pct")}
            inputMode="decimal"
            placeholder="19"
            className={
              errors.margen_tasa_pct ? estiloEntradaMal : estiloEntrada
            }
          />
        </Campo>
      </div>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="border-cian text-cian hover:bg-cian hover:text-superficie rounded-pildora border px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Guardar margen"}
      </button>

      <p className="text-texto-meta text-xs leading-relaxed">
        Cambiar esto mueve el precio en bolívares de todo el catálogo de
        inmediato. Los pedidos ya hechos no se tocan: cada uno congeló su tasa
        al enviarse.
      </p>
    </form>
  );
}
