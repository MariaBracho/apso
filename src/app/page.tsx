import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/marca/isotipo";

export const metadata: Metadata = {
  title: "apso — El equipo correcto, al precio real.",
};

/**
 * Bienvenida (flujo 01, paso 1).
 *
 * No hay muro de registro: desde aquí se entra al catálogo completo sin
 * cuenta. La cuenta se pide recién al enviar un pedido, y para entonces ya
 * llega con nombre, correo y WhatsApp adjuntos.
 *
 * Pendiente: el botón "Entrar con Google" aparece cuando esté conectado
 * Supabase Auth — no se dibuja un botón que todavía no lleva a ningún lado.
 */
export default function PaginaBienvenida() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto w-full max-w-[1400px] px-6 py-8">
        <Logo />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
        <h1 className="font-display text-texto tracking-display text-4xl leading-tight font-semibold sm:text-5xl">
          El equipo correcto,
          <br />
          al precio real.
        </h1>

        <p className="text-texto-2 mt-5 text-base leading-relaxed">
          Componentes, laptops y PC a medida traídos de Estados Unidos. Te
          decimos qué necesitas de verdad, y lo que cuesta de verdad.
        </p>

        <ul className="mt-10 space-y-5">
          <Punto
            titulo="Precio sin spread inflado"
            detalle="El margen es el que corresponde, no el que aguanta el mercado."
          />
          <Punto
            titulo="Original de EE. UU."
            detalle="Piezas nuevas y auténticas, con su procedencia clara."
          />
          <Punto
            titulo="Garantía con serial"
            detalle="Guardamos el serial desde el día de la compra. Si algo falla, no tienes que buscar la factura."
          />
        </ul>

        <div className="mt-12">
          <Link
            href="/componentes"
            className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 inline-block px-8 py-3.5 text-sm font-semibold transition-colors"
          >
            Ver la tienda
          </Link>
          <p className="text-texto-meta mt-3 text-xs">
            No hace falta cuenta para ver todo el catálogo.
          </p>
        </div>
      </main>

      <footer className="text-texto-meta mx-auto w-full max-w-[1400px] px-6 py-8 text-xs">
        Punto Fijo, estado Falcón · Entrega a domicilio y envíos nacionales
      </footer>
    </div>
  );
}

function Punto({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <li className="flex gap-3.5">
      <MarcaDeVerificacion />
      <div>
        <p className="text-texto text-sm font-semibold">{titulo}</p>
        <p className="text-texto-2 mt-0.5 text-sm leading-relaxed">{detalle}</p>
      </div>
    </li>
  );
}

/** Trazo de 2 px, extremos rectos, monocromo (manual de marca, §10). */
function MarcaDeVerificacion() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      className="text-cian mt-0.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}
