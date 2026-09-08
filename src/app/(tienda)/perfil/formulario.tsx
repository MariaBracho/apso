"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { guardarWhatsapp } from "@/app/(tienda)/perfil/acciones";
import {
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosWhatsapp, esquemaWhatsapp } from "@/lib/esquemas";

/**
 * Cambiar el número de WhatsApp.
 *
 * Es lo único editable del perfil. El nombre y el correo los pone Google y no
 * se tocan: el pedido tiene que llamarse igual que quien lo hizo, y dejar
 * cambiar el correo abriría la puerta a quedarse con la cuenta de otro.
 */
export function FormularioPerfil({ whatsapp }: { whatsapp: string | null }) {
  // Llega en E.164 y se muestra sin el prefijo, que es como se escribe.
  const guardado = whatsapp?.replace(/^\+58/, "") ?? "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DatosWhatsapp>({
    resolver: yupResolver(esquemaWhatsapp),
    defaultValues: { whatsapp: guardado },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await guardarWhatsapp(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    // Se reinicia con lo guardado para que el botón vuelva a apagarse: si
    // sigue encendido parece que el cambio no entró.
    reset({ whatsapp: datos.whatsapp });
    toast.success("Número guardado", {
      description: "Es al que te escribimos por tus pedidos.",
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <label className="block">
        <span className="text-texto-2 mb-1.5 block text-sm">Tu WhatsApp</span>
        <div className="flex">
          {/* El prefijo va fijo: apso vende en Venezuela y pedirlo sería hacer
              escribir un dato que ya se sabe. */}
          <span className="border-borde bg-superficie-3 text-texto-2 flex items-center rounded-l-[0.875rem] border border-r-0 px-3.5 text-sm">
            +58
          </span>
          <input
            {...register("whatsapp")}
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
        disabled={isSubmitting || !isDirty}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
      >
        {isSubmitting ? "Guardando…" : "Guardar número"}
      </button>
    </form>
  );
}
