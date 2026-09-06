import type { Metadata } from "next";

import { Logo } from "@/components/marca/isotipo";
import { FormularioEntrada } from "@/app/admin/entrar/formulario";

export const metadata: Metadata = {
  title: "Entrar al panel",
};

export default function PaginaEntrar() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Logo />

        <h1 className="font-display text-texto tracking-titular mt-8 text-2xl font-semibold">
          Panel de apso
        </h1>
        <p className="text-texto-2 mt-1.5 text-sm">
          Pedidos, inventario y tasa del día.
        </p>

        <div className="mt-8">
          <FormularioEntrada />
        </div>
      </div>
    </div>
  );
}
