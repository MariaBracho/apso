"use client";

import { useActionState, useState } from "react";

import { enviarPedido } from "@/app/(tienda)/pedido/acciones";

const METODOS_PAGO = [
  { valor: "pago_movil", etiqueta: "Pago Móvil" },
  { valor: "transferencia_bs", etiqueta: "Transferencia Bs" },
  { valor: "zelle", etiqueta: "Zelle" },
  { valor: "binance", etiqueta: "Binance" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "tarjeta_internacional", etiqueta: "Tarjeta internacional" },
];

export function FormularioPedido() {
  const [estado, accion, pendiente] = useActionState(enviarPedido, undefined);
  const [entrega, setEntrega] = useState<"punto_fijo" | "envio_nacional">(
    "punto_fijo",
  );

  return (
    <form action={accion} className="space-y-9">
      <Seccion titulo="Cómo lo recibes">
        <div className="space-y-2.5">
          <Opcion
            nombre="entrega"
            valor="punto_fijo"
            marcado={entrega === "punto_fijo"}
            alElegir={() => setEntrega("punto_fijo")}
            titulo="Entrega en Punto Fijo"
            detalle="Coordinamos el punto por chat · Gratis"
          />
          <Opcion
            nombre="entrega"
            valor="envio_nacional"
            marcado={entrega === "envio_nacional"}
            alElegir={() => setEntrega("envio_nacional")}
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
              name="ciudad_destino"
              required
              placeholder="Maracaibo"
              className={estiloEntrada}
            />
          </label>
        )}
      </Seccion>

      <Seccion
        titulo="Cómo piensas pagar"
        nota="Es solo para saber qué preparar. Lo acordamos en el chat."
      >
        <div className="flex flex-wrap gap-2">
          {METODOS_PAGO.map((metodo, i) => (
            <label key={metodo.valor} className="cursor-pointer">
              <input
                type="radio"
                name="metodo_pago"
                value={metodo.valor}
                defaultChecked={i === 0}
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
          name="para_que_lo_usa"
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
          <label className="block">
            <span className="text-texto-2 mb-1.5 block text-sm">Tu nombre</span>
            <input
              name="cliente_nombre"
              required
              autoComplete="name"
              className={estiloEntrada}
            />
          </label>

          <label className="block">
            <span className="text-texto-2 mb-1.5 block text-sm">
              Tu WhatsApp
            </span>
            <div className="flex">
              <span className="border-borde bg-superficie-3 text-texto-2 flex items-center rounded-l-[0.875rem] border border-r-0 px-3.5 text-sm">
                +58
              </span>
              <input
                name="whatsapp"
                required
                inputMode="numeric"
                maxLength={10}
                placeholder="4246056110"
                autoComplete="tel-national"
                className={`${estiloEntrada} rounded-l-none`}
              />
            </div>
          </label>

          <label className="block">
            <span className="text-texto-2 mb-1.5 block text-sm">
              Tu correo{" "}
              <span className="text-texto-meta text-xs">(opcional)</span>
            </span>
            <input
              name="cliente_correo"
              type="email"
              autoComplete="email"
              className={estiloEntrada}
            />
          </label>
        </div>
      </Seccion>

      {estado?.error && (
        <p role="alert" className="text-error text-sm">
          {estado.error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={pendiente}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 w-full px-6 py-3.5 text-sm font-semibold transition-colors disabled:opacity-50 sm:w-auto sm:px-10"
        >
          {pendiente ? "Enviando…" : "Enviar mi pedido"}
        </button>
      </div>
    </form>
  );
}

const estiloEntrada =
  "bg-superficie-2 border-borde text-texto placeholder:text-texto-meta focus:border-cian rounded-tarjeta w-full border px-3.5 py-2.5 text-sm outline-none";

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
  nombre,
  valor,
  marcado,
  alElegir,
  titulo,
  detalle,
}: {
  nombre: string;
  valor: string;
  marcado: boolean;
  alElegir: () => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <label
      className={`rounded-tarjeta flex cursor-pointer gap-3 border p-4 transition-colors ${
        marcado ? "border-cian bg-cian/5" : "border-borde hover:border-texto-meta"
      }`}
    >
      <input
        type="radio"
        name={nombre}
        value={valor}
        checked={marcado}
        onChange={alElegir}
        className="accent-cian mt-0.5"
      />
      <span>
        <span className="text-texto block text-sm font-medium">{titulo}</span>
        <span className="text-texto-meta block text-xs">{detalle}</span>
      </span>
    </label>
  );
}
