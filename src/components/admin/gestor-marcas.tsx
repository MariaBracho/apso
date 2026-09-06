"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  actualizarMarca,
  crearMarca,
  eliminarMarca,
} from "@/app/admin/(panel)/marcas/acciones";
import {
  Campo,
  ErrorServidor,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import type { MarcaAdmin } from "@/lib/admin";
import { type DatosMarca, esquemaMarca } from "@/lib/esquemas";

export function GestorMarcas({ marcas }: { marcas: MarcaAdmin[] }) {
  // La fila en edición se guarda por id y no por índice: la lista se reordena
  // sola al renombrar, y un índice apuntaría a otra marca después de guardar.
  const [editando, setEditando] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <FormularioMarca />

      <section>
        <h2 className="etiqueta text-texto-3 mb-4 text-[10px]">
          {marcas.length} {marcas.length === 1 ? "marca" : "marcas"}
        </h2>

        {marcas.length === 0 ? (
          <p className="text-texto-meta text-sm">
            Todavía no hay marcas. Crea la primera arriba.
          </p>
        ) : (
          <ul className="border-borde-sutil divide-y border-t border-b">
            {marcas.map((marca) =>
              editando === marca.id ? (
                <li key={marca.id} className="py-4">
                  <FormularioMarca
                    marca={marca}
                    alTerminar={() => setEditando(null)}
                  />
                </li>
              ) : (
                <FilaMarca
                  key={marca.id}
                  marca={marca}
                  alEditar={() => setEditando(marca.id)}
                />
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilaMarca({
  marca,
  alEditar,
}: {
  marca: MarcaAdmin;
  alEditar: () => void;
}) {
  const [borrando, setBorrando] = useState(false);

  const borrar = async () => {
    setBorrando(true);
    const resultado = await eliminarMarca(marca.id);
    setBorrando(false);

    if ("error" in resultado) {
      toast.error(resultado.error);
      return;
    }
    toast.success(`Se borró ${marca.nombre}.`);
  };

  return (
    <li className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-texto text-sm">{marca.nombre}</p>
        <p className="text-texto-meta text-xs">
          {marca.slug} ·{" "}
          {marca.productos === 0
            ? "sin productos"
            : `${marca.productos} ${marca.productos === 1 ? "producto" : "productos"}`}
        </p>
      </div>

      <button
        type="button"
        onClick={alEditar}
        className="text-cian hover:text-cian/80 shrink-0 text-xs transition-colors"
      >
        Editar
      </button>

      {/* Sin productos detrás se puede borrar; con productos, la base lo va a
          impedir de todos modos, así que se deshabilita y se dice por qué. */}
      <button
        type="button"
        onClick={borrar}
        disabled={borrando || marca.productos > 0}
        title={
          marca.productos > 0
            ? "Tiene productos asignados. Cámbiales la marca primero."
            : undefined
        }
        className="text-texto-meta hover:text-error shrink-0 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-texto-meta"
      >
        {borrando ? "Borrando…" : "Borrar"}
      </button>
    </li>
  );
}

function FormularioMarca({
  marca,
  alTerminar,
}: {
  marca?: MarcaAdmin;
  alTerminar?: () => void;
}) {
  const editando = marca !== undefined;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DatosMarca>({
    resolver: yupResolver(esquemaMarca),
    defaultValues: {
      nombre: marca?.nombre ?? "",
      slug: marca?.slug ?? "",
    },
    mode: "onBlur",
  });

  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);

    const resultado = editando
      ? await actualizarMarca(marca.id, datos)
      : await crearMarca(datos);

    if ("error" in resultado) {
      setErrorServidor(resultado.error);
      return;
    }

    if (editando) {
      toast.success(`Se guardó ${datos.nombre}.`);
      alTerminar?.();
    } else {
      reset({ nombre: "", slug: "" });
      toast.success(`Se creó ${datos.nombre}.`, {
        description: "Ya se puede elegir al cargar un producto.",
      });
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {!editando && (
        <h2 className="etiqueta text-texto-3 text-[10px]">Marca nueva</h2>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <Campo etiqueta="Nombre" error={errors.nombre?.message}>
            <input
              {...register("nombre")}
              placeholder="Corsair"
              className={errors.nombre ? estiloEntradaMal : estiloEntrada}
            />
          </Campo>
        </div>

        <div className="flex-1">
          <Campo
            etiqueta="Dirección"
            ayuda="Se saca del nombre si lo dejas vacío."
            error={errors.slug?.message}
          >
            <input
              {...register("slug")}
              placeholder="corsair"
              className={errors.slug ? estiloEntradaMal : estiloEntrada}
            />
          </Campo>
        </div>
      </div>

      <ErrorServidor mensaje={errorServidor} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Guardando…" : editando ? "Guardar" : "Crear marca"}
        </button>

        {editando && (
          <button
            type="button"
            onClick={alTerminar}
            className="text-texto-meta hover:text-texto text-sm transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
