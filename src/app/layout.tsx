import "@/app/globals.css";
import faviconIcon from "@/assets/icon/icon.png";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Prompt Tester",
  description: "Prompt Tester - pronto para executar comparacoes.",
  icons: {
    icon: faviconIcon.src,
    shortcut: faviconIcon.src,
    apple: faviconIcon.src
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark fontMedium">
      <body>{children}</body>
    </html>
  );
}
