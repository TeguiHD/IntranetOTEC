import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft, ArrowRight, CheckCircle, ChevronLeft, Clock } from "lucide-react";

import { TUTORIALES_ALUMNO, getTutorialBySlug, getTutorialesAdyacentes } from "@/lib/tutoriales";

export function generateStaticParams() {
  return TUTORIALES_ALUMNO.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tutorial = getTutorialBySlug(slug, "alumno");
  return { title: tutorial?.titulo ?? "Tutorial" };
}

export default async function AlumnoTutorialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutorial = getTutorialBySlug(slug, "alumno");
  if (!tutorial) notFound();

  const { anterior, siguiente } = getTutorialesAdyacentes(slug, "alumno");

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/alumno/tutoriales"
          className="flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-primary dark:text-gray-400 dark:hover:text-primary-light"
        >
          <ChevronLeft className="h-4 w-4" />
          Tutoriales
        </Link>
      </div>

      <header>
        <h1 className="text-xl font-bold text-text-primary dark:text-white sm:text-2xl">
          {tutorial.titulo}
        </h1>
        <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
          {tutorial.descripcionLarga}
        </p>
      </header>

      {tutorial.disponible && tutorial.mp4 ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black dark:border-gray-800">
          <video
            className="aspect-video w-full"
            controls
            preload="metadata"
            poster={tutorial.poster}
            playsInline
          >
            <source src={tutorial.mp4} type="video/mp4" />
            Tu navegador no soporta video HTML5.
          </video>
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-center">
            <Clock className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
              Video próximamente
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
              Este tutorial estará disponible pronto.
            </p>
          </div>
        </div>
      )}

      {tutorial.pasos.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted dark:text-gray-500">
            Pasos del tutorial
          </h2>
          <ol className="space-y-3">
            {tutorial.pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-sm text-text-primary dark:text-white">{paso}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {(anterior || siguiente) && (
        <nav className="flex flex-col gap-3 sm:flex-row">
          {anterior ? (
            <Link
              href={`/alumno/tutoriales/${anterior.slug}`}
              className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <ArrowLeft className="h-5 w-5 shrink-0 text-text-muted dark:text-gray-500" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted dark:text-gray-500">Anterior</p>
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                  {anterior.titulo}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {siguiente ? (
            <Link
              href={`/alumno/tutoriales/${siguiente.slug}`}
              className="flex flex-1 items-center justify-end gap-3 rounded-xl border border-gray-200 bg-white p-4 text-right shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="min-w-0">
                <p className="text-xs text-text-muted dark:text-gray-500">Siguiente</p>
                <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                  {siguiente.titulo}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-text-muted dark:text-gray-500" />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      )}
    </section>
  );
}
