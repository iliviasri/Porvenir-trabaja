import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ChatWidget } from "@/components/chat/chat-widget";

export const metadata: Metadata = {
  title: { default: "PORVENIR TRABAJA · Empleo y formalización en El Porvenir", template: "%s · PORVENIR TRABAJA" },
  description: "Bolsa de trabajo local, directorio de negocios y orientación para formalizar tu negocio en El Porvenir, Trujillo.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};
export const viewport: Viewport = { themeColor: "#0f5e6b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:p-2">
          Saltar al contenido
        </a>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
