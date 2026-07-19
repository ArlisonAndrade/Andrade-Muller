import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Nav } from "@/components/ui/nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Andrade Muller Bank",
  description: "Painel de controle financeiro familiar Andrade Muller",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Nav />
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
