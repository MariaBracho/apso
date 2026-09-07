import type { Page } from "@playwright/test";

import { ADMIN } from "./datos";

/**
 * Entra al panel con el admin sembrado.
 *
 * Se hace por el formulario y no inyectando una cookie: entrar es parte de lo
 * que hay que comprobar, y una sesión falsificada dejaría de avisar el día que
 * el login se rompa.
 */
export async function entrarComoAdmin(page: Page) {
  await page.goto("/admin/entrar");
  await page.getByLabel("Correo").fill(ADMIN.correo);
  await page.getByLabel("Contraseña").fill(ADMIN.clave);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForURL(/\/admin\/(pedidos|productos)/);
}
