"use server";

import { revalidatePath } from "next/cache";

import { exigirAdmin } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { generarSlug } from "@/lib/texto";

export type EstadoFoto = { error: string } | { ok: true; url: string } | undefined;

const DEPOSITO = "productos";
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAXIMO = 5 * 1024 * 1024;

/**
 * Sube una foto de producto.
 *
 * El archivo viaja como FormData porque un File no se puede serializar como
 * argumento normal de server action.
 *
 * Se valida aquí además de en el navegador: el límite del depósito y estas
 * comprobaciones son las que mandan, la del formulario solo evita el viaje.
 */
export async function subirFoto(datos: FormData): Promise<EstadoFoto> {
  await exigirAdmin();

  const productoId = String(datos.get("producto_id") ?? "");
  const archivo = datos.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "No llegó ninguna imagen." };
  }
  if (!TIPOS.includes(archivo.type)) {
    return { error: "Solo se aceptan imágenes JPG, PNG, WebP o AVIF." };
  }
  if (archivo.size > MAXIMO) {
    return {
      error: `La imagen pesa ${(archivo.size / 1048576).toFixed(1)} MB y el máximo son 5 MB. Compárte­la más o redúcela.`,
    };
  }

  const supabase = await crearClienteServidor();

  // Nombre estable y legible, con sufijo para no pisar una foto existente del
  // mismo producto.
  const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = generarSlug(archivo.name.replace(/\.[^.]+$/, "")) || "foto";
  const ruta = `${productoId}/${base}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from(DEPOSITO)
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

  if (errorSubida) {
    return { error: `No se pudo subir: ${errorSubida.message}` };
  }

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
