"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Smartphone, X } from "lucide-react";

import { usePwaInstall } from "./PwaInstallProvider";

export function InstallAppBanner() {
  const router = useRouter();
  const { platform, isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInstalled) {
      setShow(false);
      return;
    }

    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("install-banner-dismissed")) return;

    const canSurface = platform === "ios" || isInstallable;
    if (!canSurface) return;

    const timer = window.setTimeout(() => setShow(true), platform === "ios" ? 1800 : 900);
    return () => window.clearTimeout(timer);
  }, [isInstallable, isInstalled, platform]);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem("install-banner-dismissed", "1");
  };

  const handleAction = async () => {
    if (isInstallable && platform !== "ios") {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setShow(false);
      }
      return;
    }

    router.push("/instalar");
  };

  if (!show || !platform) return null;

  return (
    <div
      role="banner"
      className="app-install-banner fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-primary/20 bg-white/95 px-4 py-3 shadow-2xl shadow-primary/15 backdrop-blur-md dark:border-primary/25 dark:bg-gray-950/95 dark:shadow-none"
    >
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cta/15 dark:from-primary/25 dark:to-cta/20">
          <Smartphone className="h-5 w-5 text-primary dark:text-primary-light" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Instala Mi OTEC como app
          </p>
          {platform === "ios" ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              En iPhone se agrega desde Safari. La guia solo te muestra los pasos.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-text-primary dark:text-gray-200">
                Instalar ahora
              </span>{" "}
              abre el instalador real.{" "}
              <span className="font-semibold text-text-primary dark:text-gray-200">
                Ver ayuda
              </span>{" "}
              solo explica el proceso.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {(platform === "ios" || isInstallable) && (
              <button
                onClick={handleAction}
                className="flex items-center gap-1.5 rounded-xl bg-cta px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-cta/20 transition-colors hover:bg-cta-dark active:bg-cta-dark"
              >
                <Download className="h-3.5 w-3.5" />
                {platform === "ios" ? "Ver pasos" : "Instalar ahora"}
              </button>
            )}

            {platform !== "ios" && isInstallable ? (
              <button
                onClick={() => router.push("/instalar")}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900"
              >
                Ver ayuda
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
