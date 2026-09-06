"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { guardarWhatsapp } from "@/app/(tienda)/perfil/completar/acciones";
import {
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosWhatsapp, esquemaWhatsapp } from "@/lib/esquemas";

export function FormularioWhatsapp({ destino }: { destino: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosWhatsapp>({
    resolver: yupResolver(esquemaWhatsapp),
    defaultValues: { whatsapp: "" },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    const resultado = await guardarWhatsapp(datos, destino);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <label className="block">
        <span className="text-texto-2 mb-1.5 block text-sm">
          ¿A qué WhatsApp te escribimos?
        </span>
        <div className="flex">
          {/* El prefijo va fijo: apso vende en Venezuela y pedirlo sería
              hacer escribir un dato que ya se sabe. */}
          <span className="border-borde bg-superficie-3 text-texto-2 flex items-center rounded-l-[0.875rem] border border-r-0 px-3.5 text-sm">
            +58
          </span>
          <input
            {...register("whatsapp")}
            autoFocus
            inputMode="numeric"
            maxLength={10}
            placeholder="4246056110"
            autoComplete="tel-national"
            className={`${errors.whatsapp ? estiloEntradaMal : estiloEntrada} rounded-l-none`}
          />
        </div>
        {errors.whatsapp ? (
          <span role="alert" className="text-error mt-1 block text-xs">
            {errors.whatsapp.message}
          </span>
        ) : (
          <span className="text-texto-meta mt-1 block text-xs leading-relaxed">
            Es por donde se atiende todo el pedido. No lo usamos para nada más.
          </span>
        )}
      </label>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Listo"}
      </button>
    </form>
  );
}
