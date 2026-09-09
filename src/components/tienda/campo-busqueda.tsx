"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Con una letra sola casi todo coincide, y la lista no diría nada. */
const MINIMO = 2;

/** Lo que se espera a que deje de escribir antes de consultar. */
const ESPERA_MS = 300;

/**
 * El campo de búsqueda, compartido por la barra de escritorio y la de teléfono.
 *
 * Busca mientras se escribe. La consulta no sale en cada tecla: se espera a que
 * la persona pare, porque tecleando «lenovo» serían seis viajes al servidor de
 * los que solo el último importa.
 *
 * Sigue siendo un formulario de verdad. Con Enter navega igual, y sin
 * JavaScript también, que es lo que hace que funcione en un teléfono con mala
 * conexión antes de que cargue el bundle.
 */
export function CampoBusqueda({
  autoFocus = false,
  clase,
}: {
  autoFocus?: boolean;
  clase: string;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const parametros = useSearchParams();

  const enBusqueda = ruta === "/buscar";
  const consultaEnLaUrl = enBusqueda ? (parametros.get("q") ?? "") : "";

  const [texto, setTexto] = useState(consultaEnLaUrl);

  // Cuál era la ruta antes de empezar a buscar, para no apilar una entrada de
  // historial por cada pausa al teclear: se entra a la búsqueda una vez y de
  // ahí en adelante se reemplaza. Así «atrás» vuelve a la categoría donde
  // estaba y no recorre letra por letra lo que escribió.
  const yaNavego = useRef(enBusqueda);

  useEffect(() => {
    const termino = texto.trim();

    if (termino === consultaEnLaUrl) return;
    if (termino.length > 0 && termino.length < MINIMO) return;

    const temporizador = setTimeout(() => {
      const destino =
        termino.length === 0
          ? "/buscar"
          : `/buscar?q=${encodeURIComponent(termino)}`;

      if (yaNavego.current) {
        router.replace(destino);
      } else {
        yaNavego.current = true;
        router.push(destino);
      }
    }, ESPERA_MS);

    return () => clearTimeout(temporizador);
  }, [texto, consultaEnLaUrl, router]);

  return (
    <input
      type="search"
      name="q"
      value={texto}
      autoFocus={autoFocus}
      onChange={(e) => setTexto(e.target.value)}
      placeholder="Busca RAM, gráfica, laptop…"
      aria-label="Buscar en el catálogo"
      className={clase}
    />
  );
}
