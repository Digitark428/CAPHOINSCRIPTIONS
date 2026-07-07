import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter en repli ; sur appareils Apple, la pile de polices privilégie SF Pro.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CAP HOMARD · Gestion des tournois",
  description:
    "Inscriptions et gestion des tournois de beach-volley — CAP HOMARD BEACH VOLLEY 974 (La Réunion).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
