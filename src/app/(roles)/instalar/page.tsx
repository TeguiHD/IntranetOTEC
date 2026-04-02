"use client";

import { useEffect, useState } from "react";

import { ArrowRight, CheckCircle2, Download, Share2 } from "lucide-react";
import Link from "next/link";

import { usePwaInstall } from "@/components/shared/PwaInstallProvider";

export default function InstalarPage() {
  const { platform, isIosSafari, isInstallable, isInstalled, promptInstall } = usePwaInstall();

  const [mounted, setMounted] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInstall = async () => {
    if (isInstallable) {
      setInstalling(true);
      await promptInstall();
      setInstalling(false);
    } else if (isIosSafari) {
      setShowIosModal(true);
    }
  };

  if (!mounted) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </section>
    );
  }

  if (isInstalled) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[32px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-10 text-center shadow-xl shadow-emerald-100/40 dark:border-emerald-500/20 dark:from-emerald-950/40 dark:via-gray-950 dark:to-teal-950/30">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-text-primary dark:text-white sm:text-3xl">
            App instalada
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary dark:text-gray-400">
            Abre <strong className="text-text-primary dark:text-white">Mi OTEC</strong> desde tu pantalla de inicio.
            Funciona igual que la intranet web, pero sin la barra del navegador.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Ir al inicio
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // iOS en browser que no es Safari
  if (platform === "ios" && !isIosSafari) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50 p-8 text-center dark:border-amber-500/20 dark:bg-amber-950/30">
          <p className="text-base font-semibold text-amber-800 dark:text-amber-300">
            Abre esta página en Safari para instalar la app
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            En iPhone e iPad, la instalación solo funciona desde Safari.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="flex flex-col items-center gap-6 rounded-[32px] border border-gray-200/80 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
          <Download className="h-10 w-10 text-primary dark:text-primary-light" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white sm:text-3xl">
            Instalar Mi OTEC
          </h1>
          <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
            Accede más rápido desde tu pantalla de inicio, sin abrir el navegador.
          </p>
        </div>

        <button
          onClick={handleInstall}
          disabled={installing}
          className="inline-flex items-center gap-2 rounded-xl bg-cta px-8 py-3 text-base font-semibold text-white shadow-md shadow-cta/20 transition-all hover:bg-cta-dark hover:shadow-lg disabled:opacity-70"
        >
          {installing ? (
            "Abriendo instalador..."
          ) : (
            <>
              <Download className="h-5 w-5" />
              Instalar
            </>
          )}
        </button>
      </div>

      {/* Modal iOS */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-lg font-bold text-text-primary dark:text-white">
              Instalar en iPhone / iPad
            </h2>
            <ol className="mt-4 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                <div className="text-sm text-text-primary dark:text-gray-200">
                  Toca el ícono{" "}
                  <Share2 className="mb-0.5 inline h-4 w-4 text-blue-500" />{" "}
                  <strong>Compartir</strong> en la barra de Safari
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                <div className="text-sm text-text-primary dark:text-gray-200">
                  Selecciona <strong>&quot;Agregar a pantalla de inicio&quot;</strong> y toca{" "}
                  <strong>Agregar</strong>
                </div>
              </li>
            </ol>
            <button
              onClick={() => setShowIosModal(false)}
              className="mt-6 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
