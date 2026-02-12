import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Progetto Gare",
    template: "%s | Progetto Gare",
  },
  description: "Piattaforma AI per la gestione intelligente delle gare d'appalto. Analisi documenti, checklist requisiti, e bozze offerta con intelligenza artificiale.",
  keywords: ["gare d'appalto", "procurement", "AI", "appalti", "offerta tecnica", "bando"],
  authors: [{ name: "Progetto Gare" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "Progetto Gare",
    description: "Piattaforma AI per la gestione intelligente delle gare d'appalto.",
    type: "website",
    locale: "it_IT",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Progetto Gare - Piattaforma AI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Progetto Gare",
    description: "Piattaforma AI per la gestione intelligente delle gare d'appalto.",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
