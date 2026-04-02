"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Chrome,
  Download,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

import { usePwaInstall } from "@/components/shared/PwaInstallProvider";

type InstallFlow =
  | "android-native"
  | "android-manual"
  | "ios-safari"
  | "ios-other"
  | "desktop-native"
  | "desktop-manual"
  | "unknown";

type StepItem = {
  title: string;
  detail: string;
  icon: React.ReactNode;
};

const browserLabel: Record<string, string> = {
  safari: "Safari",
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  opera: "Opera",
  samsung: "Samsung Internet",
  other: "Navegador",
};

function resolveFlow(params: {
  platform: "android" | "ios" | "desktop" | null;
  isIosSafari: boolean;
  isInstallable: boolean;
}): InstallFlow {
  const { platform, isIosSafari, isInstallable } = params;

  if (platform === "android") {
    return isInstallable ? "android-native" : "android-manual";
  }

  if (platform === "ios") {
    return isIosSafari ? "ios-safari" : "ios-other";
  }

  if (platform === "desktop") {
    return isInstallable ? "desktop-native" : "desktop-manual";
  }

  return "unknown";
}

export default function InstalarPage() {
  const { platform, browser, isIosSafari, isInstallable, isInstalled, promptInstall } =
    usePwaInstall();

  const [mounted, setMounted] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const flow = useMemo(
    () => resolveFlow({ platform, isIosSafari, isInstallable }),
    [platform, isIosSafari, isInstallable],
  );

  const detectionLabel = useMemo(() => {
    const device =
      platform === "android"
        ? "Android"
        : platform === "ios"
          ? "iPhone / iPad"
          : platform === "desktop"
            ? "Escritorio"
            : "Dispositivo";

    const browserText = browser ? (browserLabel[browser] ?? "Navegador") : "Navegador";
    return `${device} - ${browserText}`;
  }, [browser, platform]);

  const steps = useMemo<StepItem[]>(() => {
    switch (flow) {
      case "android-native":
        return [
          {
            title: "Toca Instalar ahora",
            detail: "Se abrira el instalador nativo de Android.",
            icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
          {
            title: "Confirma instalacion",
            detail: "Pulsa Instalar en el cuadro del sistema.",
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          },
        ];
      case "android-manual":
        return [
          {
            title: "Abrir menu del navegador",
            detail: "Toca los 3 puntos (...) arriba a la derecha.",
            icon: <Chrome className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
          {
            title: "Instalar aplicacion",
            detail: 'Selecciona "Instalar aplicacion" o "Agregar a pantalla de inicio".',
            icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
        ];
      case "ios-safari":
        return [
          {
            title: "Abrir Compartir",
            detail: "Toca el icono de compartir en la barra de Safari.",
            icon: <Share2 className="h-4 w-4 text-blue-500" />,
          },
          {
            title: "Agregar a pantalla de inicio",
            detail: 'Toca "Agregar a pantalla de inicio" y luego "Agregar".',
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          },
        ];
      case "ios-other":
        return [
          {
            title: "Abrir Safari",
            detail: "En iPhone/iPad la instalacion solo funciona en Safari.",
            icon: <Chrome className="h-4 w-4 text-amber-500" />,
          },
          {
            title: "Entrar a la intranet y agregar",
            detail: 'En Safari: Compartir > "Agregar a pantalla de inicio".',
            icon: <Share2 className="h-4 w-4 text-blue-500" />,
          },
        ];
      case "desktop-native":
        return [
          {
            title: "Toca Instalar ahora",
            detail: "Se abrira el instalador del navegador.",
            icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
          {
            title: "Confirma",
            detail: "Se abrira como app en ventana independiente.",
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          },
        ];
      case "desktop-manual":
        return [
          {
            title: "Usa Chrome o Edge",
            detail: "Son los navegadores mas confiables para instalar PWA.",
            icon: <Monitor className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
          {
            title: "Instalar Mi OTEC",
            detail: "Busca la opcion de instalar en la barra o en el menu.",
            icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
        ];
      default:
        return [
          {
            title: "Abre la intranet desde tu movil",
            detail: "En Android o iPhone veras instrucciones especificas automaticamente.",
            icon: <Smartphone className="h-4 w-4 text-primary dark:text-primary-light" />,
          },
        ];
    }
  }, [flow]);

  const showInstallButton = flow === "android-native" || flow === "desktop-native";

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
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
            App ya instalada
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

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Instalar app</h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Detectado: {detectionLabel}
        </p>

        {showInstallButton ? (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cta-dark disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            {installing ? "Abriendo instalador..." : "Instalar ahora"}
          </button>
        ) : null}
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-base font-semibold text-text-primary dark:text-white">Instrucciones</h2>
        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => (
            <li
              key={`${step.title}-${index}`}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="mt-0.5">{step.icon}</div>
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  {index + 1}. {step.title}
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}
