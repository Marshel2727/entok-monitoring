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
  title: "Kelola Komposisi & Formulasi Pakan - Monitoring Entok",
  description: "Sistem Kelola Komposisi & Formulasi Pakan Entok Makmur",
  openGraph: {
    title: "Kelola Komposisi & Formulasi Pakan - Monitoring Entok",
    description: "Sistem Kelola Komposisi & Formulasi Pakan Entok Makmur",
    url: "https://entok-monitoring.vercel.app",
    siteName: "Entok Monitoring",
    images: [
      {
        url: "https://entok-monitoring.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Entok Monitoring Preview Banner",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kelola Komposisi & Formulasi Pakan - Monitoring Entok",
    description: "Sistem Kelola Komposisi & Formulasi Pakan Entok Makmur",
    images: ["https://entok-monitoring.vercel.app/og-image.png"],
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
