import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#22c55e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://brilho-magico-saas.vercel.app'),
  title: "Brilho Mágico - Studio Automotivo",
  description: "Agendamento online e gestão inteligente para Lava-Rápido e Studio Automotivo. Agende a lavagem do seu carro ou moto sem filas e acumule pontos!",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brilho Mágico",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico" }
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://brilho-magico-saas.vercel.app",
    siteName: "Brilho Mágico - Studio Automotivo",
    title: "Brilho Mágico - Studio Automotivo",
    description: "Agende a lavagem do seu carro ou moto 100% online, sem filas e ganhe pontos no Cartão Fidelidade!",
    images: [
      {
        url: "https://brilho-magico-saas.vercel.app/og-image.jpg",
        width: 1024,
        height: 1024,
        alt: "Brilho Mágico - Studio Automotivo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brilho Mágico - Studio Automotivo",
    description: "Agende a lavagem do seu carro ou moto 100% online, sem filas e ganhe pontos no Cartão Fidelidade!",
    images: ["https://brilho-magico-saas.vercel.app/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Brilho Mágico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Open Graph Meta Tags explícitas para WhatsApp / Telegram / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Brilho Mágico - Studio Automotivo" />
        <meta property="og:description" content="Agende a lavagem do seu carro ou moto 100% online, sem filas e ganhe pontos no Cartão Fidelidade!" />
        <meta property="og:image" content="https://brilho-magico-saas.vercel.app/og-image.jpg" />
        <meta property="og:image:secure_url" content="https://brilho-magico-saas.vercel.app/og-image.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="1024" />
        <meta property="og:url" content="https://brilho-magico-saas.vercel.app/agendar/brilho-magico" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://brilho-magico-saas.vercel.app/og-image.jpg" />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
