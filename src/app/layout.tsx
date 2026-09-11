import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contact Tracker",
  description: "Suivi de prospection — artistes, producteurs et pros de l'industrie",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
