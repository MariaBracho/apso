"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useMemo,
  useOptimistic,
  useState,
  useTransition,
} from "react";

import { formatearUsd } from "@/lib/formato";

export type OpcionFiltro = {
  valor: string;
  etiqueta: string;
  total: number;
};

/**
 * Sidebar de filtros del listado.
 *
 * Todo el estado vive en la URL: así el filtro sobrevive a recargar, se puede
 * compartir un listado filtrado, y el servidor sigue siendo quien decide qué
 * productos existen.
 */
export function FiltrosSidebar({
  disponibilidad,
  tipos,
  marcas,
  condiciones,
  precioMinimo,
  precioMaximo,
}: {
  disponibilidad: OpcionFiltro[];
  tipos: OpcionFiltro[];
  marcas: OpcionFiltro[];
  condiciones: OpcionFiltro[];
  precioMinimo: number;
  precioMaximo: number;
}) {
  const router = useRouter();
  const urlReal = useSearchParams();
  const [, iniciar] = useTransition();

  /**
   * Los filtros se marcan al instante, sin esperar al servidor.
   *
   * Las casillas leen su estado de la URL, y cambiar la URL obliga a
   * re-renderizar el catálogo entero en el servidor. Sin esto, marcar una
   * casilla no se veía hasta que ese viaje volvía: segundos de pantalla sin
   * responder que se sienten como un clic perdido.
   *
   * `useOptimistic` adelanta el estado y lo revierte solo si la navegación
   * falla, así que no se puede quedar mostrando un filtro que no se aplicó.
   */
  const [urlOptimista, adelantar] = useOptimistic(urlReal.toString());
  const params = useMemo(
    () => new URLSearchParams(urlOptimista),
    [urlOptimista],
  );

  const actualizar = useCallback(
    (cambios: Record<string, string | null>) => {
      const siguientes = new URLSearchParams(params.toString());
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === null || valor === "") {
          siguientes.delete(clave);
        } else {
          siguientes.set(clave, valor);
        }
      }

      const cadena = siguientes.toString();
      iniciar(() => {
        adelantar(cadena);
        router.replace(`?${cadena}`, { scroll: false });
      });
    },
    [params, router, adelantar],
  );

  const alternar = (clave: string, valor: string) => {
    const actuales = (params.get(clave) ?? "").split(",").filter(Boolean);
    const siguientes = actuales.includes(valor)
      ? actuales.filter((v) => v !== valor)
      : [...actuales, valor];
    actualizar({ [clave]: siguientes.join(",") });
  };

  const marcado = (clave: string, valor: string) =>
    (params.get(clave) ?? "").split(",").includes(valor);

  const CLAVES = [
    "disponibilidad",
    "tipo",
    "marca",
    "condicion",
    "min",
    "max",
  ];

  const hayFiltros = CLAVES.some((clave) => params.has(clave));

  // En escritorio el sidebar va siempre desplegado. En móvil se pliega: si no,
  // los filtros empujan el primer producto una pantalla entera hacia abajo.
  const [abierto, setAbierto] = useState(false);

  return (
    <aside className="w-full shrink-0 lg:w-60">
      <div className="lg:sticky lg:top-24">
        <div className="mb-5 flex items-baseline justify-between">
          <button
            type="button"
            onClick={() => setAbierto((a) => !a)}
            aria-expanded={abierto}
            className="etiqueta text-texto-3 flex items-center gap-2 text-[10px] lg:pointer-events-none"
          >
            Filtros
            <span aria-hidden="true" className="text-xs lg:hidden">
              {abierto ? "−" : "+"}
            </span>
          </button>
          {hayFiltros && (
            <button
              type="button"
              // Se borran las mismas claves que se comprueban arriba: escritas
              // en dos listas, agregar un filtro y olvidar una deja «Limpiar»
              // sin limpiarlo.
              onClick={() =>
                actualizar(Object.fromEntries(CLAVES.map((c) => [c, null])))
              }
              className="text-cian hover:text-cian/80 text-xs transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        <div className={`space-y-7 ${abierto ? "" : "hidden lg:block"}`}>
          <GrupoCasillas
            titulo="Disponibilidad"
            opciones={disponibilidad}
            marcado={(valor) => marcado("disponibilidad", valor)}
            alAlternar={(valor) => alternar("disponibilidad", valor)}
          />

          <RangoPrecio
            key={`${params.get("min") ?? ""}-${params.get("max") ?? ""}`}
            minimo={precioMinimo}
            maximo={precioMaximo}
            valorMin={Number(params.get("min") ?? precioMinimo)}
            valorMax={Number(params.get("max") ?? precioMaximo)}
            alCambiar={(min, max) =>
              actualizar({
                min: min === precioMinimo ? null : String(min),
                max: max === precioMaximo ? null : String(max),
              })
            }
          />

          {tipos.length > 0 && (
            <GrupoCasillas
              titulo="Tipo"
              opciones={tipos}
              marcado={(valor) => marcado("tipo", valor)}
              alAlternar={(valor) => alternar("tipo", valor)}
            />
          )}

          {/* Solo sale si hay más de una: con todo el catálogo nuevo, un filtro
              de una sola opción no filtra nada y ocupa sitio. */}
          {condiciones.length > 1 && (
            <GrupoCasillas
              titulo="Condición"
              opciones={condiciones}
              marcado={(valor) => marcado("condicion", valor)}
              alAlternar={(valor) => alternar("condicion", valor)}
            />
          )}

          {marcas.length > 0 && (
            <GrupoCasillas
              titulo="Marca"
              opciones={marcas}
              marcado={(valor) => marcado("marca", valor)}
              alAlternar={(valor) => alternar("marca", valor)}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

function GrupoCasillas({
  titulo,
  opciones,
  marcado,
  alAlternar,
}: {
  titulo: string;
  opciones: OpcionFiltro[];
  marcado: (valor: string) => boolean;
  alAlternar: (valor: string) => void;
}) {
  return (
    <fieldset>
      <legend className="etiqueta text-texto-3 mb-3 text-[10px]">
        {titulo}
      </legend>
      <div className="space-y-2.5">
        {opciones.map((opcion) => (
          <Casilla
            key={opcion.valor}
            etiqueta={opcion.etiqueta}
            total={opcion.total}
            marcado={marcado(opcion.valor)}
            alAlternar={() => alAlternar(opcion.valor)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Cuadrado de 16×16 sin redondear; cian con check al marcar. */
function Casilla({
  etiqueta,
  total,
  marcado,
  alAlternar,
}: {
  etiqueta: string;
  total: number;
  marcado: boolean;
  alAlternar: () => void;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 text-sm">
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={marcado}
          onChange={alAlternar}
          className="peer absolute h-4 w-4 cursor-pointer opacity-0"
        />
        <span
          className={`h-4 w-4 border transition-colors ${
            marcado ? "bg-cian border-cian" : "border-texto-meta bg-transparent"
          }`}
        />
        {marcado && (
          <svg
            viewBox="0 0 16 16"
            className="text-superficie absolute h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M3 8.5l3.2 3.2L13 5" />
          </svg>
        )}
      </span>

      <span className="text-texto-2 group-hover:text-texto transition-colors">
        {etiqueta}
      </span>
      <span className="text-texto-meta ml-auto text-xs">{total}</span>
    </label>
  );
}

function RangoPrecio({
  minimo,
  maximo,
  valorMin,
  valorMax,
  alCambiar,
}: {
  minimo: number;
  maximo: number;
  valorMin: number;
  valorMax: number;
  alCambiar: (min: number, max: number) => void;
}) {
  // Estado local solo mientras se arrastra; la URL manda. El padre remonta
  // este componente con una `key` cuando los valores de la URL cambian, que es
  // como React recomienda reiniciar estado ante un cambio de prop.
  const [min, setMin] = useState(valorMin);
  const [max, setMax] = useState(valorMax);

  if (maximo <= minimo) return null;

  return (
    <fieldset>
      <legend className="etiqueta text-texto-3 mb-3 text-[10px]">Precio</legend>

      <div className="relative h-5">
        <span className="bg-superficie-3 absolute top-1/2 h-0.5 w-full -translate-y-1/2" />
        <span
          className="bg-cian absolute top-1/2 h-0.5 -translate-y-1/2"
          style={{
            left: `${((min - minimo) / (maximo - minimo)) * 100}%`,
            right: `${100 - ((max - minimo) / (maximo - minimo)) * 100}%`,
          }}
        />

        <input
          type="range"
          aria-label="Precio mínimo"
          min={minimo}
          max={maximo}
          value={min}
          onChange={(e) => setMin(Math.min(Number(e.target.value), max))}
          onPointerUp={() => alCambiar(min, max)}
          onKeyUp={() => alCambiar(min, max)}
          className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-cian)]"
        />
        <input
          type="range"
          aria-label="Precio máximo"
          min={minimo}
          max={maximo}
          value={max}
          onChange={(e) => setMax(Math.max(Number(e.target.value), min))}
          onPointerUp={() => alCambiar(min, max)}
          onKeyUp={() => alCambiar(min, max)}
          className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-cian)]"
        />
      </div>

      <div className="text-texto-2 mt-2 flex justify-between text-xs">
        <span>{formatearUsd(min)}</span>
        <span>{formatearUsd(max)}</span>
      </div>
    </fieldset>
  );
}
