"use server";

import { redirect } from "next/navigation";

import { type DatosEntrada, esquemaEntrada, validar } from "@/lib/esquemas";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoEntrada = { error: string } | undefined;

export async function entrar(datos: DatosEntrada): Promise<EstadoEntrada> {
  const resultado = await validar(esquemaEntrada, datos);
  if (!resultado.ok) return { error: resultado.error };

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: resultado.valores.correo,
    password: resultado.valores.clave,
  });

  if (error) {
    // No se distingue entre "ese correo no existe" y "la clave está mal": eso
    // le diría a cualquiera qué correos tienen cuenta.
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/admin/productos");
}

export async function salir() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/admin/entrar");
}
