import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KS SMS Send",
  description: "Plateforme de préparation et de gestion de campagnes SMS.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
