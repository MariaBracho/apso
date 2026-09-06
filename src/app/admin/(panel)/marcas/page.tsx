import type { Metadata } from "next";

import { GestorMarcas } from "@/components/admin/gestor-marcas";
import { listarMarcasAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Marcas" };

export default async function PaginaMarcas() {
  const marcas = await listarMarcasAdmin();

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <header className="mb-8">
        <h1 className="font-display text-texto tracking-titular text-2xl font-semibold">
          Marcas
        </h1>
        <p className="text-texto-2 mt-1 text-sm">
          Las que se pueden elegir al cargar un producto. También son el filtro
          «Marca» del catálogo.
        </p>
      </header>

      <GestorMarcas marcas={marcas} />
    </div>
  );
}
