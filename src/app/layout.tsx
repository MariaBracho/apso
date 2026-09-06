import type { Metadata } from "next";
import { Sora, Karla } from "next/font/google";
import "./globals.css";

// Sora: titulares y cifras de precio. Karla: cuerpo, labels y botones.
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "apso — El equipo correcto, al precio real.",
    template: "%s · apso",
  },
  description:
    "Componentes, laptops y PC a medida importados de EE. UU. Precio sin spread inflado, asesoría uno a uno y garantía con serial. Punto Fijo, Venezuela.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${sora.variable} ${karla.variable} h-full antialiased`}
    >
      <body className="bg-fondo text-texto flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
