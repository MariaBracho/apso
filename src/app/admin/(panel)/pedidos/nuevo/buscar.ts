"use server";

import { type ClienteConocido, buscarClientes } from "@/lib/admin";
import { exigirAdmin } from "@/lib/sesion";

/**
 * Buscar clientes desde el formulario de venta.
 *
 * En su propio archivo porque `acciones.ts` de esta carpeta es de escritura y
 * este es de lectura, y mezclarlos obliga a leer el de arriba para saber si
 * algo escribe.
 */
export async function buscarClientesDelPanel(
  termino: string,
): Promise<ClienteConocido[]> {
  await exigirAdmin();
  return buscarClientes(termino);
}
