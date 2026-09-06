"use client";

import { Toaster } from "sonner";

/**
 * Avisos flotantes.
 *
 * Son para el resultado de una acción — "se guardó", "no se pudo" —, no para
 * errores de validación. Un aviso que dice "el nombre no puede quedar vacío"
 * no señala qué campo lo tiene mal; esos van pegados al campo.
 *
 * Se colocan abajo a la derecha para no tapar la barra superior, donde vive la
 * tasa del día.
 */
export function Avisos() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      toastOptions={{
        style: {
          background: "var(--color-superficie)",
          border: "1px solid var(--color-borde)",
          color: "var(--color-texto)",
          fontFamily: "var(--font-karla)",
        },
      }}
    />
  );
}
