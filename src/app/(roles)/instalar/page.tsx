"use client";

import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  Chrome,
  Download,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";
import Link from "next/link";

import { usePwaInstall } from "@/components/shared/PwaInstallProvider";

type StepItem = {
  title: string;
  detail: string;
  icon: React.ReactNode;
};

export default function InstalarPage() {
  const { platform, isIosSafari, isInstallable, isInstalled, promptInstall } =
    usePwaInstall();
  const [mounted, setMounted] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  const platformLabel =
    platform === "android"
      ? "Android"
      : platform === "ios"
        ? "iPhone / iPad"
        : platform === "desktop"
          ? "Escritorio"
          : "Dispositivo";

  const installSteps = useMemo<StepItem[]>(() => {
    if (platform === "ios") {
      if (isIosSafari) {
        return [
          {
            title: "Abrir Compartir",
            detail: "Toca el icono de compartir (flecha hacia arriba) en Safari.",
            icon: <Share2 className="h-4 w-4 text-blue-500" />,
          },
          {
            title: "Agregar a pantalla de inicio",
            detail: 'Busca y toca "Agregar a pantalla de inicio".',
            icon: <Download className="h-4 w-4 text-blue-500" />,
          },
          {
            title: "Confirmar",
            detail: 'Pulsa "Agregar" y listo.',
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
          },
        ];
      }

      return [
        {
          title: "Abrir Safari",
          detail: "En iPhone/iPad, la instalación PWA solo funciona desde Safari.",
          icon: <Chrome className="h-4 w-4 text-amber-500" />,
        },
        {
          title: "Entrar a la intranet",
          detail: "Abre intranet.miotecimpulsate.cl en Safari.",
          icon: <Smartphone className="h-4 w-4 text-blue-500" />,
        },
        {
          title: "Compartir y agregar",
          detail: 'Toca Compartir y luego "Agregar a pantalla de inicio".',
          icon: <Share2 className="h-4 w-4 text-blue-500" />,
        },
      ];
    }

    if (platform === "desktop") {
      return [
        {
          title: "Abrir en Chrome o Edge",
          detail: "Navegador recomendado para instalar en escritorio.",
          icon: <Chrome className="h-4 w-4 text-primary dark:text-primary-light" />,
        },
        {
          title: "Instalar",
          detail: 'Usa el icono de instalar en la barra o Menú > "Instalar Mi OTEC".',
          icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
        },
        {
          title: "Confirmar",
          detail: "Se abrirá como app, en ventana propia.",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        },
      ];
    }

    if (isInstallable) {
      return [
        {
          title: "Instalar ahora",
          detail: "Pulsa el botón y se abrirá el instalador de Android.",
          icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
        },
        {
          title: "Confirmar",
          detail: "Pulsa Instalar y espera unos segundos.",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
        },
      ];
    }

    return [
      {
        title: "Abrir menú de Chrome",
        detail: "Toca los 3 puntos (⋮) arriba a la derecha.",
        icon: <Chrome className="h-4 w-4 text-primary dark:text-primary-light" />,
      },
      {
        title: "Instalar aplicación",
        detail: 'Selecciona "Instalar aplicación" o "Agregar a pantalla de inicio".',
        icon: <Download className="h-4 w-4 text-primary dark:text-primary-light" />,
      },
      {
        title: "Confirmar",
        detail: "Listo, aparecerá en tu pantalla de inicio.",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
      },
    ];
  }, [isInstallable, isIosSafari, platform]);

  const showNativeInstallButton = platform !== "ios" && isInstallable;

  if (!mounted) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </section>
    );
  }

  if (isInstalled) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-500/20 dark:bg-emerald-950/20">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">
          App instalada
        </h1>
        <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
          Mi OTEC ya está en tu pantalla de inicio.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ir al inicio
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <header className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">
          Instalar app
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Detectamos: {platformLabel}. Sigue estos pasos y tendrás Mi OTEC como app.
        </p>

        {showNativeInstallButton ? (
          <button
            onClick={handleInstall}
            disabled={installing}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cta px-4 py-2 text-sm font-semibold text-white hover:bg-cta-dark disabled:opacity-70"
          >
            <Download className="h-4 w-4" />
            {installing ? "Abriendo instalador..." : "Instalar ahora"}
          </button>
        ) : null}
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
          {platform === "desktop" ? (
            <Monitor className="h-4 w-4 text-text-secondary dark:text-gray-400" />
          ) : (
            <Smartphone className="h-4 w-4 text-text-secondary dark:text-gray-400" />
          )}
          Instrucciones
        </h2>

        <ol className="mt-4 space-y-3">
          {installSteps.map((step, index) => (
            <li
              key={`${step.title}-${index}`}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="mt-0.5">{step.icon}</div>
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  {index + 1}. {step.title}
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  {step.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </section>
  );
}
