import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { actualizarProducto } from "@/app/admin/(panel)/productos/acciones";
import { FormularioProducto } from "@/components/admin/formulario-producto";
import {
  listarCategorias,
  listarFotos,
  listarMarcas,
  listarMovimientos,
  obtenerProductoAdmin,
} from "@/lib/admin";
import { HistorialInventario } from "@/components/admin/historial-inventario";
import { costoDe } from "@/lib/caja";
import { obtenerAjustes } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Editar producto" };

export default async function PaginaEditarProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [producto, categorias, marcas, fotos, { recargo, comision }, movimientos] =
    await Promise.all([
      obtenerProductoAdmin(id),
      listarCategorias(),
      listarMarcas(),
      listarFotos(id),
      obtenerAjustes(),
      listarMovimientos(id),
    ]);

  if (!producto) notFound();

  // El costo que se muestra es el promedio de hoy: el mismo número que sale en
  // el inventario, para que las dos pantallas no digan cosas distintas.
  const costo = await costoDe(id);

  const slugCategoria = (producto.categoria as { slug: string } | null)?.slug;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          {producto.nombre}
        </h1>
        {producto.activo && slugCategoria && (
          <Link
            href={`/${slugCategoria}/${producto.slug}`}
            className="text-cian hover:text-cian/80 shrink-0 text-sm transition-colors"
          >
            Ver en la tienda ↗
          </Link>
        )}
      </div>

      <FormularioProducto
        accion={actualizarProducto.bind(null, id)}
        valores={{
          nombre: producto.nombre,
          slug: producto.slug,
          categoria_id: producto.categoria_id,
          marca_id: producto.marca_id,
          resumen: producto.resumen,
          descripcion: producto.descripcion,
          especificaciones:
            producto.especificaciones?.length > 0
              ? producto.especificaciones
              : [{ clave: "", valor: "" }],
          precio_usd: Number(producto.precio_usd),
          costo_usd: costo,
          stock: producto.stock,
          dias_encargo: producto.dias_encargo,
          condicion: producto.condicion,
          procedencia: producto.procedencia,
          garantia_respalda: producto.garantia_respalda,
          garantia_meses: producto.garantia_meses,
          garantia_vitalicia: producto.garantia_vitalicia,
          destacado: producto.destacado,
          activo: producto.activo,
        }}
        categorias={categorias}
        marcas={marcas}
        etiquetaEnvio="Guardar cambios"
        productoId={id}
        fotos={fotos}
        recargo={recargo}
        comision={comision}
      />

      <section className="mt-12">
        <h2 className="etiqueta text-texto-3 text-[10px]">
          Historial de inventario
        </h2>
        <p className="text-texto-meta mt-1.5 mb-4 text-xs leading-relaxed">
          Cada cambio de existencias queda aquí. Las unidades que llegan se
          suman desde el «+» del inventario; las ventas se descuentan solas al
          confirmar el pago.
        </p>
        <HistorialInventario movimientos={movimientos} />
      </section>
    </div>
  );
}
