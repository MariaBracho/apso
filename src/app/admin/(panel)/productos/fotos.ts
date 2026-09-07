"use server";

import { revalidatePath } from "next/cache";

import { DEPOSITO } from "@/lib/fotos";
import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoFoto = { error: string } | { ok: true; url: string } | undefined;

/**
 * Registra una foto ya subida.
 *
 * El archivo NO pasa por aquí. Un server action tiene el cuerpo limitado a
 * 1 MB por Next, y en Vercel la función entera topa en 4,5 MB: cualquier foto
 * de cámara revienta las dos cosas antes de que corra una sola línea de este
 * archivo, y lo que se ve es una pantalla de error del framework, no un
 * mensaje. Por eso el navegador sube directo a Storage —donde el depósito
 * impone sus propios límites de tamaño y tipo— y aquí solo llega la ruta.
 *
 * La ruta viene del cliente, así que se comprueba que cuelgue de este producto:
 * sin eso se podría registrar cualquier objeto del depósito bajo cualquier
 * ficha.
 */
export async function registrarFoto(
  productoId: string,
  ruta: string,
): Promise<EstadoFoto> {
  await exigirAdmin();

  if (!ruta.startsWith(`${productoId}/`) || ruta.includes("..")) {
    return { error: "Esa ruta no corresponde a este producto." };
  }

  const supabase = await crearClienteServidor();

  const {
    data: { publicUrl },
  } = supabase.storage.from(DEPOSITO).getPublicUrl(ruta);

  // Va al final de la fila. La primera foto es la que sale en la tarjeta del
  // catálogo, y no se reordena sola al agregar.
  const { data: ultimas } = await supabase
    .from("producto_imagenes")
    .select("orden")
    .eq("producto_id", productoId)
    .order("orden", { ascending: false })
    .limit(1);

  const siguiente = (ultimas?.[0]?.orden ?? -1) + 1;

  const { error: errorFila } = await supabase.from("producto_imagenes").insert({
    producto_id: productoId,
    url: publicUrl,
    alt: null,
    orden: siguiente,
  });

  if (errorFila) {
    // Si no se pudo registrar, el archivo sobra: dejarlo sería basura que
    // nadie va a encontrar ni borrar después.
    await supabase.storage.from(DEPOSITO).remove([ruta]);
    return { error: `No se pudo guardar: ${errorFila.message}` };
  }

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true, url: publicUrl };
}

/** Borra la foto del depósito y su fila. */
export async function borrarFoto(imagenId: string): Promise<EstadoFoto> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();

  const { data: imagen } = await supabase
    .from("producto_imagenes")
    .select("url")
    .eq("id", imagenId)
    .maybeSingle();

  if (!imagen) return { error: "Esa foto ya no está." };

  await supabase.from("producto_imagenes").delete().eq("id", imagenId);

  // La ruta dentro del depósito es lo que va después de /object/public/<bucket>/
  const marca = `/object/public/${DEPOSITO}/`;
  const corte = imagen.url.indexOf(marca);
  if (corte !== -1) {
    await supabase.storage
      .from(DEPOSITO)
      .remove([imagen.url.slice(corte + marca.length)]);
  }

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true, url: "" };
}

/**
 * Intercambia el orden de dos fotos.
 *
 * El índice único de (producto_id, orden) impide dejar dos con el mismo
 * número, así que se pasa por un valor libre en medio.
 */
export async function moverFoto(
  imagenId: string,
  otraId: string,
): Promise<EstadoFoto> {
  await exigirAdmin();

  const supabase = await crearClienteServidor();

  const { data: filas } = await supabase
    .from("producto_imagenes")
    .select("id, orden")
    .in("id", [imagenId, otraId]);

  if (!filas || filas.length !== 2) return { error: "No se pudo reordenar." };

  const [a, b] = filas;
  const aparcado = -1;

  await supabase
    .from("producto_imagenes")
    .update({ orden: aparcado })
    .eq("id", a!.id);
  await supabase
    .from("producto_imagenes")
    .update({ orden: a!.orden })
    .eq("id", b!.id);
  await supabase
    .from("producto_imagenes")
    .update({ orden: b!.orden })
    .eq("id", a!.id);

  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  return { ok: true, url: "" };
}
