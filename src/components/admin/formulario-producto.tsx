"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import Link from "next/link";
import { useState } from "react";
import type { Control } from "react-hook-form";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import type { EstadoProducto } from "@/app/admin/(panel)/productos/acciones";
import {
  Campo,
  ErrorServidor,
  Seccion,
  estiloEntrada,
  estiloEntradaMal,
} from "@/components/formulario/campos";
import { type Foto, GestorFotos } from "@/components/admin/gestor-fotos";
import { type DatosProducto, esquemaProducto } from "@/lib/esquemas";
import { CONDICIONES, NOMBRE_CONDICION } from "@/lib/producto";
import { generarSlug } from "@/lib/texto";

export type OpcionSelect = { id: string; nombre: string };

export const PRODUCTO_VACIO: DatosProducto = {
  nombre: "",
  slug: "",
  categoria_id: "",
  marca_id: null,
  resumen: null,
  descripcion: null,
  especificaciones: [{ clave: "", valor: "" }],
  precio_usd: 0,
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
  productoId,
  fotos = [],
  recargo,
}: {
  accion: (datos: DatosProducto) => Promise<EstadoProducto>;
  valores: DatosProducto;
  categorias: OpcionSelect[];
  marcas: OpcionSelect[];
  etiquetaEnvio: string;
  /** Solo al editar: las fotos necesitan un producto que ya exista. */
  productoId?: string;
  fotos?: Foto[];
  /** Porcentaje que se le suma al precio para pagar en bolívares. */
  recargo: number;
}) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DatosProducto>({
    resolver: yupResolver(esquemaProducto),
    defaultValues: valores,
    // Se valida al salir del campo, no en cada tecla: marcar en rojo mientras
    // alguien todavía está escribiendo es hostil.
    mode: "onBlur",
  });

  const especs = useFieldArray({ control, name: "especificaciones" });
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [slugTocado, setSlugTocado] = useState(valores.slug !== "");

  // useWatch en vez de watch(): se suscribe solo a estos campos, y el
  // React Compiler no puede memoizar componentes que usen watch().
  const vitalicia = useWatch({ control, name: "garantia_vitalicia" });
  const slug = useWatch({ control, name: "slug" });

  const enviar = handleSubmit(async (datos) => {
    setErrorServidor(null);
    const resultado = await accion(datos);
    if (resultado && "error" in resultado) {
      setErrorServidor(resultado.error);
    }
  });

  return (
    <form onSubmit={enviar} noValidate className="max-w-2xl space-y-8">
      <Seccion titulo="Identificación">
        <Campo etiqueta="Nombre" error={errors.nombre?.message}>
          <input
            {...register("nombre", {
              onChange: (e) => {
                // La dirección se propone sola, pero deja de seguir al nombre
                // en cuanto se toca a mano: cambiarla en un producto ya
                // publicado rompe los enlaces que la gente guardó.
                if (!slugTocado) {
                  setValue("slug", generarSlug(e.target.value), {
                    shouldValidate: false,
                  });
                }
              },
            })}
            className={errors.nombre ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>

        <Campo
          etiqueta="Dirección en la web"
          ayuda={
            slug ? `apso.com.ve/…/${slug}` : "Se propone sola desde el nombre"
          }
          error={errors.slug?.message}
        >
          <input
            {...register("slug", { onChange: () => setSlugTocado(true) })}
            className={errors.slug ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Categoría" error={errors.categoria_id?.message}>
            <select
              {...register("categoria_id")}
              className={errors.categoria_id ? estiloEntradaMal : estiloEntrada}
            >
              <option value="">Elegir…</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Marca" error={errors.marca_id?.message}>
            <select {...register("marca_id")} className={estiloEntrada}>
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
        nota="Se carga el precio pagando en dólares. El de pagar en bolívares se calcula solo sumándole el recargo, y es el que sale grande en la tienda."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Precio en divisas"
            error={errors.precio_usd?.message}
          >
            <input
              {...register("precio_usd")}
              inputMode="decimal"
              className={errors.precio_usd ? estiloEntradaMal : estiloEntrada}
            />
            <PrecioEnBolivares control={control} recargo={recargo} />
          </Campo>
          <Campo
            etiqueta="Precio de referencia"
            error={errors.precio_referencia_usd?.message}
          >
            <input
              {...register("precio_referencia_usd")}
              inputMode="decimal"
              className={
                errors.precio_referencia_usd ? estiloEntradaMal : estiloEntrada
              }
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion
        titulo="Disponibilidad"
        nota="Con stock en cero y un plazo de encargo, la tienda lo muestra como «Por pedido · N días». Sin plazo, dice «Sin stock» y no promete nada."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Stock" error={errors.stock?.message}>
            <input
              {...register("stock")}
              inputMode="numeric"
              className={errors.stock ? estiloEntradaMal : estiloEntrada}
            />
          </Campo>
          <Campo
            etiqueta="Plazo de encargo (días)"
            error={errors.dias_encargo?.message}
          >
            <input
              {...register("dias_encargo")}
              inputMode="numeric"
              className={errors.dias_encargo ? estiloEntradaMal : estiloEntrada}
            />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Ficha">
        <Campo
          etiqueta="Resumen"
          ayuda="Una línea. Sale en la tarjeta y bajo el título."
          error={errors.resumen?.message}
        >
          <input
            {...register("resumen")}
            maxLength={200}
            className={errors.resumen ? estiloEntradaMal : estiloEntrada}
          />
        </Campo>

        <Campo etiqueta="Descripción" error={errors.descripcion?.message}>
          <textarea
            {...register("descripcion")}
            rows={3}
            className={estiloEntrada}
          />
        </Campo>

        <Campo
          etiqueta="Especificaciones"
          ayuda="Se muestran en este orden, así que pon primero lo que decide la compra."
          // Un error del arreglo entero (no de una fila) llega en `root`, no en
          // `message`: leer solo `message` lo bloqueaba todo sin decir por qué.
          error={
            errors.especificaciones?.root?.message ??
            errors.especificaciones?.message
          }
        >
          {/* Rejilla y no flex: `estiloEntrada` ya trae `w-full`, y al sumarle
              anchos encima quedaban dos utilidades de ancho peleando. El segundo
              campo pedía cero, así que al no caber se quedaba en cero y no se
              podía escribir en él. */}
          <div className="space-y-2">
            {especs.fields.map((campo, i) => (
              <div
                key={campo.id}
                className="grid grid-cols-[2fr_3fr_auto] items-center gap-2"
              >
                <input
                  {...register(`especificaciones.${i}.clave`)}
                  placeholder="Capacidad"
                  aria-label={`Especificación ${i + 1}, etiqueta`}
                  className={estiloEntrada}
                />
                <input
                  {...register(`especificaciones.${i}.valor`)}
                  placeholder="2 × 16 GB"
                  aria-label={`Especificación ${i + 1}, valor`}
                  className={estiloEntrada}
                />
                <button
                  type="button"
                  onClick={() => especs.remove(i)}
                  aria-label={`Quitar la fila ${i + 1}`}
                  className="text-texto-meta hover:text-error px-2 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => especs.append({ clave: "", valor: "" })}
              className="text-cian hover:text-cian/80 text-xs transition-colors"
            >
              + Agregar especificación
            </button>
          </div>
        </Campo>
      </Seccion>

      <Seccion
        titulo="Fotos"
        nota={
          productoId
            ? "La primera es la que sale en la tarjeta del catálogo, así que ponla de primera a propósito."
            : "Podrás agregarlas en cuanto guardes el producto: las fotos necesitan que exista primero."
        }
      >
        {productoId ? (
          <GestorFotos productoId={productoId} fotos={fotos} />
        ) : (
          <p className="text-texto-meta border-borde rounded-tarjeta border border-dashed px-4 py-6 text-center text-xs">
            Guarda el producto y te traigo aquí mismo para subirlas.
          </p>
        )}
      </Seccion>

      <Seccion titulo="Procedencia y garantía">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Condición">
            {/* De la lista y no escritas a mano: así agregar una condición no
                deja el panel sin poder elegirla, que es lo que acababa de
                pasar con «usado». */}
            <select {...register("condicion")} className={estiloEntrada}>
              {CONDICIONES.map((c) => (
                <option key={c} value={c}>
                  {NOMBRE_CONDICION[c]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            etiqueta="Garantía (meses)"
            error={errors.garantia_meses?.message}
          >
            <input
              {...register("garantia_meses")}
              inputMode="numeric"
              disabled={vitalicia}
              className={`${errors.garantia_meses ? estiloEntradaMal : estiloEntrada} disabled:opacity-40`}
            />
          </Campo>
        </div>

        <Interruptor
          etiqueta="Garantía de por vida"
          {...register("garantia_vitalicia")}
        />
      </Seccion>

      <Seccion titulo="Publicación">
        <Interruptor etiqueta="Visible en la tienda" {...register("activo")} />
        <Interruptor etiqueta="Destacado" {...register("destacado")} />
      </Seccion>

      <ErrorServidor mensaje={errorServidor} />

      <div className="border-borde-sutil flex items-center gap-3 border-t pt-6">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-cian text-superficie rounded-pildora hover:bg-cian/90 px-6 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Guardando…" : etiquetaEnvio}
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

/**
 * El precio derivado, mientras se escribe.
 *
 * Sin esto hay que confiar en que la cuenta se hizo bien y descubrir el número
 * al ver la ficha publicada. Se usa `useWatch` y no `watch()`: el segundo
 * suscribe el formulario entero y rompe la memoización del compilador.
 */
function PrecioEnBolivares({
  control,
  recargo,
}: {
  control: Control<DatosProducto>;
  recargo: number;
}) {
  const enDivisas = useWatch({ control, name: "precio_usd" });
  const numero = Number(String(enDivisas).replace(",", "."));

  if (!Number.isFinite(numero) || numero <= 0) return null;

  const enBolivares = Math.round(numero * (1 + recargo / 100) * 100) / 100;

  return (
    <span className="text-texto-meta mt-1 block text-xs">
      Pagando en bolívares:{" "}
      <span className="text-texto-2">
        ${enBolivares.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
      </span>{" "}
      (+{recargo} %)
    </span>
  );
}

function Interruptor({
  etiqueta,
  ...props
}: { etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        {...props}
        className="accent-cian h-4 w-4 cursor-pointer"
      />
      <span className="text-texto-2">{etiqueta}</span>
    </label>
  );
}
