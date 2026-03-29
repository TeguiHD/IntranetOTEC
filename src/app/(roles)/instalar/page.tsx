"use client";

import {
  CheckCircle,
  Download,
  EllipsisVertical,
  Share2,
} from "lucide-react";
import Image from "next/image";

import { usePwaInstall } from "@/components/shared/PwaInstallProvider";

export default function InstalarPage() {
  const { platform, isIosSafari, isInstallable, isInstalled, promptInstall } =
    usePwaInstall();

  const handleInstall = async () => {
    await promptInstall();
  };

  const isAndroidManual = platform === "android" && !isInstallable;
  const isIosManual = platform === "ios";

  const platformLabel =
    platform === "android"
      ? "Android"
      : platform === "ios"
        ? "iPhone / iPad"
        : platform === "desktop"
          ? "Escritorio"
          : "Detectando dispositivo";

  const steps =
    platform === "ios"
      ? [
          isIosSafari
            ? 'Toca el boton Compartir de Safari.'
            : "Abre esta misma pagina en Safari.",
          'Selecciona "Agregar a pantalla de inicio".',
          'Activa "Abrir como app" si Safari muestra esa opcion.',
          'Confirma con "Agregar" para abrir Mi OTEC como app.',
        ]
      : platform === "desktop"
        ? [
            "Abre esta intranet en Chrome o Edge.",
            'Usa el icono de instalar del navegador o el menu correspondiente.',
            "Confirma la instalacion y se abrira en una ventana propia.",
          ]
        : [
            'Abre el menu ⋮ de Chrome.',
            'Toca "Instalar aplicacion" o "Agregar a pantalla de inicio".',
            "Confirma la instalacion para crear el icono de Mi OTEC.",
          ];

  const statusTitle = isInstallable
    ? "Instalacion directa disponible"
    : isIosManual
      ? "Instalacion guiada"
      : platform === "desktop"
        ? "Instalacion segun navegador"
        : "Instalacion desde el menu del navegador";

  const statusText = isInstallable
    ? "El boton verde de esta pagina y el del aviso inferior hacen exactamente lo mismo: abrir el instalador real del navegador."
    : isIosManual
      ? "En iPhone no aparece un instalador web directo. Esta pagina solo te deja los pasos claros para Safari."
      : platform === "desktop"
        ? "Si tu navegador lo permite, veras el boton de instalacion directa. Si no, usa el menu del navegador."
        : "Si Chrome aun no muestra el instalador directo, usa el menu y se instalara la misma app.";

  if (isInstalled) {
    return (
      <section className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[32px] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 text-center shadow-lg shadow-emerald-100/40 dark:border-emerald-500/20 dark:bg-gray-950 dark:shadow-none">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="mt-5 text-3xl font-bold text-text-primary dark:text-white">
            La app ya esta instalada
          </h1>
          <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">
            Abrela desde tu pantalla de inicio. Veras la misma intranet, pero en
            una ventana independiente y sin la barra del navegador.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary dark:text-white sm:text-3xl">
          Instalar app
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-text-secondary dark:text-gray-400">
          La app instalada y la intranet web son la misma cosa. Si ves el boton
          <span className="font-semibold text-text-primary dark:text-gray-200">
            {" "}Instalar ahora{" "}
          </span>
          ese boton si abre el instalador real.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <article className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-4">
            <Image
              src="/icon-192.png"
              alt="Mi OTEC"
              width={68}
              height={68}
              className="rounded-2xl shadow-sm"
            />
            <div>
              <p className="text-lg font-bold text-text-primary dark:text-white">
                Mi OTEC Intranet
              </p>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                {platformLabel}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4 dark:border-primary/15 dark:bg-primary/10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary dark:text-primary-light">
              {statusTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary dark:text-gray-300">
              {statusText}
            </p>
          </div>

          {isInstallable ? (
            <div className="mt-5 space-y-3">
              <button
                onClick={handleInstall}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cta text-sm font-semibold text-white shadow-md shadow-cta/20 transition-colors hover:bg-cta-dark"
              >
                <Download className="h-4 w-4" />
                {platform === "desktop"
                  ? "Instalar ahora en este equipo"
                  : "Instalar ahora"}
              </button>
              <p className="text-xs leading-5 text-text-secondary dark:text-gray-400">
                Si ves este mismo boton en el aviso inferior, hace exactamente lo
                mismo que aqui.
              </p>
            </div>
          ) : null}

          {isAndroidManual ? (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              Si el instalador directo aun no aparece, usa el menu del navegador.
              El resultado final es el mismo.
            </div>
          ) : null}

          {platform === "ios" ? (
            <div className="mt-5 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
              {isIosSafari
                ? "Estas en Safari, asi que solo sigue los pasos de la derecha."
                : "Abre esta misma pagina en Safari para poder agregar la app al inicio."}
            </div>
          ) : null}

          {!isInstallable && platform === "desktop" ? (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-gray-800 dark:text-gray-300">
              Chrome y Edge suelen permitir instalacion directa. Si no aparece,
              usa el menu del navegador.
            </div>
          ) : null}
        </article>

        <article className="rounded-3xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-bold text-text-primary dark:text-white">
            Pasos
          </h2>
          <ol className="mt-4 space-y-4">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-text-secondary dark:text-gray-400">
                  {step}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm leading-6 text-text-secondary dark:bg-gray-800/80 dark:text-gray-300">
            {platform === "ios" ? (
              <div className="flex items-start gap-3">
                <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
                <span>
                  En iPhone la instalacion se hace desde Compartir en Safari y,
                  si aparece, activando &ldquo;Abrir como app&rdquo;.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <EllipsisVertical className="mt-0.5 h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
                <span>
                  Si no ves <strong>Instalar ahora</strong>, usa el menu del navegador.
                  No cambia la app que se instala.
                </span>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200/80 px-4 py-3 text-sm leading-6 text-text-secondary dark:border-gray-700 dark:text-gray-400">
            Una vez instalada, se abre sin la barra del navegador y mantiene el
            mismo contenido de la intranet.
          </div>
        </article>
      </div>
    </section>
  );
}
