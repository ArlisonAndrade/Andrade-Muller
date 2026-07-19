import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Serifa da seção Bank (/bank) — expõe --font-source-serif usado por --font-serif.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "FM Gestão e Estratégica",
  description: "Sistema operacional interno da FM Gestão e Estratégica",
};

// Sem isto o celular renderiza numa "tela virtual" de ~980px e encolhe tudo.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${fraunces.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
