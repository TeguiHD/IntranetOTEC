"use client";

import { useEffect, useState } from "react";

import {
  ArrowRight,
  CheckCircle2,
  Chrome,
  Download,
  Monitor,
  Share2,
  Smartphone,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { usePwaInstall } from "@/components/shared/PwaInstallProvider";

// iOS Share icon SVG (matches Safari's actual icon)
function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function IosAddIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

type StepItem = {
  icon: React.ReactNode;
  text: string;
  highlight?: string; // texto en negrita dentro del paso
};

export default function InstalarPage() {
  const { platform, isIosSafari, isInstallable, isInstalled, promptInstall } =
    usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
  };

  const isIosChrome = platform === "ios" && !isIosSafari;
  const isAndroidManual = platform === "android" && !isInstallable;

  const platformLabel =
    platform === "android"
      ? "Android"
      : platform === "ios"
        ? "iPhone / iPad"
        : platform === "desktop"
          ? "Escritorio (PC / Mac)"
          : "Detectando dispositivo...";

  const PlatformIcon =
    platform === "desktop" ? Monitor : platform === "ios" || platform === "android" ? Smartphone : Wifi;

  const steps: StepItem[] =
    platform === "ios"
      ? isIosSafari
        ? [
            {
              icon: <IosShareIcon className="h-5 w-5 text-blue-500" />,
              text: 'Toca el botón Compartir (la flecha hacia arriba) en la barra inferior de Safari.',
              highlight: "Compartir",
            },
            {
              icon: <IosAddIcon className="h-5 w-5 text-blue-500" />,
              text: 'Desliza hacia abajo y toca "Agregar a pantalla de inicio".',
              highlight: "Agregar a pantalla de inicio",
            },
            {
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
              text: 'Si aparece la opción "Abrir como app", actívala. Luego toca "Agregar".',
              highlight: "Agregar",
            },
          ]
        : [
            {
              icon: <Chrome className="h-5 w-5 text-amber-500" />,
              text: "Actualmente estás en un navegador distinto a Safari (Chrome, Firefox, etc.).",
            },
            {
              icon: <IosShareIcon className="h-5 w-5 text-blue-500" />,
              text: 'Abre Safari en tu iPhone/iPad y navega a intranet.miotecimpulsate.cl',
              highlight: "Safari",
            },
            {
              icon: <IosAddIcon className="h-5 w-5 text-blue-500" />,
              text: 'Toca Compartir → "Agregar a pantalla de inicio" → "Agregar".',
              highlight: "Agregar",
            },
          ]
      : platform === "desktop"
        ? [
            {
              icon: <Chrome className="h-5 w-5 text-primary" />,
              text: "Abre esta intranet en Chrome o Edge (recomendado para escritorio).",
              highlight: "Chrome o Edge",
            },
            {
              icon: <Download className="h-5 w-5 text-primary" />,
              text: 'Haz clic en el ícono de instalar (⬇) que aparece en la barra de dirección, o en Menú → "Instalar Mi OTEC".',
              highlight: "Instalar Mi OTEC",
            },
            {
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
              text: "Confirma la instalación. La app se abrirá en una ventana propia sin barra del navegador.",
            },
          ]
        : [
            // Android
            {
              icon: <Chrome className="h-5 w-5 text-primary" />,
              text: isInstallable
                ? 'Toca "Instalar ahora" en esta página o en el aviso que apareció.'
                : 'Abre el menú ⋮ de Chrome (arriba a la derecha).',
              highlight: isInstallable ? "Instalar ahora" : "menú ⋮",
            },
            {
              icon: <Download className="h-5 w-5 text-primary" />,
              text: isInstallable
                ? "El instalador del sistema te pedirá confirmación."
                : '"Instalar aplicación" o "Agregar a pantalla de inicio".',
              highlight: !isInstallable ? "Instalar aplicación" : undefined,
            },
            {
              icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
              text: "Confirma la instalación. El ícono de Mi OTEC aparecerá en tu pantalla de inicio.",
            },
          ];

  if (!mounted) {
    return (
      <section className="mx-auto max-w-3xl space-y-5">
        <div className="h-48 animate-pulse rounded-3xl bg-gray-100 dark:bg-gray-800" />
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
            ¡App ya instalada! 🎉
          </h1>
          <p className="mt-3 text-sm leading-6 text-text-secondary dark:text-gray-400">
            Abre <strong className="text-text-primary dark:text-white">Mi OTEC</strong> desde tu pantalla de inicio.{" "}
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
    <section className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-cta/20">
            <Smartphone className="h-5 w-5 text-primary dark:text-primary-light" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-white sm:text-3xl">
            Instalar app
          </h1>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary dark:text-gray-400">
          Instala Mi OTEC como una app en tu dispositivo para acceder más rápido, sin barra del
          navegador y con mejor experiencia móvil.
        </p>
      </header>

      {/* iOS Chrome warning banner */}
      {isIosChrome && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-4 dark:border-amber-700/30 dark:bg-amber-950/20">
          <Chrome className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Estás usando Chrome en iPhone
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              En iPhone solo <strong>Safari</strong> permite instalar apps web. Abre Safari y navega a{" "}
              <span className="font-mono">intranet.miotecimpulsate.cl</span> para continuar.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        {/* Left: App card + Install button */}
        <article className="flex flex-col gap-4 rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {/* App identity */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Image
                src="/icon-192.png"
                alt="Mi OTEC"
                width={72}
                height={72}
                className="rounded-2xl shadow-md"
              />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary dark:text-white">
                Mi OTEC Intranet
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <PlatformIcon className="h-3.5 w-3.5 text-text-secondary dark:text-gray-400" />
                <span className="text-xs text-text-secondary dark:text-gray-400">
                  {platformLabel}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  Disponible para instalar
                </span>
              </div>
            </div>
          </div>

          {/* Features list */}
          <ul className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            {[
              "Acceso rápido desde tu pantalla de inicio",
              "Sin barra del navegador — experiencia de app nativa",
              "Notificaciones push (si las activas)",
              "Funciona en cualquier dispositivo (iOS y Android)",
            ].map((feat) => (
              <li key={feat} className="flex items-start gap-2 text-xs text-text-secondary dark:text-gray-400">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                {feat}
              </li>
            ))}
          </ul>

          {/* Install CTA */}
          {isInstallable && (
            <button
              onClick={handleInstall}
              disabled={installing}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cta to-cta-dark text-sm font-semibold text-white shadow-md shadow-cta/20 transition-all hover:shadow-lg hover:shadow-cta/30 active:scale-[0.98] disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              {installing ? "Abriendo instalador..." : platform === "desktop" ? "Instalar en este equipo" : "Instalar ahora"}
            </button>
          )}

          {isAndroidManual && (
            <div className="mt-2 rounded-2xl border border-amber-200/60 bg-amber-50 p-3.5 text-xs leading-5 text-amber-800 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-300">
              <strong>¿No aparece el botón de instalar?</strong> Chrome a veces tarda unos segundos en habilitarlo.
              Usa el menú ⋮ del navegador como alternativa — el resultado es idéntico.
            </div>
          )}
        </article>

        {/* Right: Step-by-step */}
        <article className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="flex items-center gap-2 text-base font-bold text-text-primary dark:text-white">
            {platform === "ios" && isIosSafari ? (
              <IosShareIcon className="h-5 w-5 text-blue-500" />
            ) : (
              <Download className="h-5 w-5 text-primary dark:text-primary-light" />
            )}
            {isIosChrome
              ? "Paso previo: abre Safari"
              : platform === "ios"
                ? "Instalar desde Safari"
                : platform === "desktop"
                  ? "Instrucciones para escritorio"
                  : "Instalar en Android"}
          </h2>

          <ol className="mt-5 space-y-5">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-xs font-bold text-text-primary dark:text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm leading-6 text-text-secondary dark:text-gray-400">
                    {step.text}
                  </p>
                  {step.icon && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 dark:border-gray-800 dark:bg-gray-800/80">
                      {step.icon}
                      {step.highlight && (
                        <span className="text-xs font-semibold text-text-primary dark:text-white">
                          {step.highlight}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Platform-specific note */}
          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/60">
            {platform === "ios" ? (
              <>
                <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-xs leading-5 text-text-secondary dark:text-gray-400">
                  {isIosSafari
                    ? "El ícono de Compartir (↑) está en la barra inferior de Safari. Desliza el menú hacia arriba hasta ver \"Agregar a pantalla de inicio\"."
                    : "Solo Safari permite instalar apps web en iPhone e iPad. Chrome y otros navegadores no tienen esa opción."}
                </p>
              </>
            ) : (
              <>
                <Download className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
                <p className="text-xs leading-5 text-text-secondary dark:text-gray-400">
                  {platform === "desktop"
                    ? "La app instalada y la versión web son idénticas. La diferencia es que se abre en su propia ventana, sin la barra del navegador."
                    : "Una vez instalada, encontrarás Mi OTEC en tu pantalla de inicio como cualquier app. Siempre tendrá el mismo contenido que la versión web."}
                </p>
              </>
            )}
          </div>
        </article>
      </div>

      {/* QR hint for desktop viewing on mobile */}
      {(platform === "desktop" || !platform) && (
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-gray-50/60 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/60">
          <Smartphone className="h-8 w-8 shrink-0 text-text-secondary dark:text-gray-500" />
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white">
              ¿Quieres instalarla en tu teléfono?
            </p>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
              Abre <span className="font-mono font-semibold">intranet.miotecimpulsate.cl</span> en el navegador de tu teléfono
              y vuelve a esta página — te aparecerán las instrucciones para tu dispositivo.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
