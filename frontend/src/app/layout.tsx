import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://api-entok.marshelportfolio.me"),
  title: "Kelola Komposisi & Formulasi Pakan - Monitoring Entok",
  description: "Sistem Kelola Komposisi & Formulasi Pakan Entok Makmur",
  applicationName: "Entok Monitoring",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Kelola Komposisi & Formulasi Pakan - Monitoring Entok",
    description: "Sistem Kelola Komposisi & Formulasi Pakan Entok Makmur",
    url: "/",
    siteName: "Entok Monitoring",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Entok Monitoring Preview Banner",
        type: "image/png",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kelola Komposisi & Formulasi Pakan - Monitoring Entok",
    description: "Sistem Kelola Komposisi & Formulasi Pakan Entok Makmur",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
