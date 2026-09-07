"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { enviarPedido } from "@/app/(tienda)/pedido/acciones";
import {
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type DatosPedido, esquemaPedido } from "@/lib/esquemas";

const METODOS_PAGO = [
  { valor: "pago_movil", etiqueta: "Pago Móvil" },
  { valor: "transferencia_bs", etiqueta: "Transferencia Bs" },
  { valor: "zelle", etiqueta: "Zelle" },
  { valor: "binance", etiqueta: "Binance" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta_internacional", etiqueta: "Tarjeta internacional" },
] as const;

export function FormularioPedido({
  nombre,
  correo,
}: {
  nombre?: string;
  correo?: string;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosPedido>({
    resolver: yupResolver(esquemaPedido),
    // Si hay sesión, el nombre y el correo llegan de Google y no se vuelven a
    // pedir a mano.
    defaultValues: {
      cliente_nombre: nombre ?? "",
      whatsapp: "",
      cliente_correo: correo ?? null,
      entrega: "punto_fijo",
      ciudad_destino: null,
      metodo_pago: "pago_movil",
      para_que_lo_usa: null,
    },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const entrega = useWatch({ control, name: "entrega" });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    const resultado = await enviarPedido(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-9">
      <Seccion titulo="Cómo lo recibes">
        <div className="space-y-2.5">
          <Opcion
            {...register("entrega")}
            valor="punto_fijo"
            marcado={entrega === "punto_fijo"}
            titulo="Entrega en Punto Fijo"
            detalle="Coordinamos el punto por chat · Gratis"
          />
          <Opcion
            {...register("entrega")}
            valor="envio_nacional"
            marcado={entrega === "envio_nacional"}
            titulo="Envío nacional"
            detalle="Por encomienda. El flete se cotiza por chat antes de pagar."
          />
        </div>

        {entrega === "envio_nacional" && (
          <label className="mt-4 block">
            <span className="text-texto-2 mb-1.5 block text-sm">
              ¿A qué ciudad?
            </span>
            <input
              {...register("ciudad_destino")}
              placeholder="Maracaibo"
              className={
                errors.ciudad_destino ? estiloEntradaMal : estiloEntrada
              }
            />
            {errors.ciudad_destino && (
              <span role="alert" className="text-error mt-1 block text-xs">
                {errors.ciudad_destino.message}
              </span>
            )}
          </label>
        )}
      </Seccion>

      <Seccion
        titulo="Cómo piensas pagar"
        nota="Es solo para saber qué preparar. Lo acordamos en el chat."
      >
        <div className="flex flex-wrap gap-2">
          {METODOS_PAGO.map((metodo) => (
            <label key={metodo.valor} className="cursor-pointer">
              <input
                type="radio"
                value={metodo.valor}
                {...register("metodo_pago")}
                className="peer sr-only"
              />
              <span className="border-borde text-texto-2 peer-checked:border-cian peer-checked:text-cian peer-checked:bg-cian/10 rounded-pildora inline-block border px-4 py-2 text-sm transition-colors">
                {metodo.etiqueta}
              </span>
            </label>
          ))}
        </div>
      </Seccion>

      <Seccion
        titulo="¿Para qué lo vas a usar?"
        nota="No es obligatorio, pero es lo que nos deja responderte bien. Si algo no te va a servir, preferimos decírtelo antes."
      >
        <textarea
          {...register("para_que_lo_usa")}
          rows={3}
          placeholder="Edito video en 4K y se me traba con proyectos largos."
          className={estiloEntrada}
        />
      </Seccion>

      <Seccion
        titulo="Cómo te escribimos"
        nota="El WhatsApp es por donde se atiende todo el pedido."
      >
        <div className="space-y-4">
          {/* Con sesión el nombre es el de la cuenta y no se edita: el pedido
              tiene que llamarse igual que quien lo hizo, o el historial deja de
              cuadrar con la persona. El servidor lo vuelve a leer del perfil,
              así que cambiarlo desde el navegador tampoco serviría de nada. */}
          {nombre ? (
            <div>
              <span className="text-texto-2 mb-1.5 block text-sm">
                Tu nombre
              </span>
              <p className="bg-superficie-2 border-borde text-texto-2 rounded-tarjeta border px-3.5 py-2.5 text-sm">
                {nombre}
              </p>
              <span className="text-texto-meta mt-1 block text-xs">
                Es el de tu cuenta de Google.
              </span>
            </div>
          ) : (
            <label className="block">
              <span className="text-texto-2 mb-1.5 block text-sm">
                Tu nombre
              </span>
              <input
                {...register("cliente_nombre")}
                autoComplete="name"
                className={
                  errors.cliente_nombre ? estiloEntradaMal : estiloEntrada
                }
              />
              {errors.cliente_nombre && (
                <span role="alert" className="text-error mt-1 block text-xs">
                  {errors.cliente_nombre.message}
                </span>
              )}
            </label>
          )}

          <label className="block">
            <span className="text-texto-2 mb-1.5 block text-sm">
              Tu WhatsApp
            </span>
            <div className="flex">
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
            {errors.whatsapp && (
              <span role="alert" className="text-error mt-1 block text-xs">
                {errors.whatsapp.message}
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-texto-2 mb-1.5 block text-sm">
              Tu correo{" "}
              <span className="text-texto-meta text-xs">(opcional)</span>
            </span>
            <input
              {...register("cliente_correo")}
              type="email"
              autoComplete="email"
              className={
                errors.cliente_correo ? estiloEntradaMal : estiloEntrada
              }
            />
            {errors.cliente_correo && (
              <span role="alert" className="text-error mt-1 block text-xs">
                {errors.cliente_correo.message}
              </span>
            )}
          </label>
        </div>
      </Seccion>

      <ErrorServidor mensaje={errorServidor} />

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:w-auto sm:px-10"
        >
          {isSubmitting ? "Enviando…" : "Enviar mi pedido"}
        </button>
      </div>
    </form>
  );
}

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-texto text-base font-semibold">
        {titulo}
      </h2>
      {nota && (
        <p className="text-texto-meta mt-1 mb-4 text-xs leading-relaxed">
          {nota}
        </p>
      )}
      <div className={nota ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function Opcion({
  valor,
  marcado,
  titulo,
  detalle,
  ...props
}: {
  valor: string;
  marcado: boolean;
  titulo: string;
  detalle: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`rounded-tarjeta flex cursor-pointer gap-3 border p-4 transition-colors ${
        marcado ? "border-cian bg-cian/5" : "border-borde hover:border-texto-meta"
      }`}
    >
      <input
        type="radio"
        value={valor}
        {...props}
        className="accent-cian mt-0.5"
      />
      <span>
        <span className="text-texto block text-sm font-medium">{titulo}</span>
        <span className="text-texto-meta block text-xs">{detalle}</span>
      </span>
    </label>
  );
}
