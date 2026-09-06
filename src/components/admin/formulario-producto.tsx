"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { EstadoProducto } from "@/app/admin/(panel)/productos/acciones";
import type { Especificacion } from "@/lib/producto";
import { generarSlug } from "@/lib/texto";

export type OpcionSelect = { id: string; nombre: string };

export type ValoresProducto = {
  nombre: string;
  slug: string;
  categoria_id: string;
  marca_id: string | null;
  resumen: string | null;
  descripcion: string | null;
  especificaciones: Especificacion[];
  precio_usd: number | null;
  precio_referencia_usd: number | null;
  stock: number;
  dias_encargo: number | null;
  condicion: "nuevo" | "reacondicionado";
  garantia_meses: number | null;
  garantia_vitalicia: boolean;
  destacado: boolean;
  activo: boolean;
};

export const PRODUCTO_VACIO: ValoresProducto = {
  nombre: "",
  slug: "",
  categoria_id: "",
  marca_id: null,
  resumen: null,
  descripcion: null,
  especificaciones: [],
  precio_usd: null,
  precio_referencia_usd: null,
  stock: 0,
  dias_encargo: null,
  condicion: "nuevo",
  garantia_meses: null,
  garantia_vitalicia: false,
  destacado: false,
  activo: true,
};

export function FormularioProducto({
  accion,
  valores,
  categorias,
  marcas,
  etiquetaEnvio,
}: {
  accion: (estado: EstadoProducto, datos: FormData) => Promise<EstadoProducto>;
  valores: ValoresProducto;
  categorias: OpcionSelect[];
  marcas: OpcionSelect[];
  etiquetaEnvio: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, undefined);

  const [nombre, setNombre] = useState(valores.nombre);
  const [slug, setSlug] = useState(valores.slug);
  const [slugTocado, setSlugTocado] = useState(valores.slug !== "");
  const [vitalicia, setVitalicia] = useState(valores.garantia_vitalicia);
  const [especs, setEspecs] = useState<Especificacion[]>(
    valores.especificaciones.length > 0
      ? valores.especificaciones
      : [{ clave: "", valor: "" }],
  );

  return (
    <form action={enviar} className="max-w-2xl space-y-8">
      <Seccion titulo="Identificación">
        <Campo etiqueta="Nombre">
          <input
            name="nombre"
            required
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              // La dirección se propone sola, pero deja de seguir al nombre en
              // cuanto se toca a mano: cambiar la dirección de un producto ya
              // publicado rompe los enlaces que la gente guardó.
              if (!slugTocado) setSlug(generarSlug(e.target.value));
            }}
            className={estiloEntrada}
          />
        </Campo>

        <Campo
          etiqueta="Dirección en la web"
          ayuda={slug ? `apso.com.ve/…/${slug}` : "Se propone sola desde el nombre"}
        >
          <input
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTocado(true);
            }}
            className={estiloEntrada}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Categoría">
            <select
              name="categoria_id"
              required
              defaultValue={valores.categoria_id}
              className={estiloEntrada}
            >
              <option value="">Elegir…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Marca">
            <select
              name="marca_id"
              defaultValue={valores.marca_id ?? ""}
              className={estiloEntrada}
            >
              <option value="">Sin marca</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Seccion>

      <Seccion
        titulo="Precio"
        nota="El precio de referencia es lo que cuesta en un marketplace con comisión. Es el número tachado del bloque de ahorro; déjalo vacío si no hay comparación honesta que hacer."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Precio en dólares">
            <input
              name="precio_usd"
              required
              inputMode="decimal"
              defaultValue={valores.precio_usd ?? ""}
              className={estiloEntrada}
            />
          </Campo>
          <Campo etiqueta="Precio de referencia">
            <input
              name="precio_referencia_usd"
              inputMode="decimal"
              defaultValue={valores.precio_referencia_usd ?? ""}
              className={estiloEntrada}
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion
        titulo="Disponibilidad"
        nota="Con stock en cero y un plazo de encargo, la tienda lo muestra como «Por pedido · N días». Sin plazo, dice «Sin stock» y no promete nada."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Stock">
            <input
              name="stock"
              inputMode="numeric"
              defaultValue={valores.stock}
              className={estiloEntrada}
            />
          </Campo>
          <Campo etiqueta="Plazo de encargo (días)">
            <input
              name="dias_encargo"
              inputMode="numeric"
              defaultValue={valores.dias_encargo ?? ""}
              className={estiloEntrada}
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Ficha">
        <Campo etiqueta="Resumen" ayuda="Una línea. Sale en la tarjeta y bajo el título.">
          <input
            name="resumen"
            maxLength={200}
            defaultValue={valores.resumen ?? ""}
            className={estiloEntrada}
          />
        </Campo>

        <Campo etiqueta="Descripción">
          <textarea
            name="descripcion"
            rows={3}
            defaultValue={valores.descripcion ?? ""}
            className={estiloEntrada}
          />
        </Campo>

        <Campo
          etiqueta="Especificaciones"
          ayuda="Se muestran en este orden, así que pon primero lo que decide la compra."
        >
          <div className="space-y-2">
            {especs.map((espec, i) => (
              <div key={i} className="flex gap-2">
                <input
                  name="espec_clave"
                  placeholder="Capacidad"
                  value={espec.clave}
                  onChange={(e) =>
                    setEspecs((lista) =>
                      lista.map((x, j) =>
                        j === i ? { ...x, clave: e.target.value } : x,
                      ),
                    )
                  }
                  className={`${estiloEntrada} w-2/5`}
                />
                <input
                  name="espec_valor"
                  placeholder="2 × 16 GB"
                  value={espec.valor}
                  onChange={(e) =>
                    setEspecs((lista) =>
                      lista.map((x, j) =>
                        j === i ? { ...x, valor: e.target.value } : x,
                      ),
                    )
                  }
                  className={`${estiloEntrada} flex-1`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setEspecs((lista) => lista.filter((_, j) => j !== i))
                  }
                  aria-label={`Quitar la fila ${i + 1}`}
                  className="text-texto-meta hover:text-error px-2 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setEspecs((lista) => [...lista, { clave: "", valor: "" }])
              }
              className="text-cian hover:text-cian/80 text-xs transition-colors"
            >
              + Agregar especificación
            </button>
          </div>
        </Campo>
      </Seccion>

      <Seccion titulo="Procedencia y garantía">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Condición">
            <select
              name="condicion"
              defaultValue={valores.condicion}
              className={estiloEntrada}
            >
              <option value="nuevo">Nuevo</option>
              <option value="reacondicionado">Reacondicionado</option>
            </select>
          </Campo>

          <Campo etiqueta="Garantía (meses)">
            <input
              name="garantia_meses"
              inputMode="numeric"
              disabled={vitalicia}
              defaultValue={valores.garantia_meses ?? ""}
              className={`${estiloEntrada} disabled:opacity-40`}
            />
          </Campo>
        </div>

        <Interruptor
          nombre="garantia_vitalicia"
          etiqueta="Garantía de por vida"
          marcado={vitalicia}
          alCambiar={setVitalicia}
        />
      </Seccion>

      <Seccion titulo="Publicación">
        <Interruptor
          nombre="activo"
          etiqueta="Visible en la tienda"
          predeterminado={valores.activo}
        />
        <Interruptor
          nombre="destacado"
          etiqueta="Destacado"
          predeterminado={valores.destacado}
        />
      </Seccion>

      {estado?.error && (
        <p role="alert" className="text-error text-sm">
          {estado.error}
        </p>
      )}

      <div className="border-borde-sutil flex items-center gap-3 border-t pt-6">
        <button
          type="submit"
          disabled={pendiente}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : etiquetaEnvio}
        </button>
        <Link
          href="/admin/productos"
          className="text-texto-2 hover:text-texto px-3 text-sm transition-colors"
        >
          Cancelar
        </Link>
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
    <section className="space-y-4">
      <div>
        <h2 className="etiqueta text-texto-3 text-[10px]">{titulo}</h2>
        {nota && (
          <p className="text-texto-meta mt-1.5 text-xs leading-relaxed">{nota}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Campo({
  etiqueta,
  ayuda,
  children,
}: {
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-texto-2 mb-1.5 block text-sm">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-texto-meta mt-1 block text-xs">{ayuda}</span>}
    </label>
  );
}

function Interruptor({
  nombre,
  etiqueta,
  marcado,
  predeterminado,
  alCambiar,
}: {
  nombre: string;
  etiqueta: string;
  marcado?: boolean;
  predeterminado?: boolean;
  alCambiar?: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        name={nombre}
        {...(alCambiar
          ? { checked: marcado, onChange: (e) => alCambiar(e.target.checked) }
          : { defaultChecked: predeterminado })}
        className="accent-cian h-4 w-4 cursor-pointer"
      />
      <span className="text-texto-2">{etiqueta}</span>
    </label>
  );
}
