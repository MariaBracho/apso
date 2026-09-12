"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { editarPedido } from "@/app/admin/(panel)/pedidos/acciones";
import { BuscadorClientes } from "@/components/admin/buscador-clientes";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosPedidoEditado, esquemaPedidoEditado } from "@/lib/esquemas";
import { NOMBRE_PAGO, destinoDe } from "@/lib/pedido";
import { ESTADOS, ciudadesDe } from "@/lib/venezuela";

const METODOS = Object.keys(NOMBRE_PAGO);

export type PedidoEditable = {
  id: string;
  cliente_nombre: string;
  cliente_whatsapp: string | null;
  cliente_correo: string | null;
  entrega: string;
  estado_destino: string | null;
  ciudad_destino: string | null;
  metodo_pago: string | null;
  para_que_lo_usa: string | null;
};

/**
 * Los datos del cliente, y la forma de corregirlos.
 *
 * Se equivoca uno tecleando —un nombre, una ciudad, el correo— y hasta ahora
 * la única salida era cancelar una venta que sí ocurrió. Nada de esto mueve
 * dinero, así que arreglarlo no descuadra nada.
 *
 * Las líneas y los precios no están aquí a propósito: de ellos cuelgan el
 * total, el inventario ya descontado y una comisión que puede estar pagada.
 */
export function EditorPedido({ pedido }: { pedido: PedidoEditable }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="space-y-2">
        <dl className="space-y-2 text-sm">
          <Dato termino="Nombre" valor={pedido.cliente_nombre} />
          <Dato
            termino="WhatsApp"
            valor={pedido.cliente_whatsapp ?? "Sin número"}
          />
          {pedido.cliente_correo && (
            <Dato termino="Correo" valor={pedido.cliente_correo} />
          )}
          <Dato termino="Entrega" valor={destinoDe(pedido)} />
          <Dato
            termino="Pago"
            valor={NOMBRE_PAGO[pedido.metodo_pago ?? ""] ?? "Por acordar"}
          />
        </dl>

        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-texto-meta hover:text-cian text-xs underline decoration-dotted underline-offset-2 transition-colors"
        >
          Corregir estos datos
        </button>
      </div>
    );
  }

  return (
    <Formulario pedido={pedido} alTerminar={() => setEditando(false)} />
  );
}

function Formulario({
  pedido,
  alTerminar,
}: {
  pedido: PedidoEditable;
  alTerminar: () => void;
}) {
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosPedidoEditado>({
    resolver: yupResolver(esquemaPedidoEditado),
    defaultValues: {
      cliente_nombre: pedido.cliente_nombre,
      // Guardado va en E.164 y el campo pide los diez dígitos.
      whatsapp: pedido.cliente_whatsapp?.replace(/^\+58/, "") ?? "",
      cliente_correo: pedido.cliente_correo,
      // La base los guarda como enums, así que el valor ya es uno de la
      // lista; TypeScript solo ve el `string` que devuelve la consulta.
      entrega: pedido.entrega as DatosPedidoEditado["entrega"],
      estado_destino: pedido.estado_destino,
      ciudad_destino: pedido.ciudad_destino,
      metodo_pago: pedido.metodo_pago as DatosPedidoEditado["metodo_pago"],
      para_que_lo_usa: pedido.para_que_lo_usa,
    },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const nombre = useWatch({ control, name: "cliente_nombre" });
  const entrega = useWatch({ control, name: "entrega" });
  const estado = useWatch({ control, name: "estado_destino" });

  const ciudades = ciudadesDe(estado ?? "");

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = await editarPedido(pedido.id, datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    toast.success("Datos corregidos");
    alTerminar();
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-3">
      <Campo etiqueta="Nombre del cliente" error={errors.cliente_nombre?.message}>
        <BuscadorClientes
          valor={nombre ?? ""}
          invalido={!!errors.cliente_nombre}
          alEscribir={(v) =>
            setValue("cliente_nombre", v, { shouldValidate: true })
          }
          alElegir={(cliente) => {
            setValue("cliente_nombre", cliente.nombre, {
              shouldValidate: true,
            });
            setValue("cliente_correo", cliente.correo);
            setValue("whatsapp", cliente.whatsapp?.replace(/^\+58/, "") ?? "");
          }}
        />
      </Campo>

      <Campo etiqueta="WhatsApp (opcional)" error={errors.whatsapp?.message}>
        <div className="flex">
          <span className="border-borde bg-superficie-3 text-texto-2 flex items-center rounded-l-[0.875rem] border border-r-0 px-3 text-sm">
            +58
          </span>
          <input
            {...register("whatsapp")}
            inputMode="numeric"
            maxLength={10}
            placeholder="4246056110"
            className={`${errors.whatsapp ? estiloEntradaMal : estiloEntrada} rounded-l-none`}
          />
        </div>
      </Campo>

      <Campo etiqueta="Correo (opcional)" error={errors.cliente_correo?.message}>
        <input
          {...register("cliente_correo")}
          type="email"
          className={errors.cliente_correo ? estiloEntradaMal : estiloEntrada}
        />
      </Campo>

      <Campo etiqueta="Entrega">
        <select
          aria-label="Entrega"
          {...register("entrega")}
          className={estiloEntrada}
        >
          <option value="punto_fijo">En Punto Fijo</option>
          <option value="envio_nacional">Envío nacional</option>
        </select>
      </Campo>

      {entrega === "envio_nacional" && (
        <>
          <Campo etiqueta="Estado de destino" error={errors.estado_destino?.message}>
            <select
              aria-label="Estado de destino"
              {...register("estado_destino", {
                onChange: () => setValue("ciudad_destino", null),
              })}
              className={
                errors.estado_destino ? estiloEntradaMal : estiloEntrada
              }
            >
              <option value="">Elige el estado</option>
              {ESTADOS.map((e) => (
                <option key={e.nombre} value={e.nombre}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Ciudad de destino" error={errors.ciudad_destino?.message}>
            <select
              aria-label="Ciudad de destino"
              {...register("ciudad_destino")}
              disabled={ciudades.length === 0}
              className={`${errors.ciudad_destino ? estiloEntradaMal : estiloEntrada} disabled:opacity-40`}
            >
              <option value="">
                {ciudades.length === 0
                  ? "Elige el estado primero"
                  : "Elige la ciudad"}
              </option>
              {ciudades.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  {ciudad}
                </option>
              ))}
            </select>
          </Campo>
        </>
      )}

      <Campo
        etiqueta="Cómo pagó"
        ayuda="No rehace los precios: los del pedido quedaron congelados al venderse."
        error={errors.metodo_pago?.message}
      >
        <select
          aria-label="Cómo pagó"
          {...register("metodo_pago")}
          className={estiloEntrada}
        >
          <option value="">Por acordar</option>
          {METODOS.map((m) => (
            <option key={m} value={m}>
              {NOMBRE_PAGO[m]}
            </option>
          ))}
        </select>
      </Campo>

      <Campo etiqueta="Para qué lo va a usar (opcional)">
        <input {...register("para_que_lo_usa")} className={estiloEntrada} />
      </Campo>

      <ErrorServidor mensaje={errorServidor} />

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={alTerminar}
          className="text-texto-meta hover:text-texto-2 text-xs transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Dato({ termino, valor }: { termino: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-texto-meta">{termino}</dt>
      <dd className="text-texto-2 text-right">{valor}</dd>
    </div>
  );
}
