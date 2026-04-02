"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Download, Smartphone, X } from "lucide-react";

import { usePwaInstall } from "./PwaInstallProvider";

const BANNER_LAST_SHOWN_KEY = "install-banner-last-shown";
const BANNER_DISMISS_UNTIL_KEY = "install-banner-dismissed-until";
const BANNER_SHOW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const BANNER_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;

export function InstallAppBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const { platform, isInstallable, isInstalled, promptInstall } = usePwaInstall();
  const [show, setShow] = useState(false);

  const isDashboardPath = useMemo(
    () => pathname === "/admin" || pathname === "/alumno" || pathname === "/docente",
    [pathname],
  );

  useEffect(() => {
    if (!isDashboardPath) {
      setShow(false);
      return;
    }

    if (isInstalled) {
      setShow(false);
      return;
    }

    if (typeof window === "undefined") return;

    const isMobileViewport = window.matchMedia("(max-width: 1023px)").matches;
    if (!isMobileViewport) return;

    const now = Date.now();
    const dismissedUntil = Number(
      window.localStorage.getItem(BANNER_DISMISS_UNTIL_KEY) ?? "0",
    );
    if (Number.isFinite(dismissedUntil) && dismissedUntil > now) return;

    const lastShownAt = Number(
      window.localStorage.getItem(BANNER_LAST_SHOWN_KEY) ?? "0",
    );
    if (
      Number.isFinite(lastShownAt) &&
      lastShownAt > 0 &&
      now - lastShownAt < BANNER_SHOW_COOLDOWN_MS
    ) {
      return;
    }

    const canSurface = platform === "ios" || isInstallable;
    if (!canSurface) return;

    const timer = window.setTimeout(() => {
      setShow(true);
      window.localStorage.setItem(BANNER_LAST_SHOWN_KEY, String(Date.now()));
    }, platform === "ios" ? 1800 : 1200);

    return () => window.clearTimeout(timer);
  }, [isDashboardPath, isInstallable, isInstalled, platform]);

  const dismiss = () => {
    setShow(false);
    window.localStorage.setItem(
      BANNER_DISMISS_UNTIL_KEY,
      String(Date.now() + BANNER_DISMISS_MS),
    );
  };

  const handleAction = async () => {
    if (isInstallable && platform !== "ios") {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        setShow(false);
        window.localStorage.setItem(
          BANNER_DISMISS_UNTIL_KEY,
          String(Date.now() + BANNER_DISMISS_MS),
        );
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
              En iPhone se instala desde Safari. Te mostramos solo los pasos.
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-text-primary dark:text-gray-200">
                Instalar ahora
              </span>{" "}
              abre el instalador. <span className="font-semibold text-text-primary dark:text-gray-200">
                Ver ayuda
              </span>{" "}
              muestra instrucciones.
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
