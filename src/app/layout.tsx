import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";

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
  title: "Mi OTEC Intranet",
  description: "Intranet educativa OTEC",
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
          {children}
          <Toaster
            theme="system"
            position="top-right"
            richColors
            closeButton
            expand
            visibleToasts={5}
            toastOptions={{
              classNames: {
                toast:
                  "!border !border-gray-200 !bg-white dark:!border-gray-700 dark:!bg-gray-900",
                title:
                  "!text-sm !font-semibold !text-text-primary dark:!text-gray-100",
                description:
                  "!text-xs !text-text-secondary dark:!text-gray-300",
                actionButton: "!bg-primary !text-white",
                cancelButton:
                  "!bg-gray-100 !text-text-primary dark:!bg-gray-800 dark:!text-gray-100",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
