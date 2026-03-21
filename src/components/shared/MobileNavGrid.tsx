"use client";

import Image from "next/image";
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
  badge?: number;
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  docente: "Docente",
  alumno: "Alumno",
};

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin",              label: "Panel",       Icon: LayoutDashboard, gradient: "grad-purple" },
  { href: "/admin/asignaturas",  label: "Asignaturas", Icon: BookOpen,        gradient: "grad-blue" },
  { href: "/admin/clases",       label: "Clases",      Icon: CalendarDays,    gradient: "grad-cyan" },
  { href: "/admin/docentes",     label: "Docentes",    Icon: UserCog,         gradient: "grad-amber" },
  { href: "/admin/alumnos",      label: "Alumnos",     Icon: Users,           gradient: "grad-emerald" },
  { href: "/admin/matriculas",   label: "Matrículas",  Icon: Wallet,          gradient: "grad-pink" },
  { href: "/admin/solicitudes",  label: "Solicitudes", Icon: FileText,        gradient: "grad-violet" },
];

const DOCENTE_ITEMS: NavItem[] = [
  { href: "/docente",             label: "Panel",           Icon: LayoutDashboard, gradient: "grad-purple" },
  { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen,        gradient: "grad-blue" },
];

const ALUMNO_ITEMS: NavItem[] = [
  { href: "/alumno",             label: "Panel",       Icon: LayoutDashboard, gradient: "grad-purple" },
  { href: "/alumno/asignaturas", label: "Mis Cursos",  Icon: GraduationCap,   gradient: "grad-blue" },
  { href: "/alumno/solicitudes", label: "Solicitudes", Icon: ScrollText,      gradient: "grad-violet" },
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
  pendingSolicitudes?: number;
};

export function MobileNavGrid({ role, userName, open, onClose, pendingSolicitudes }: MobileNavGridProps) {
  const pathname = usePathname();
  const rawItems = ROLE_ITEMS[role];

  // Inject badge into admin Solicitudes item
  const items = rawItems.map((item) =>
    item.href === "/admin/solicitudes" && pendingSolicitudes && pendingSolicitudes > 0
      ? { ...item, badge: pendingSolicitudes }
      : item,
  );
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
            src="/logo-icon.svg"
            alt="Mi OTEC"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-contain"
            priority
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
                className={`relative group flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition-all duration-200 active:scale-95 ${
                  active
                    ? "bg-white shadow-lg ring-2 ring-cta/30 dark:bg-gray-800 dark:ring-cta/50"
                    : "bg-white shadow-sm hover:shadow-md dark:bg-gray-900 dark:hover:bg-gray-800"
                }`}
              >
                {item.badge ? (
                  <span className="absolute right-2 top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
                <item.Icon
                  className="h-12 w-12 transition-transform duration-200 group-hover:scale-110"
                  stroke={`url(#${item.gradient})`}
                  strokeWidth={1.5}
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
