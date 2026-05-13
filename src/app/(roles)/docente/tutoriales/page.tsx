import Image from "next/image";
import Link from "next/link";

import { CheckCircle, Clock, PlayCircle } from "lucide-react";

import { TUTORIALES_DOCENTE, type Tutorial } from "@/lib/tutoriales";

export const metadata = {
  title: "Tutoriales",
};

function TutorialCard({ tutorial, rol }: { tutorial: Tutorial; rol: "alumno" | "docente" }) {
  const content = (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow dark:bg-gray-900 ${
        tutorial.disponible
          ? "border-gray-200 hover:shadow-md dark:border-gray-800"
          : "border-dashed border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="relative aspect-video w-full bg-gray-100 dark:bg-gray-800">
        {tutorial.disponible ? (
          <>
            <Image
              src={tutorial.poster}
              alt={tutorial.titulo}
              width={640}
              height={360}
              className="aspect-video w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayCircle className="h-10 w-10 text-white drop-shadow-lg" />
            </div>
          </>
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <Clock className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">
            {tutorial.titulo}
          </h3>
          {!tutorial.disponible && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              Próximamente
            </span>
          )}
        </div>
        <p className="text-xs text-text-secondary dark:text-gray-400">{tutorial.descripcionCorta}</p>
        <span className="mt-auto text-xs font-medium text-primary dark:text-primary-light">
          {tutorial.duracion}
        </span>
      </div>
    </article>
  );

  if (!tutorial.disponible) return content;

  return (
    <Link href={`/${rol}/tutoriales/${tutorial.slug}`} className="block h-full">
      {content}
    </Link>
  );
}

export default function DocenteTutorialesPage() {
  const principales = TUTORIALES_DOCENTE.filter((t) => t.categoria === "principal");
  const completo = TUTORIALES_DOCENTE.find((t) => t.categoria === "completo");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Tutoriales
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Aprende a usar la intranet paso a paso, módulo por módulo.
        </p>
      </header>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted dark:text-gray-500">
          Módulos del docente
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {principales.map((t) => (
            <TutorialCard key={t.slug} tutorial={t} rol="docente" />
          ))}
        </div>
      </div>

      {completo && completo.disponible && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-muted dark:text-gray-500">
            Tutorial completo
          </h2>
          <Link href={`/docente/tutoriales/${completo.slug}`} className="block">
            <article className="group flex flex-col gap-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900 sm:flex-row">
              <div className="relative sm:w-72 sm:shrink-0">
                <Image
                  src={completo.poster}
                  alt={completo.titulo}
                  width={640}
                  height={360}
                  className="aspect-video w-full object-cover sm:h-full sm:aspect-auto"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <PlayCircle className="h-12 w-12 text-white drop-shadow-lg" />
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3 p-5">
                <span className="self-start rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                  Completo
                </span>
                <h3 className="text-base font-semibold text-text-primary dark:text-white">
                  {completo.titulo}
                </h3>
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  {completo.descripcionCorta}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted dark:text-gray-500">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Todos los módulos en un solo video
                </div>
              </div>
            </article>
          </Link>
        </div>
      )}
    </section>
  );
}
