"use client";

import { useEffect, useState } from "react";
import { X, Download, Smartphone } from "lucide-react";

type Platform = "android" | "ios" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua) && !("MSStream" in window);
  const isAndroid = /android/i.test(ua);
  return isIos ? "ios" : isAndroid ? "android" : null;
}

function isAlreadyInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export function InstallAppBanner() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    if (isAlreadyInstalled()) return;
    if (sessionStorage.getItem("install-banner-dismissed")) return;

    const p = detectPlatform();
    setPlatform(p);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
      setShow(true);
    };

    if (p === "android") {
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }

    if (p === "ios") {
      // En iOS mostramos instrucciones manuales
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("install-banner-dismissed", "1");
  };

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShow(false);
    }
  };

  if (!show || !platform) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-purple-200 bg-white px-4 py-3 shadow-xl shadow-purple-100/60 dark:border-purple-800/40 dark:bg-gray-900 dark:shadow-none"
    >
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
          <Smartphone className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Instala Mi OTEC
          </p>
          {platform === "ios" ? (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Toca <span className="font-medium">Compartir</span> y luego <span className="font-medium">&ldquo;Agregar a pantalla de inicio&rdquo;</span>
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Accede rápido desde tu pantalla de inicio, sin App Store.
            </p>
          )}
          {platform === "android" && (
            <button
              onClick={install}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 active:bg-purple-800"
            >
              <Download className="h-3.5 w-3.5" />
              Instalar app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
