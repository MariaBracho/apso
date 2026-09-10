"use client";

import { useEffect, useState } from "react";

import { buscarClientesDelPanel } from "@/app/admin/(panel)/pedidos/nuevo/buscar";
import { estiloEntrada } from "@/components/formulario/campos";
import type { ClienteConocido } from "@/lib/admin";

/** Lo que se espera a que deje de escribir antes de consultar. */
const ESPERA_MS = 250;

/** Con una letra coincide medio mundo y la lista no ayuda a elegir. */
const MINIMO = 2;

/**
 * El nombre del cliente, con los que ya existen a mano.
 *
 * Se escribía a mano cada vez, así que el mismo cliente terminaba como «Maria
 * Bracho», «maria» y «Maria B»: tres personas para la base y ninguna con su
 * historial completo. Al elegir uno se rellenan también su WhatsApp y su
 * correo, que es donde más se equivoca uno tecleando.
 *
 * Sigue siendo un campo de texto: quien compra por primera vez no está en
 * ninguna lista, y obligar a crearlo antes de vender pondría un trámite en
 * medio de una venta de mostrador.
 */
export function BuscadorClientes({
  valor,
  alEscribir,
  alElegir,
  invalido,
}: {
  valor: string;
  alEscribir: (nombre: string) => void;
  alElegir: (cliente: ClienteConocido) => void;
  invalido: boolean;
}) {
  const [encontrados, setEncontrados] = useState<ClienteConocido[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState<string | null>(null);

  useEffect(() => {
    // Tras elegir a alguien no se vuelve a buscar con su propio nombre: la
    // lista reaparecería encima de un campo que ya está resuelto.
    if (!abierto || valor === elegido) return;

    const termino = valor.trim();
    // No se vacía la lista aquí: cambiar el estado en el cuerpo del efecto
    // encadena renders. Lo corto se filtra al pintar, más abajo.
    if (termino.length < MINIMO) return;

    const temporizador = setTimeout(async () => {
      setEncontrados(await buscarClientesDelPanel(termino));
    }, ESPERA_MS);

    return () => clearTimeout(temporizador);
  }, [valor, abierto, elegido]);

  return (
    <div className="relative">
      <input
        value={valor}
        onChange={(e) => {
          alEscribir(e.target.value);
          setElegido(null);
        }}
        onFocus={() => setAbierto(true)}
        // En blur y con retraso: sin él, el clic sobre un resultado cierra la
        // lista antes de que llegue a registrarse.
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        autoComplete="off"
        placeholder="Nombre, o busca por correo"
        aria-label="Nombre del cliente"
        className={invalido ? estiloEntrada.replace("border-borde", "border-error") : estiloEntrada}
      />

      {abierto && valor.trim().length >= MINIMO && encontrados.length > 0 && (
        <ul className="bg-superficie border-borde rounded-tarjeta absolute z-20 mt-1 w-full overflow-hidden border shadow-lg">
          {encontrados.map((cliente) => (
            <li key={cliente.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // `mousedown` y no `click`: el blur del campo llega antes que
                  // el click y se llevaría la lista por delante.
                  e.preventDefault();
                  alElegir(cliente);
                  setElegido(cliente.nombre);
                  setAbierto(false);
                }}
                className="hover:bg-superficie-2 block w-full px-3.5 py-2 text-left text-sm transition-colors"
              >
                <span className="text-texto block">{cliente.nombre}</span>
                <span className="text-texto-meta block text-xs">
                  {cliente.correo}
                  {cliente.whatsapp && ` · ${cliente.whatsapp}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
