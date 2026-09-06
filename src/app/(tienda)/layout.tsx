import type { ReactNode } from "react";

import { BarraSuperior } from "@/components/tienda/barra-superior";
import { contarCarrito } from "@/lib/carrito";
import { obtenerCategoriasRaiz, obtenerTasaVigente } from "@/lib/catalogo";
import { obtenerSesion } from "@/lib/sesion";

/** Envoltura de las pantallas de cliente: barra superior con la tasa y pie. */
export default async function LayoutTienda({
  children,
}: {
  children: ReactNode;
}) {
  const [categorias, tasa, enCarrito, sesion] = await Promise.all([
    obtenerCategoriasRaiz(),
    obtenerTasaVigente(),
    contarCarrito(),
    obtenerSesion(),
  ]);

  return (
    <>
      <BarraSuperior
        categorias={categorias}
        tasa={tasa}
        enCarrito={enCarrito}
        sesion={sesion}
      />
      <main className="flex-1">{children}</main>
      <Pie />
    </>
  );
}

function Pie() {
  return (
    <footer className="border-borde-sutil mt-16 border-t">
      <div className="text-texto-meta mx-auto max-w-[1400px] px-6 py-8 text-xs">
        <p>
          apso · Punto Fijo, estado Falcón. Entrega a domicilio y envíos
          nacionales.
        </p>
        <p className="mt-1">
          Precios en dólares. El monto en bolívares se calcula con la tasa del
          día y se confirma al hacer el pedido.
        </p>
      </div>
    </footer>
  );
}
