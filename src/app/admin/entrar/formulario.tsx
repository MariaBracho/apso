"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { entrar } from "@/app/admin/entrar/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosEntrada, esquemaEntrada } from "@/lib/esquemas";

export function FormularioEntrada() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosEntrada>({
    resolver: yupResolver(esquemaEntrada),
    defaultValues: { correo: "", clave: "" },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    const resultado = await entrar(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <Campo etiqueta="Correo" error={errors.correo?.message}>
        <input
          {...register("correo")}
          type="email"
          autoComplete="email"
          className={errors.correo ? estiloEntradaMal : estiloEntrada}
        />
      </Campo>

      <Campo etiqueta="Contraseña" error={errors.clave?.message}>
        <input
          {...register("clave")}
          type="password"
          autoComplete="current-password"
          className={errors.clave ? estiloEntradaMal : estiloEntrada}
        />
      </Campo>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
