"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
  Shield,
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
  color: string;
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  docente: "Docente",
  alumno: "Alumno",
};

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin",              label: "Panel",       Icon: LayoutDashboard, color: "from-primary to-primary-dark" },
  { href: "/admin/asignaturas",  label: "Asignaturas", Icon: BookOpen,        color: "from-violet-500 to-violet-700" },
  { href: "/admin/clases",       label: "Clases",      Icon: CalendarDays,    color: "from-blue-500 to-blue-700" },
  { href: "/admin/docentes",     label: "Docentes",    Icon: UserCog,         color: "from-indigo-500 to-indigo-700" },
  { href: "/admin/alumnos",      label: "Alumnos",     Icon: Users,           color: "from-cyan-500 to-cyan-700" },
  { href: "/admin/matriculas",   label: "Matrículas",  Icon: Wallet,          color: "from-emerald-500 to-emerald-700" },
  { href: "/admin/solicitudes",  label: "Solicitudes", Icon: FileText,        color: "from-amber-500 to-amber-700" },
];

const DOCENTE_ITEMS: NavItem[] = [
  { href: "/docente",             label: "Panel",           Icon: LayoutDashboard, color: "from-primary to-primary-dark" },
  { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen,        color: "from-violet-500 to-violet-700" },
];

const ALUMNO_ITEMS: NavItem[] = [
  { href: "/alumno",             label: "Panel",       Icon: LayoutDashboard, color: "from-primary to-primary-dark" },
  { href: "/alumno/asignaturas", label: "Mis Cursos",  Icon: GraduationCap,   color: "from-violet-500 to-violet-700" },
  { href: "/alumno/solicitudes", label: "Solicitudes", Icon: ScrollText,      color: "from-amber-500 to-amber-700" },
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-sm">
            <Shield className="h-4 w-4 text-white" strokeWidth={2.2} />
          </div>
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
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex flex-col items-center gap-2.5 rounded-2xl p-4 text-center transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-white shadow-md shadow-primary/15 ring-2 ring-primary/30 dark:bg-gray-800 dark:ring-primary/50"
                    : "bg-white/70 shadow-sm hover:bg-white hover:shadow-md dark:bg-gray-900/70 dark:hover:bg-gray-800"
                }`}
              >
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} shadow-md transition-transform duration-200 group-active:scale-95 ${active ? "shadow-lg" : ""}`}
                >
                  <item.Icon className="h-7 w-7 text-white" strokeWidth={1.8} />
                </div>
                <span
                  className={`text-xs font-semibold leading-tight ${
                    active
                      ? "text-primary dark:text-primary-light"
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
        <p className="text-[11px] text-text-muted dark:text-gray-500">
          Entorno seguro · Mi OTEC Intranet
        </p>
      </div>
    </div>
  );
}
