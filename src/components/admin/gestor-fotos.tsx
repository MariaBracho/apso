"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  borrarFoto,
  moverFoto,
  registrarFoto,
} from "@/app/admin/(panel)/productos/fotos";
import { DEPOSITO, motivoRechazo } from "@/lib/fotos";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { generarSlug } from "@/lib/texto";

export type Foto = { id: string; url: string; orden: number };

/**
 * Fotos del producto.
 *
 * La primera es la que sale en la tarjeta del catálogo, así que el orden
 * decide con qué imagen se vende. Por eso se puede reordenar y la principal
 * va marcada.
 */
export function GestorFotos({
  productoId,
  fotos,
}: {
  productoId: string;
  fotos: Foto[];
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [pendiente, iniciar] = useTransition();
  const [subiendo, setSubiendo] = useState(0);

  const subir = (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;

    const lista = Array.from(archivos);
    setSubiendo(lista.length);

    iniciar(async () => {
      let bien = 0;
      const supabase = crearClienteNavegador();

      // De una en una y en orden, para que el orden final sea el que eligió
      // al seleccionarlas.
      for (const archivo of lista) {
        const rechazo = motivoRechazo(archivo);
        if (rechazo) {
          toast.error(`${archivo.name}: ${rechazo}`);
          continue;
        }

        // Nombre legible, con sufijo para no pisar otra foto del mismo
        // producto. La carpeta es el id del producto, y el servidor comprueba
        // que la ruta que le pasamos cuelgue de ahí.
        const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const base = generarSlug(archivo.name.replace(/\.[^.]+$/, "")) || "foto";
        const ruta = `${productoId}/${base}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

        // El archivo va del navegador al depósito sin pasar por Next: así no
        // topa con el límite de 1 MB del server action ni con el de la función
        // en Vercel. Quien sube tiene que ser admin, y eso lo exige la política
        // del depósito contra su sesión.
        const { error } = await supabase.storage
          .from(DEPOSITO)
          .upload(ruta, archivo, { contentType: archivo.type, upsert: false });

        if (error) {
          toast.error(`${archivo.name}: no se pudo subir. ${error.message}`);
          continue;
        }

        const resultado = await registrarFoto(productoId, ruta);
        if (resultado && "error" in resultado) {
          toast.error(`${archivo.name}: ${resultado.error}`);
        } else {
          bien += 1;
        }
      }

      setSubiendo(0);
      if (entrada.current) entrada.current.value = "";
      if (bien > 0) {
        toast.success(bien === 1 ? "Foto agregada" : `${bien} fotos agregadas`);
      }
    });
  };

  return (
    <div className="space-y-4">
      {fotos.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {fotos.map((foto, i) => (
            <li key={foto.id} className="group relative">
              <div className="bg-hueso rounded-tarjeta relative aspect-square overflow-hidden">
                <Image
                  src={foto.url}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>

              {i === 0 && (
                <span className="etiqueta bg-cian text-superficie rounded-pildora absolute top-1.5 left-1.5 px-2 py-0.5 text-[9px]">
                  Principal
                </span>
              )}

              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex gap-1">
                  <BotonOrden
                    etiqueta="Mover antes"
                    signo="‹"
                    activo={i > 0 && !pendiente}
                    alPulsar={() =>
                      iniciar(() => moverFoto(foto.id, fotos[i - 1]!.id).then(() => {}))
                    }
                  />
                  <BotonOrden
                    etiqueta="Mover después"
                    signo="›"
                    activo={i < fotos.length - 1 && !pendiente}
                    alPulsar={() =>
                      iniciar(() => moverFoto(foto.id, fotos[i + 1]!.id).then(() => {}))
                    }
                  />
                </div>

                <button
                  type="button"
                  disabled={pendiente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await borrarFoto(foto.id);
                      if (r && "error" in r) toast.error(r.error);
                      else toast("Foto quitada");
                    })
                  }
                  aria-label="Quitar esta foto"
                  className="text-texto-meta hover:text-error px-1 text-xs transition-colors disabled:opacity-30"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={entrada}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          disabled={pendiente}
          onChange={(e) => subir(e.target.files)}
          className="text-texto-2 file:bg-superficie-3 file:text-texto file:rounded-pildora hover:file:bg-superficie-alta w-full text-sm file:mr-3 file:cursor-pointer file:border-0 file:px-4 file:py-2 file:text-sm file:font-semibold"
        />
        <p className="text-texto-meta mt-2 text-xs leading-relaxed">
          {subiendo > 0
            ? `Subiendo ${subiendo}…`
            : "JPG, PNG, WebP o AVIF, hasta 5 MB cada una. La primera es la que se ve en el catálogo."}
        </p>
      </div>
    </div>
  );
}

function BotonOrden({
  etiqueta,
  signo,
  activo,
  alPulsar,
}: {
  etiqueta: string;
  signo: string;
  activo: boolean;
  alPulsar: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!activo}
      onClick={alPulsar}
      aria-label={etiqueta}
      className="border-borde text-texto-2 hover:border-cian hover:text-cian rounded border px-1.5 text-xs transition-colors disabled:opacity-20"
    >
      {signo}
    </button>
  );
}
