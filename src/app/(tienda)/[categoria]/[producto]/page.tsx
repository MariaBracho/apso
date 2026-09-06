import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/tienda/banda-asesoria";
import { BadgeDisponibilidad } from "@/components/tienda/badge-disponibilidad";
import { CompraProducto } from "@/components/tienda/compra-producto";
import { FotoProducto } from "@/components/tienda/foto-producto";
import {
  type ProductoFicha,
  obtenerCategoriaPorId,
  obtenerCategoriaPorSlug,
  obtenerProductoPorSlug,
  obtenerTasaVigente,
} from "@/lib/catalogo";
import { ASESOR, enlaceWhatsapp } from "@/lib/contacto";
import { calcularAhorro, formatearBs, formatearUsd } from "@/lib/formato";

type Params = { categoria: string; producto: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { producto: slug } = await params;
  const producto = await obtenerProductoPorSlug(slug);

  if (!producto) return { title: "Producto no encontrado" };

  return {
    title: producto.nombre,
    description: producto.resumen ?? undefined,
  };
}

export default async function PaginaProducto({
  params,
}: {
  params: Promise<Params>;
}) {
  const { producto: slugProducto } = await params;

  const producto = await obtenerProductoPorSlug(slugProducto);
  if (!producto) notFound();

  const [categoria, tasa] = await Promise.all([
    obtenerCategoriaPorSlug(producto.categoria.slug),
    obtenerTasaVigente(),
  ]);

  const padre = categoria?.padre_id
    ? await obtenerCategoriaPorId(categoria.padre_id)
    : null;

  return (
    <div className="mx-auto max-w-[1400px] px-6 py-8">
      <Miga producto={producto} padre={padre} />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px]">
        <Galeria producto={producto} />

        {/* La columna de decisión se queda fija: precio, ahorro y con quién
            hablar siguen a la vista mientras se leen las especificaciones. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PanelCompra producto={producto} tasa={tasa} />
        </div>
      </div>
    </div>
  );
}

function Miga({
  producto,
  padre,
}: {
  producto: ProductoFicha;
  padre: { slug: string; nombre: string } | null;
}) {
  return (
    <nav aria-label="Ruta" className="text-texto-meta flex flex-wrap gap-2 text-xs">
      {padre && (
        <>
          <Link href={`/${padre.slug}`} className="hover:text-texto-2 transition-colors">
            {padre.nombre}
          </Link>
          <span aria-hidden="true">›</span>
        </>
      )}
      <Link
        href={`/${producto.categoria.slug}`}
        className="hover:text-texto-2 transition-colors"
      >
        {producto.categoria.nombre}
      </Link>
      <span aria-hidden="true">›</span>
      <span className="text-texto-2">{producto.nombre}</span>
    </nav>
  );
}

function Galeria({ producto }: { producto: ProductoFicha }) {
  return (
    <div>
      {/* La foto se acota: sin tope, en pantallas anchas la columna estira el
          4/3 hasta empujar las especificaciones fuera de la vista. */}
      <div className="flex max-w-[620px] gap-4">
        {/* La columna de miniaturas solo aparece si hay más de una foto: con
            una sola, repetir el mismo recuadro tres veces no aporta nada. */}
        {producto.imagenes.length > 1 && (
          <div className="hidden w-20 shrink-0 flex-col gap-3 sm:flex">
            {producto.imagenes.slice(0, 4).map((imagen, i) => (
              <FotoProducto
                key={imagen.url}
                url={imagen.url}
                alt={imagen.alt ?? `${producto.nombre}, foto ${i + 1}`}
                alto="aspect-square"
                tamanos="80px"
              />
            ))}
          </div>
        )}

        <div className="relative min-w-0 flex-1">
          <FotoProducto
            url={producto.imagenes[0]?.url}
            alt={producto.imagenes[0]?.alt ?? producto.nombre}
            alto="aspect-[4/3]"
            prioridad
            tamanos="(min-width: 640px) 520px, 100vw"
          />
          <span className="absolute top-4 left-4">
            <BadgeDisponibilidad producto={producto} detallado sobreFoto />
          </span>
        </div>
      </div>

      {producto.descripcion && (
        <p className="text-texto-2 mt-8 max-w-2xl text-sm leading-relaxed">
          {producto.descripcion}
        </p>
      )}

      <Especificaciones producto={producto} />
    </div>
  );
}

function Especificaciones({ producto }: { producto: ProductoFicha }) {
  const entradas = producto.especificaciones ?? [];

  return (
    <section className="mt-8">
      <h2 className="etiqueta text-texto-3 mb-4 text-[10px]">
        Especificaciones
      </h2>

      <dl className="border-borde-sutil max-w-2xl divide-y border-t border-b">
        {entradas.map(({ clave, valor }) => (
          <div key={clave} className="flex justify-between gap-6 py-2.5 text-sm">
            <dt className="text-texto-meta">{clave}</dt>
            <dd className="text-texto-2 text-right">{valor}</dd>
          </div>
        ))}

        <div className="flex justify-between gap-6 py-2.5 text-sm">
          <dt className="text-texto-meta">Garantía</dt>
          <dd className="text-texto-2 text-right">{textoGarantia(producto)}</dd>
        </div>

        <div className="flex justify-between gap-6 py-2.5 text-sm">
          <dt className="text-texto-meta">Procedencia</dt>
          <dd className="text-texto-2 text-right">
            {producto.condicion === "nuevo" ? "Nuevo" : "Reacondicionado"}, de{" "}
            {producto.procedencia}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function textoGarantia(producto: ProductoFicha): string {
  if (producto.garantia_vitalicia) return "De por vida, del fabricante";
  if (producto.garantia_meses === null) return "Consultar con el fabricante";

  const años = producto.garantia_meses / 12;
  if (Number.isInteger(años) && años >= 1) {
    return `${años} ${años === 1 ? "año" : "años"}, del fabricante`;
  }
  return `${producto.garantia_meses} meses, del fabricante`;
}

function PanelCompra({
  producto,
  tasa,
}: {
  producto: ProductoFicha;
  tasa: number | null;
}) {
  const ahorro = calcularAhorro(
    producto.precio_usd,
    producto.precio_referencia_usd,
  );

  return (
    <div className="space-y-6">
      <div>
        {producto.marca && (
          <p className="etiqueta text-texto-meta text-[10px]">
            {producto.marca.nombre}
          </p>
        )}
        <h1 className="font-display text-texto tracking-titular mt-1.5 text-2xl leading-tight font-semibold">
          {producto.nombre}
        </h1>
        {producto.resumen && (
          <p className="text-texto-2 mt-2 text-sm leading-relaxed">
            {producto.resumen}
          </p>
        )}
      </div>

      <div>
        <p className="font-display text-ambar tracking-display text-4xl font-semibold">
          {formatearUsd(producto.precio_usd)}
        </p>
        {tasa !== null && (
          <p className="text-texto-meta mt-1 text-sm">
            {formatearBs(producto.precio_usd, tasa)} a la tasa de hoy
          </p>
        )}
      </div>

      {ahorro && (
        <BloqueAhorro
          precioReferencia={producto.precio_referencia_usd!}
          precio={producto.precio_usd}
          ahorro={ahorro.monto}
        />
      )}

      <CompraProducto
        productoId={producto.id}
        nombre={producto.nombre}
        precioUsd={producto.precio_usd}
        stock={producto.stock}
        tasa={tasa}
      />

      <TarjetaAsesor nombreProducto={producto.nombre} />
    </div>
  );
}

/**
 * El bloque de ahorro: la diferencia es la comisión que aquí no se paga.
 * Se explica el porqué en vez de gritar un descuento — la promesa de marca es
 * decir lo que cuesta de verdad.
 */
function BloqueAhorro({
  precioReferencia,
  precio,
  ahorro,
}: {
  precioReferencia: number;
  precio: number;
  ahorro: number;
}) {
  return (
    <div className="bg-superficie-alta rounded-tarjeta p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-texto-3">Con comisión de plataforma</span>
        <span className="text-texto-meta line-through">
          {formatearUsd(precioReferencia)}
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="text-texto">Comprando aquí</span>
        <span className="font-display text-texto font-semibold">
          {formatearUsd(precio)}
        </span>
      </div>

      <p className="border-borde text-exito mt-3 border-t pt-3 text-sm font-medium">
        Aquí ahorras {formatearUsd(ahorro)}
      </p>
      <p className="text-texto-meta mt-1 text-xs leading-relaxed">
        Es el mismo producto. La diferencia es la comisión que aquí no pagas.
      </p>
    </div>
  );
}

function TarjetaAsesor({ nombreProducto }: { nombreProducto: string }) {
  return (
    <div className="bg-superficie rounded-tarjeta border-borde-sutil flex items-center gap-3 border p-4">
      <Avatar iniciales={ASESOR.iniciales} />

      <div className="min-w-0 flex-1">
        {/* Nombre completo aquí, de pila en el resto: en la ficha se está
            decidiendo una compra y el apellido da respaldo; en el saludo del
            chat sonaría acartonado. */}
        <p className="text-texto text-sm font-medium">
          {ASESOR.nombreCompleto}, de apso
        </p>
        <p className="text-exito text-xs">En línea ahora</p>
      </div>

      <a
        href={enlaceWhatsapp(
          `Hola ${ASESOR.nombre}, tengo una duda sobre el ${nombreProducto}.`,
        )}
        target="_blank"
        rel="noopener noreferrer"
        className="border-cian text-cian hover:bg-cian hover:text-superficie rounded-pildora shrink-0 border px-4 py-2 text-xs font-semibold transition-colors"
      >
        Escribir
      </a>
    </div>
  );
}
