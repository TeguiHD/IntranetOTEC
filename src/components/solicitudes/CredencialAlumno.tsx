import { IdCard } from "lucide-react";

type CredencialAlumnoProps = {
  nombre: string;
  apellido: string;
  rut: string | null;
  solicitudId: string;
  aprobadaAt: Date | string | null;
};

const formatFecha = (value: Date | string | null): string => {
  if (!value) return new Date().toLocaleDateString("es-CL");
  return new Date(value).toLocaleDateString("es-CL");
};

const formatRut = (value: string | null): string => {
  if (!value) return "Sin registro";
  return value.replace(/^EXT-/i, "EXT-").toUpperCase();
};

export function CredencialAlumno({
  nombre,
  apellido,
  rut,
  solicitudId,
  aprobadaAt,
}: CredencialAlumnoProps) {
  const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ").trim() || "Alumno";
  const fecha = formatFecha(aprobadaAt);
  const folio = solicitudId.slice(0, 8).toUpperCase();

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-800 via-fuchsia-700 to-slate-950 text-white shadow-lg shadow-violet-900/20 dark:border-violet-500/30">
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
            Mi OTEC
          </p>
          <h2 className="mt-1 text-lg font-bold">Credencial de Alumno</h2>
        </div>
        <span className="rounded-xl bg-white/12 p-2">
          <IdCard className="h-6 w-6" />
        </span>
      </div>

      <div className="px-5 pb-5 pt-3">
        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Titular
          </p>
          <p className="mt-1 text-xl font-bold leading-tight">{nombreCompleto}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                RUT / Credencial
              </p>
              <p className="mt-1 font-mono text-sm font-bold">{formatRut(rut)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                Emision
              </p>
              <p className="mt-1 text-sm font-semibold">{fecha}</p>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/15 pt-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                Folio
              </p>
              <p className="mt-1 font-mono text-sm font-bold">{folio}</p>
            </div>
            <p className="text-right text-xs font-medium text-white/70">
              Vigente mientras mantenga matricula activa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
