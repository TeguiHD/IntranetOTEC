// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)

import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";

import { GradientDefs } from "@/components/shared/GradientDefs";
import { PwaInstallProvider } from "@/components/shared/PwaInstallProvider";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/shared/ThemeProvider";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: "#5a1f68",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: "Mi OTEC",
  title: {
    default: "Mi OTEC Intranet",
    template: "%s | Mi OTEC",
  },
  description: "Intranet educativa OTEC - Impulsate & Emprende",
  manifest: "/manifest.json?v=20260511",
  icons: {
    icon: [
      { url: "/icon-192-v2.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512-v2.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-180-v2.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mi OTEC",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "msapplication-TileColor": "#5a1f68",
    "msapplication-tap-highlight": "no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <PwaInstallProvider>
            <GradientDefs />
            <ServiceWorkerRegister />
            {children}
            <Toaster
              theme="system"
              position="top-right"
              richColors
              closeButton
              expand
              visibleToasts={5}
              gap={8}
              toastOptions={{
                duration: 4000,
                classNames: {
                  toast:
                    "!rounded-xl !border !border-gray-200/80 !bg-white !shadow-lg !shadow-gray-200/30 dark:!border-gray-700 dark:!bg-gray-900 dark:!shadow-none",
                  title:
                    "!text-sm !font-semibold !text-text-primary dark:!text-gray-100",
                  description:
                    "!text-xs !text-text-secondary dark:!text-gray-300",
                  actionButton:
                    "!rounded-lg !bg-primary !text-white !font-medium !text-xs",
                  cancelButton:
                    "!rounded-lg !bg-gray-100 !text-text-primary dark:!bg-gray-800 dark:!text-gray-100 !font-medium !text-xs",
                  closeButton:
                    "!h-6 !w-6 !rounded-full !border-gray-200 dark:!border-gray-700 !bg-white dark:!bg-gray-800 !top-1/2 !-translate-y-1/2 !left-2 !flex !items-center !justify-center !p-0",
                },
              }}
            />
          </PwaInstallProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
