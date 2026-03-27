"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Admin",
  alumno: "Alumno",
  docente: "Docente",
  encuestas: "Encuestas",
  // Academic
  asignaturas: "Mis Cursos",
  clases: "Clases",
  evaluaciones: "Evaluaciones",
  notas: "Mis Notas",
  asistencias: "Asistencia",
  "encuestas-builder": "Constructor Encuestas",
  "test-estilos": "Test Estilos",
  calendario: "Calendario",
  // Admin persons
  administradores: "Administradores",
  docentes: "Docentes",
  alumnos: "Alumnos",
  matriculas: "Matrículas",
  importar: "Importar Alumnos",
  finanzas: "Finanzas",
  auditoria: "Auditoría",
  // Account
  perfil: "Mi Perfil",
  "encuesta-docente": "Evaluar Docente",
  // Solicitudes
  solicitudes: "Solicitudes",
  credencial: "Credencial",
  "alumno-regular": "Alumno Regular",
  certificado: "Certificado",
  "tarjeta-beneficio": "Tarjeta Beneficio",
  // Notificaciones
  notificaciones: "Notificaciones",
  // QR
  asistencia: "Asistencia",
  qr: "QR",
};

function labelForSegment(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function isId(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) return null;

  const crumbs: { label: string; href: string; isId: boolean }[] = [];
  let acc = "";

  for (const seg of segments) {
    acc += `/${seg}`;
    crumbs.push({ label: labelForSegment(seg), href: acc, isId: isId(seg) });
  }

  const visible = crumbs.filter((c) => !c.isId);
  if (visible.length < 2) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-4 flex items-center gap-1 text-xs text-text-secondary dark:text-gray-400"
    >
      {visible.map((crumb, i) => {
        const isLast = i === visible.length - 1;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted dark:text-gray-600" />
            )}
            {isLast ? (
              <span className="font-semibold text-text-primary dark:text-white">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="capitalize transition-colors hover:text-primary dark:hover:text-primary-light"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
