import { CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

import { registrarAsistenciaQrAction } from "@/actions/qr-asistencia";

type Props = { params: Promise<{ token: string }> };

export const metadata = { title: "Registro de Asistencia" };

export default async function QrAsistenciaPage({ params }: Props) {
  const { token } = await params;
  const result = await registrarAsistenciaQrAction(token);

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {result.ok ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-success" />
            <h1 className="mt-4 text-xl font-bold text-text-primary dark:text-white">
              ¡Asistencia Registrada!
            </h1>
            {result.asignaturaNombre && (
              <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                {result.asignaturaNombre}
              </p>
            )}
            <p className="mt-1 text-sm text-success">{result.message}</p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-danger" />
            <h1 className="mt-4 text-xl font-bold text-text-primary dark:text-white">
              No fue posible registrar
            </h1>
            <p className="mt-2 text-sm text-danger">{result.message}</p>
          </>
        )}
        <Link
          href="/alumno"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Volver al Panel
        </Link>
      </div>
    </section>
  );
}
