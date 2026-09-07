"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { fijarRecargo, fijarTasa } from "@/app/admin/(panel)/tasa/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import {
  type DatosRecargo,
  type DatosTasa,
  esquemaRecargo,
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
 * Recargo por pagar en bolívares.
 *
 * Existe porque la tienda cobra en bolívares pero repone inventario comprando
 * dólares: a tasa BCV pelada pierde la diferencia en cada venta. Va en el
 * precio y no en la tasa — la tasa del BCV es un dato oficial y tiene que
 * poder contrastarse.
 */
export function FormularioRecargo({ recargo }: { recargo: number }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosRecargo>({
    resolver: yupResolver(esquemaRecargo),
    defaultValues: { recargo_bs_pct: recargo },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await fijarRecargo(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    toast.success(`Recargo fijado en ${datos.recargo_bs_pct} %`, {
      description: "Los precios en bolívares del catálogo ya cambiaron.",
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <h2 className="etiqueta text-texto-3 text-[10px]">
        Recargo por pagar en bolívares
      </h2>

      <div className="sm:w-56">
        <Campo
          etiqueta="Porcentaje sobre el precio"
          ayuda="En 0 los dos precios son iguales."
          error={errors.recargo_bs_pct?.message}
        >
          <input
            {...register("recargo_bs_pct")}
            inputMode="decimal"
            placeholder="19"
            className={errors.recargo_bs_pct ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>
      </div>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="border-cian text-cian hover:bg-cian hover:text-superficie rounded-pildora border px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Guardar recargo"}
      </button>

      <p className="text-texto-meta text-xs leading-relaxed">
        Cambia el precio en bolívares de todo el catálogo de inmediato. El
        precio en divisas no se toca: ese es el que está cargado en cada
        producto. Los pedidos ya hechos tampoco se mueven.
      </p>
    </form>
  );
}
