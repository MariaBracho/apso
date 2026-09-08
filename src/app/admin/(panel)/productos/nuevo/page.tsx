import type { Metadata } from "next";

import { crearProducto } from "@/app/admin/(panel)/productos/acciones";
import {
  FormularioProducto,
  PRODUCTO_VACIO,
} from "@/components/admin/formulario-producto";
import { listarCategorias, listarMarcas } from "@/lib/admin";
import { obtenerAjustes } from "@/lib/catalogo";

export const metadata: Metadata = { title: "Agregar producto" };

export default async function PaginaNuevoProducto() {
  const [categorias, marcas, { recargo }] = await Promise.all([
    listarCategorias(),
    listarMarcas(),
    obtenerAjustes(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="font-display text-texto tracking-titular mb-8 text-2xl font-semibold">
        Agregar producto
      </h1>

      <FormularioProducto
        accion={crearProducto}
        valores={PRODUCTO_VACIO}
        categorias={categorias}
        marcas={marcas}
        etiquetaEnvio="Publicar producto"
        recargo={recargo}
      />
    </div>
  );
}
