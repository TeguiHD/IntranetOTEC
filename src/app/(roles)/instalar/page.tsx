"use client";

import { useEffect, useState } from "react";
import { Smartphone, Monitor, CheckCircle, Download } from "lucide-react";
import Image from "next/image";

type Platform = "android" | "ios" | "desktop" | null;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) && !("MSStream" in window)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

export default function InstalarPage() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [installed, setInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isInstalled());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setInstalling(false);
  };

  if (installed) {
    return (
      <section className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-500" />
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">
          ¡App instalada!
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-400">
          Mi OTEC ya está en tu pantalla de inicio.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Instalar App
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Accede rápido desde tu dispositivo, sin App Store.
          </p>
        </div>
      </header>

      <article className="flex flex-col items-center gap-5 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <Image
          src="/icon-192.png"
          alt="Mi OTEC"
          width={80}
          height={80}
          className="rounded-2xl shadow-md"
        />
        <div className="text-center">
          <p className="font-semibold text-text-primary dark:text-white">Mi OTEC Intranet</p>
          <p className="text-sm text-text-secondary dark:text-gray-400">Impulsate & Emprende</p>
        </div>

        {platform === "android" && (
          <div className="w-full space-y-4">
            {deferredPrompt ? (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {installing ? "Instalando…" : "Instalar en este dispositivo"}
              </button>
            ) : (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <p className="font-medium">Instala desde el navegador</p>
                <p className="mt-1">Toca el menú <strong>⋮</strong> de Chrome y selecciona <strong>&ldquo;Instalar aplicación&rdquo;</strong> o <strong>&ldquo;Agregar a pantalla de inicio&rdquo;</strong>.</p>
              </div>
            )}
          </div>
        )}

        {platform === "ios" && (
          <div className="w-full space-y-3 text-sm">
            <p className="text-center font-medium text-text-primary dark:text-white">
              Sigue estos pasos en Safari:
            </p>
            <ol className="space-y-3">
              {[
                { n: 1, text: 'Toca el botón Compartir (□↑) en la barra inferior de Safari' },
                { n: 2, text: 'Desplázate hacia abajo y toca "Agregar a pantalla de inicio"' },
                { n: 3, text: 'Confirma tocando "Agregar"' },
              ].map((step) => (
                <li key={step.n} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {step.n}
                  </span>
                  <span className="text-text-secondary dark:text-gray-400">{step.text}</span>
                </li>
              ))}
            </ol>
            <p className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
              Solo funciona desde Safari. Chrome en iOS no permite instalar PWA.
            </p>
          </div>
        )}

        {platform === "desktop" && (
          <div className="w-full space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800">
              <Monitor className="h-8 w-8 text-gray-400" />
              <div>
                <p className="font-medium text-text-primary dark:text-white">Estás en escritorio</p>
                <p className="mt-0.5 text-text-secondary dark:text-gray-400">
                  Abre esta página desde tu celular para instalar la app.
                </p>
              </div>
            </div>
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {installing ? "Instalando…" : "Instalar en este equipo"}
              </button>
            )}
          </div>
        )}
      </article>
    </section>
  );
}
