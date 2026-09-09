"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  borrarPago,
  registrarPago,
} from "@/app/admin/(panel)/caja/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import type { PagoDePedido } from "@/lib/caja";
import { type DatosPago, esquemaPago } from "@/lib/esquemas";
import { formatearBs, formatearUsd } from "@/lib/formato";
import { NOMBRE_PAGO } from "@/lib/pedido";
import { esPagoEnDivisa } from "@/lib/precio";

/**
 * Los pagos de un pedido, y lo que falta por cobrar.
 *
 * Hasta ahora «confirmado y pagado» era un botón que alguien pulsaba: detrás
 * no había registro de dinero, así que no se podía cuadrar contra el banco ni
 * saber cuánto hay en caja. Aquí se anota cada cobro con su método, su
 * referencia y la tasa del día.
 */
export function BloquePagos({
  pedidoId,
  totalUsd,
  pagos,
  cobrado,
  tasa,
}: {
  pedidoId: string;
  totalUsd: number;
  pagos: PagoDePedido[];
  cobrado: number;
  tasa: number | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosPago>({
    resolver: yupResolver(esquemaPago),
    defaultValues: { monto: 0, metodo: "efectivo", referencia: null },
    mode: "onBlur",
  });

  const metodo = useWatch({ control, name: "metodo" });
  const enDivisa = esPagoEnDivisa(metodo);

  const falta = Math.round((totalUsd - cobrado) * 100) / 100;

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await registrarPago(pedidoId, datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    reset({ monto: 0, metodo: datos.metodo, referencia: null });
    setAbierto(false);
    toast.success("Pago registrado");
  });

  return (
    <section>
      <h2 className="etiqueta text-texto-3 mb-3 text-[10px]">Pagos</h2>

      <div className="border-borde-sutil rounded-panel border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-texto-2 text-sm">
              Cobrado{" "}
              <span className="font-display text-texto font-semibold">
                {formatearUsd(cobrado)}
              </span>{" "}
              de {formatearUsd(totalUsd)}
            </p>
            {/* Se dice lo que falta y no solo lo cobrado: un pedido a medio
                pagar es lo que hay que ir a cobrar, y con dos cifras sueltas
                esa resta la hace la cabeza cada vez. */}
            {falta > 0 ? (
              <p className="text-ambar text-xs">
                Faltan {formatearUsd(falta)}
              </p>
            ) : falta < 0 ? (
              <p className="text-ambar text-xs">
                Cobrado {formatearUsd(-falta)} de más. Revísalo.
              </p>
            ) : (
              <p className="text-exito text-xs">Cobrado completo</p>
            )}
          </div>

          {!abierto && (
            <button
              type="button"
              onClick={() => setAbierto(true)}
              className="border-cian text-cian hover:bg-cian hover:text-superficie rounded-pildora border px-4 py-1.5 text-xs font-semibold transition-colors"
            >
              Registrar pago
            </button>
          )}
        </div>

        {pagos.length > 0 && (
          <ul className="border-borde-sutil mt-3 divide-y border-t">
            {pagos.map((pago) => (
              <li
                key={pago.id}
                className="flex flex-wrap items-baseline justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="text-texto-2">
                    {NOMBRE_PAGO[pago.metodo] ?? pago.metodo}
                  </span>
                  {pago.referencia && (
                    <span className="text-texto-meta block text-xs">
                      Ref. {pago.referencia}
                    </span>
                  )}
                </span>

                <span className="flex shrink-0 items-baseline gap-3">
                  <span className="text-texto-meta text-xs">
                    {formatearBs(pago.monto_usd, pago.tasa_cambio)} a{" "}
                    {pago.tasa_cambio.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="font-display text-texto font-semibold">
                    {formatearUsd(pago.monto_usd)}
                  </span>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() =>
                      iniciar(async () => {
                        await borrarPago(pago.id, pedidoId);
                        toast("Pago borrado");
                      })
                    }
                    className="text-texto-meta hover:text-error text-xs transition-colors disabled:opacity-30"
                  >
                    Borrar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {abierto && (
          <form
            onSubmit={enviar}
            noValidate
            className="border-borde-sutil mt-4 space-y-3 border-t pt-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Cómo pagó" error={errors.metodo?.message}>
                <select
                  aria-label="Cómo pagó"
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

              {/* El monto se escribe en la moneda del método: nadie convierte
                  a mano un Pago Móvil antes de anotarlo. El servidor lo lleva
                  a dólares con la tasa del día. */}
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

            <Campo
              etiqueta={
                enDivisa && metodo === "efectivo"
                  ? "Referencia (opcional)"
                  : "Referencia"
              }
              ayuda="Es lo que permite detectar un comprobante repetido."
              error={errors.referencia?.message}
            >
              <input
                {...register("referencia")}
                className={errors.referencia ? estiloEntradaMal : estiloEntrada}
              />
            </Campo>

            <ErrorServidor mensaje={errorServidor} />

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Guardando…" : "Guardar pago"}
              </button>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-texto-meta hover:text-texto text-xs transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
