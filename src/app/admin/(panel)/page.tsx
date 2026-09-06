import { redirect } from "next/navigation";

/**
 * `/admin` a secas no muestra nada propio: lleva a pedidos.
 *
 * Es la pantalla que se abre a diario — el flujo 10 la describe como lo
 * primero que se mira al empezar el día — así que es el destino natural de
 * quien teclea la dirección corta.
 *
 * El layout del panel ya exige sesión de admin, así que quien no la tenga
 * acaba en la pantalla de entrada antes de llegar aquí.
 */
export default function PaginaAdmin() {
  redirect("/admin/pedidos");
}
