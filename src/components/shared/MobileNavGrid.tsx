"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  Brain,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  Home,
  IdCard,
  LayoutDashboard,
  type LucideIcon,
  MessageSquare,
  Shield,
  Star,
  TrendingUp,
  Upload,
  User,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";

import type { AppRole } from "@/lib/authz";

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  gradient: string;
};

const GRADIENT_COLORS: Record<string, string> = {
  "grad-purple":  "#8B3A9E",
  "grad-blue":    "#3B82F6",
  "grad-cyan":    "#06B6D4",
  "grad-amber":   "#F5A623",
  "grad-emerald": "#10B981",
  "grad-pink":    "#EC4899",
  "grad-violet":  "#8B5CF6",
  "grad-gold":    "#F5A623",
  "grad-slate":   "#64748B",
  "grad-indigo":  "#6366F1",
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  docente: "Docente",
  alumno: "Alumno",
};

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin",                    label: "Panel",              Icon: LayoutDashboard, gradient: "grad-purple" },
  { href: "/admin/asignaturas",        label: "Asignaturas",        Icon: BookOpen,        gradient: "grad-blue" },
  { href: "/admin/clases",             label: "Clases",             Icon: CalendarDays,    gradient: "grad-cyan" },
  { href: "/admin/evaluaciones",       label: "Evaluaciones",       Icon: ClipboardList,   gradient: "grad-violet" },
  { href: "/admin/notas",              label: "Notas",              Icon: ClipboardList,   gradient: "grad-gold" },
  { href: "/admin/asistencias",        label: "Asistencias",        Icon: ClipboardCheck,  gradient: "grad-emerald" },
  { href: "/admin/encuestas",          label: "Enc. Docente",       Icon: Star,            gradient: "grad-amber" },
  { href: "/admin/test-estilos",       label: "Test Estilos",       Icon: Brain,           gradient: "grad-violet" },
  { href: "/admin/encuestas-builder",  label: "Constructor Enc.",   Icon: MessageSquare,   gradient: "grad-indigo" },
  { href: "/admin/administradores",    label: "Admins",             Icon: Shield,          gradient: "grad-purple" },
  { href: "/admin/docentes",           label: "Docentes",           Icon: UserCog,         gradient: "grad-amber" },
  { href: "/admin/alumnos",            label: "Alumnos",            Icon: Users,           gradient: "grad-emerald" },
  { href: "/admin/matriculas",         label: "Matrículas",         Icon: Wallet,          gradient: "grad-pink" },
  { href: "/admin/solicitudes",        label: "Solicitudes",        Icon: FileText,        gradient: "grad-violet" },
  { href: "/admin/importar",           label: "Importar",           Icon: Upload,          gradient: "grad-emerald" },
  { href: "/admin/finanzas",           label: "Finanzas",           Icon: TrendingUp,      gradient: "grad-emerald" },
];

const DOCENTE_ITEMS: NavItem[] = [
  { href: "/docente",             label: "Panel",           Icon: Home,           gradient: "grad-purple" },
  { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen,       gradient: "grad-blue" },
  { href: "/encuestas",           label: "Mis Encuestas",   Icon: MessageSquare,  gradient: "grad-indigo" },
  { href: "/docente/perfil",      label: "Mi Perfil",       Icon: User,           gradient: "grad-blue" },
];

const ALUMNO_ITEMS: NavItem[] = [
  { href: "/alumno",                          label: "Panel",          Icon: Home,           gradient: "grad-purple" },
  { href: "/alumno/asignaturas",              label: "Mis Cursos",     Icon: GraduationCap,  gradient: "grad-blue" },
  { href: "/alumno/clases",                   label: "Clases",         Icon: CalendarDays,   gradient: "grad-cyan" },
  { href: "/alumno/evaluaciones",             label: "Evaluaciones",   Icon: ClipboardList,  gradient: "grad-violet" },
  { href: "/alumno/notas",                    label: "Mis Notas",      Icon: ClipboardList,  gradient: "grad-gold" },
  { href: "/alumno/asistencias",              label: "Mi Asistencia",  Icon: ClipboardCheck, gradient: "grad-emerald" },
  { href: "/alumno/encuesta-docente",         label: "Eval. Docente",  Icon: Star,           gradient: "grad-amber" },
  { href: "/alumno/test-estilos",             label: "Test Estilos",   Icon: Brain,          gradient: "grad-violet" },
  { href: "/encuestas",                       label: "Mis Encuestas",  Icon: MessageSquare,  gradient: "grad-indigo" },
  { href: "/alumno/solicitudes/credencial",   label: "Credencial",     Icon: IdCard,         gradient: "grad-violet" },
  { href: "/alumno/solicitudes/alumno-regular", label: "Cert. Alumno", Icon: FileCheck,      gradient: "grad-blue" },
  { href: "/alumno/solicitudes/tarjeta-beneficio", label: "T. Beneficio", Icon: CreditCard,  gradient: "grad-pink" },
  { href: "/alumno/perfil",                   label: "Mi Perfil",      Icon: User,           gradient: "grad-blue" },
];

const ROLE_ITEMS: Record<AppRole, NavItem[]> = {
  admin: ADMIN_ITEMS,
  docente: DOCENTE_ITEMS,
  alumno: ALUMNO_ITEMS,
};

type MobileNavGridProps = {
  role: AppRole;
  userName: string;
  open: boolean;
  onClose: () => void;
};

export function MobileNavGrid({ role, userName, open, onClose }: MobileNavGridProps) {
  const pathname = usePathname();
  const items = ROLE_ITEMS[role];
  const homeHref = `/${role}`;

  const isActive = (href: string): boolean => {
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#f3eef9] dark:bg-gray-950 md:hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-purple-100 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-intranet.webp"
            alt="Mi OTEC Intranet"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
            priority
            unoptimized
          />
          <div>
            <p className="text-sm font-bold text-text-primary dark:text-white">Mi OTEC</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              {ROLE_LABELS[role]} · {userName.split(" ")[0]}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grid - vivoDuoc style: large icons + labels on white cards */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4">
          {items.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-white shadow-lg ring-2 ring-cta/30 dark:bg-gray-800 dark:ring-cta/50"
                    : "bg-white shadow-sm hover:shadow-md dark:bg-gray-900 dark:hover:bg-gray-800"
                }`}
              >
                <item.Icon
                  className="h-12 w-12 transition-transform duration-200 group-hover:scale-110"
                  strokeWidth={1.5}
                  style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
                />
                <span
                  className={`text-sm font-bold leading-tight ${
                    active
                      ? "text-cta dark:text-cta"
                      : "text-text-primary dark:text-gray-200"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-purple-100 bg-white/80 px-4 py-3 text-center backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <p className="text-xs text-text-muted dark:text-gray-500">
          Entorno seguro · Mi OTEC Intranet
        </p>
      </div>
    </div>
  );
}
