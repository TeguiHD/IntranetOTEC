"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  BookOpen,
  CheckCircle,
  CreditCard,
  User,
  X,
} from "lucide-react";

const STORAGE_KEY = "otec.onboarding.done";

const PASOS = [
  {
    icon: User,
    color: "#8B3A9E",
    titulo: "Completa tu perfil",
    descripcion: "Asegúrate de que tu nombre y RUT estén actualizados.",
    href: "/alumno/perfil",
    ctaLabel: "Ir a mi perfil",
  },
  {
    icon: BookOpen,
    color: "#3B82F6",
    titulo: "Revisa tus cursos",
    descripcion: "Accede a tus asignaturas, clases y material de estudio.",
    href: "/alumno/asignaturas",
    ctaLabel: "Ver mis cursos",
  },
  {
    icon: CreditCard,
    color: "#EC4899",
    titulo: "Descarga tu credencial",
    descripcion: "Tu credencial de alumno te identifica en la institución.",
    href: "/alumno/solicitudes/credencial",
    ctaLabel: "Obtener credencial",
  },
];

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const cerrar = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  const PasoActual = PASOS[paso];
  const Icon = PasoActual.icon;
  const esFinal = paso === PASOS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
        {/* Close */}
        <button
          onClick={cerrar}
          className="absolute right-4 top-4 rounded-lg p-1 text-text-muted hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-gray-800"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6">
          {/* Progress dots */}
          <div className="mb-6 flex items-center justify-center gap-2">
            {PASOS.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === paso ? "w-6 bg-primary" : "w-2 bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${PasoActual.color}20` }}
          >
            <Icon className="h-8 w-8" style={{ color: PasoActual.color }} />
          </div>

          {/* Content */}
          <h2 className="mb-1 text-center text-lg font-bold text-text-primary dark:text-white">
            {PasoActual.titulo}
          </h2>
          <p className="mb-6 text-center text-sm text-text-secondary dark:text-gray-400">
            {PasoActual.descripcion}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Link
              href={PasoActual.href}
              onClick={cerrar}
              className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg"
            >
              {PasoActual.ctaLabel}
            </Link>
            <button
              onClick={() => {
                if (esFinal) {
                  cerrar();
                } else {
                  setPaso((p) => p + 1);
                }
              }}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-text-secondary transition-colors hover:text-text-primary dark:text-gray-400 dark:hover:text-white"
            >
              {esFinal ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Listo, comenzar
                </>
              ) : (
                "Siguiente paso →"
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          <p className="text-center text-xs text-text-muted dark:text-gray-500">
            Paso {paso + 1} de {PASOS.length} · Bienvenido a Mi OTEC
          </p>
        </div>
      </div>
    </div>
  );
}
