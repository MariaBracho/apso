"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { registrarPedidoManual } from "@/app/admin/(panel)/pedidos/nuevo/acciones";
import {
  Campo,
  ErrorServidor,
  Interruptor,
  Seccion,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import {
  type DatosPedidoManual,
  ORIGENES_MANUALES,
  esquemaPedidoManual,
} from "@/lib/esquemas";
import { formatearUsd } from "@/lib/formato";
import { NOMBRE_PAGO } from "@/lib/pedido";
import { preciosDe, precioSegunPago } from "@/lib/precio";
import { ESTADOS, ciudadesDe } from "@/lib/venezuela";
import { BuscadorClientes } from "@/components/admin/buscador-clientes";

export type ProductoVendible = {
  id: string;
  nombre: string;
  precio_usd: number;
  stock: number;
};

const NOMBRE_ORIGEN: Record<string, string> = {
  mostrador: "En el mostrador",
  whatsapp: "Por WhatsApp",
};

const METODOS = Object.keys(NOMBRE_PAGO);

/**
 * Registrar una venta que ya ocurrió.
 *
 * El pedido queda igual que uno de la web —mismo número, mismo historial,
 * mismos seriales— pero con el origen anotado. Sin eso, cargar las ventas de
 * fuera arreglaría el inventario y rompería la única lectura que hoy es
 * verdad: cuánto está produciendo el sitio.
 */
export function FormularioVenta({
  productos,
  recargo,
}: {
  productos: ProductoVendible[];
  recargo: number;
}) {
  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosPedidoManual>({
    resolver: yupResolver(esquemaPedidoManual),
    defaultValues: {
      origen: "mostrador",
      cliente_nombre: "",
      whatsapp: "",
      cliente_correo: null,
      entrega: "punto_fijo",
      estado_destino: null,
      ciudad_destino: null,
      metodo_pago: "efectivo",
      para_que_lo_usa: null,
      ya_entregado: true,
      items: [],
    },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const entrega = useWatch({ control, name: "entrega" });
  const estado = useWatch({ control, name: "estado_destino" });
  const metodo = useWatch({ control, name: "metodo_pago" });
  const items = useWatch({ control, name: "items" });
  const nombre = useWatch({ control, name: "cliente_nombre" });

  const ciudades = ciudadesDe(estado ?? "");

  /** Lo que costaría según el método elegido, antes de tocarlo. */
  const precioSugerido = (producto: ProductoVendible) =>
    precioSegunPago(preciosDe(producto.precio_usd, recargo), metodo);

  const total = (items ?? []).reduce(
    (suma, item) =>
      suma + (Number(item?.precio_usd) || 0) * (Number(item?.cantidad) || 0),
    0,
  );

  const agregar = (productoId: string) => {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;

    append({
      producto_id: producto.id,
      cantidad: 1,
      precio_usd: precioSugerido(producto),
    });
  };

  /**
   * Al cambiar el método de pago se rehacen los precios de todas las líneas.
   *
   * Se avisa arriba en vez de respetar lo escrito: en divisas y en bolívares el
   * mismo producto vale distinto, y dejar la mezcla convierte el total en un
   * número que no corresponde a ninguno de los dos.
   */
  const recalcular = (nuevoMetodo: string) => {
    getValues("items").forEach((item, i) => {
      const producto = productos.find((p) => p.id === item.producto_id);
      if (!producto) return;

      setValue(
        `items.${i}.precio_usd`,
        precioSegunPago(preciosDe(producto.precio_usd, recargo), nuevoMetodo),
      );
    });
  };

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    const resultado = await registrarPedidoManual(datos);
    if (resultado && "error" in resultado) setErrorServidor(resultado.error);
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-10">
      <Seccion
        titulo="De dónde salió"
        nota="Queda anotado en el pedido. Es lo que después deja separar lo que vende la web de lo que se vende a mano."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Entró por" error={errors.origen?.message}>
            <select
              aria-label="Entró por"
              {...register("origen")}
              className={estiloEntrada}
            >
              {ORIGENES_MANUALES.map((o) => (
                <option key={o} value={o}>
                  {NOMBRE_ORIGEN[o]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta="Cómo pagó"
            ayuda="Cambiarlo rehace los precios de abajo: en divisas y en bolívares no vale lo mismo."
            error={errors.metodo_pago?.message}
          >
            <select
              aria-label="Cómo pagó"
              {...register("metodo_pago", {
                onChange: (e) => recalcular(e.target.value),
              })}
              className={estiloEntrada}
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>
                  {NOMBRE_PAGO[m]}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Seccion>

      <Seccion
        titulo="Qué se llevó"
        nota="El precio viene del catálogo según cómo pagó, pero se puede cambiar: en el mostrador se negocia y el pedido tiene que decir lo que de verdad se cobró."
      >
        <select
          value=""
          onChange={(e) => {
            agregar(e.target.value);
            e.target.value = "";
          }}
          aria-label="Agregar producto"
          className={estiloEntrada}
        >
          <option value="">Agregar producto…</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} · {p.stock} en stock
            </option>
          ))}
        </select>

        {/* El error de «al menos uno» es del arreglo entero, y react-hook-form
            lo guarda en `root`, no en el campo. */}
        {(errors.items?.root?.message ?? errors.items?.message) && (
          <p role="alert" className="text-error mt-2 text-xs">
            {errors.items?.root?.message ?? errors.items?.message}
          </p>
        )}

        {fields.length > 0 && (
          <ul className="border-borde-sutil divide-y rounded-panel border">
            {fields.map((campo, i) => {
              const producto = productos.find(
                (p) => p.id === getValues(`items.${i}.producto_id`),
              );

              return (
                <li key={campo.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-texto truncate text-sm">
                      {producto?.nombre ?? "Producto"}
                    </p>
                    <p className="text-texto-meta text-xs">
                      {producto?.stock ?? 0} en stock
                    </p>
                  </div>

                  <label className="shrink-0">
                    <span className="text-texto-meta mb-1 block text-[10px]">
                      Unidades
                    </span>
                    <input
                      {...register(`items.${i}.cantidad`)}
                      inputMode="numeric"
                      className={`${estiloEntrada} w-16 text-right`}
                    />
                  </label>

                  <label className="shrink-0">
                    <span className="text-texto-meta mb-1 block text-[10px]">
                      Precio c/u
                    </span>
                    <input
                      {...register(`items.${i}.precio_usd`)}
                      inputMode="decimal"
                      className={`${estiloEntrada} w-24 text-right`}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Quitar ${producto?.nombre ?? "el producto"}`}
                    className="text-texto-meta hover:text-error shrink-0 self-end pb-2.5 text-xs transition-colors"
                  >
                    Quitar
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {fields.length > 0 && (
          <p className="text-texto-2 text-right text-sm">
            Total{" "}
            <span className="font-display text-ambar text-lg font-semibold">
              {formatearUsd(total)}
            </span>
          </p>
        )}
      </Seccion>

      <Seccion
        titulo="Quién compró"
        nota="Si ya compró antes, búscalo por nombre o correo y se llena solo. El WhatsApp es opcional, pero sin él la garantía depende de que vuelva con su comprobante."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre" error={errors.cliente_nombre?.message}>
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
                // El número guardado va en E.164 y el campo pide diez dígitos.
                setValue(
                  "whatsapp",
                  cliente.whatsapp?.replace(/^\+58/, "") ?? "",
                );
              }}
            />
          </Campo>

          <Campo
            etiqueta="WhatsApp (opcional)"
            error={errors.whatsapp?.message}
          >
            <div className="flex">
              <span className="border-borde bg-superficie-3 text-texto-2 flex items-center rounded-l-[0.875rem] border border-r-0 px-3.5 text-sm">
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

          <Campo
            etiqueta="Correo (opcional)"
            error={errors.cliente_correo?.message}
          >
            <input
              {...register("cliente_correo")}
              type="email"
              className={
                errors.cliente_correo ? estiloEntradaMal : estiloEntrada
              }
            />
          </Campo>

          <Campo etiqueta="Para qué lo va a usar (opcional)">
            <input {...register("para_que_lo_usa")} className={estiloEntrada} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Cómo lo recibe">
        <div className="grid gap-4 sm:grid-cols-3">
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
              <Campo etiqueta="Estado" error={errors.estado_destino?.message}>
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

              <Campo etiqueta="Ciudad" error={errors.ciudad_destino?.message}>
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
        </div>

        {/* Marcado por defecto: la venta de mostrador ya pasó. Desmarcarlo lo
            deja «Recibido» para recorrer el flujo desde el principio, que es lo
            que hace falta cuando se apartó algo por chat y aún no se paga. */}
        <div className="mt-4">
          <Interruptor
            etiqueta="Ya está pagado y entregado"
            {...register("ya_entregado")}
          />
          <p className="text-texto-meta mt-1.5 max-w-md text-xs leading-relaxed">
            Descuenta el inventario y arranca la garantía hoy. Si todavía no se
            pagó, desmárcalo y el pedido queda como recibido.
          </p>
        </div>
      </Seccion>

      <ErrorServidor mensaje={errorServidor} />

      <div className="border-borde-sutil border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-8 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Registrando…" : "Registrar la venta"}
        </button>
      </div>
    </form>
  );
}
