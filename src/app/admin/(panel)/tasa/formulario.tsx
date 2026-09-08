"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { fijarPrecios, fijarTasa } from "@/app/admin/(panel)/tasa/acciones";
import {
  Campo,
  ErrorServidor,
  Interruptor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import {
  type DatosPrecios,
  type DatosTasa,
  esquemaPrecios,
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
 * Los dos precios de la tienda.
 *
 * El recargo existe porque la tienda cobra en bolívares pero repone inventario
 * comprando dólares: a tasa BCV pelada pierde la diferencia en cada venta. Va
 * en el precio y no en la tasa — la tasa del BCV es un dato oficial y tiene
 * que poder contrastarse.
 *
 * El interruptor decide si esa diferencia se anuncia en el catálogo. Van
 * juntos y con un solo botón porque son la misma decisión mirada dos veces:
 * cuánto y si se cuenta.
 */
export function FormularioPrecios({
  recargo,
  mostrarDivisa,
}: {
  recargo: number;
  mostrarDivisa: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosPrecios>({
    resolver: yupResolver(esquemaPrecios),
    defaultValues: {
      recargo_bs_pct: recargo,
      mostrar_precio_divisa: mostrarDivisa,
    },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await fijarPrecios(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    toast.success("Precios guardados", {
      description: datos.mostrar_precio_divisa
        ? `Recargo del ${datos.recargo_bs_pct} % y el precio en divisas a la vista.`
        : `Recargo del ${datos.recargo_bs_pct} %. El precio en divisas no se anuncia.`,
    });
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <h2 className="etiqueta text-texto-3 text-[10px]">
        Precios de la tienda
      </h2>

      <div className="space-y-2">
        <div className="sm:w-56">
          <Campo
            etiqueta="Recargo por pagar en bolívares"
            ayuda="En 0 los dos precios son iguales."
            error={errors.recargo_bs_pct?.message}
          >
            <input
              {...register("recargo_bs_pct")}
              inputMode="decimal"
              placeholder="19"
              className={
                errors.recargo_bs_pct ? estiloEntradaMal : estiloEntrada
              }
            />
          </Campo>
        </div>
        <p className="text-texto-meta max-w-md text-xs leading-relaxed">
          Cambia el precio en bolívares de todo el catálogo de inmediato. El
          precio en divisas no se toca: ese es el que está cargado en cada
          producto. Los pedidos ya hechos tampoco se mueven.
        </p>
      </div>

      <div className="space-y-2">
        <Interruptor
          etiqueta="Anunciar el precio pagando en dólares"
          {...register("mostrar_precio_divisa")}
        />
        <p className="text-texto-meta max-w-md text-xs leading-relaxed">
          Apagado, el catálogo y la ficha muestran un solo precio. Quien pague
          en efectivo, Zelle, Binance o tarjeta sigue pagando el de divisas: el
          carrito y el pedido lo siguen mostrando, porque ahí ya se eligió cómo
          pagar y el número tiene que ser el que se cobra.
        </p>
      </div>

      <ErrorServidor mensaje={errorServidor} />

      <button
        type="submit"
        disabled={isSubmitting}
        className="border-cian text-cian hover:bg-cian hover:text-superficie rounded-pildora border px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {isSubmitting ? "Guardando…" : "Guardar precios"}
      </button>
    </form>
  );
}
