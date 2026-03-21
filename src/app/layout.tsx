import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";

import { GradientDefs } from "@/components/shared/GradientDefs";
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

export const metadata: Metadata = {
  title: {
    default: "Intranet OTEC Impulsate",
    template: "%s | OTEC Impulsate",
  },
  description: "Plataforma educativa para alumnos, docentes y administración de OTEC Impulsate.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
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
          <GradientDefs />
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
                  "!border-gray-200 dark:!border-gray-700 !bg-white dark:!bg-gray-800",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
