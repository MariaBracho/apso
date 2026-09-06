"use server";

import { redirect } from "next/navigation";

import { crearClienteServidor } from "@/lib/supabase/servidor";

export type EstadoEntrada = { error: string } | undefined;

export async function entrar(
  _estadoPrevio: EstadoEntrada,
  datos: FormData,
): Promise<EstadoEntrada> {
  const correo = String(datos.get("correo") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");

  if (!correo || !clave) {
    return { error: "Faltan el correo o la contraseña." };
  }

  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
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
