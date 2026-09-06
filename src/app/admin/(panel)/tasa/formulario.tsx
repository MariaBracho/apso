"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { fijarTasa } from "@/app/admin/(panel)/tasa/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosTasa, esquemaTasa } from "@/lib/esquemas";

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
