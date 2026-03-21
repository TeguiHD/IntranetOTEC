"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
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
  Shield,
  Upload,
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

/**
 * Solid fallback color for each gradient (used as CSS `color` on inactive icons).
 * This ensures icons that use fill internally (like CalendarDays) render correctly.
 */
const GRADIENT_COLORS: Record<string, string> = {
  "grad-purple": "#8B3A9E",
  "grad-blue": "#3B82F6",
  "grad-cyan": "#06B6D4",
  "grad-amber": "#F5A623",
  "grad-emerald": "#10B981",
  "grad-pink": "#EC4899",
  "grad-violet": "#8B5CF6",
  "grad-gold": "#F5A623",
  "grad-slate": "#64748B",
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  docente: "Docente",
  alumno: "Alumno",
};

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/admin", label: "Panel", Icon: LayoutDashboard, gradient: "grad-purple" },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/admin/asignaturas", label: "Asignaturas", Icon: BookOpen, gradient: "grad-blue" },
      { href: "/admin/clases", label: "Clases", Icon: CalendarDays, gradient: "grad-cyan" },
      { href: "/admin/notas", label: "Notas", Icon: ClipboardList, gradient: "grad-gold" },
      { href: "/admin/asistencias", label: "Asistencias", Icon: ClipboardCheck, gradient: "grad-emerald" },
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/admin/administradores", label: "Administradores", Icon: Shield, gradient: "grad-purple" },
      { href: "/admin/docentes", label: "Docentes", Icon: UserCog, gradient: "grad-amber" },
      { href: "/admin/alumnos", label: "Alumnos", Icon: Users, gradient: "grad-emerald" },
      { href: "/admin/matriculas", label: "Matrículas", Icon: Wallet, gradient: "grad-pink" },
    ],
  },
  {
    title: "Solicitudes",
    items: [
      { href: "/admin/solicitudes", label: "Solicitudes", Icon: FileText, gradient: "grad-violet" },
      { href: "/admin/importar", label: "Importar Alumnos", Icon: Upload, gradient: "grad-emerald" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/auditoria", label: "Auditoría", Icon: ClipboardList, gradient: "grad-slate" },
    ],
  },
];

const DOCENTE_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/docente", label: "Panel", Icon: Home, gradient: "grad-purple" },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen, gradient: "grad-blue" },
    ],
  },
];

const ALUMNO_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/alumno", label: "Panel", Icon: Home, gradient: "grad-purple" },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/alumno/asignaturas", label: "Mis Cursos", Icon: GraduationCap, gradient: "grad-blue" },
      { href: "/alumno/clases", label: "Clases", Icon: CalendarDays, gradient: "grad-cyan" },
      { href: "/alumno/notas", label: "Mis Notas", Icon: ClipboardList, gradient: "grad-gold" },
      { href: "/alumno/asistencias", label: "Mi Asistencia", Icon: ClipboardCheck, gradient: "grad-emerald" },
    ],
  },
  {
    title: "Solicitudes",
    items: [
      { href: "/alumno/solicitudes?tipo=credencial", label: "Credencial", Icon: IdCard, gradient: "grad-violet" },
      { href: "/alumno/solicitudes?tipo=alumno_regular", label: "Cert. Alumno Regular", Icon: FileCheck, gradient: "grad-blue" },
      { href: "/alumno/solicitudes?tipo=tarjeta_beneficio", label: "Tarjeta Beneficio", Icon: CreditCard, gradient: "grad-pink" },
    ],
  },
];

const ROLE_SECTIONS: Record<AppRole, NavSection[]> = {
  admin: ADMIN_SECTIONS,
  docente: DOCENTE_SECTIONS,
  alumno: ALUMNO_SECTIONS,
};

type SidebarProps = {
  role: AppRole;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingSolicitudes?: number;
};

function SidebarNav({
  role,
  collapsed,
  onNavigate,
  pendingSolicitudes,
}: {
  role: AppRole;
  collapsed: boolean;
  onNavigate?: () => void;
  pendingSolicitudes?: number;
}) {
  const pathname = usePathname();
  const sections = ROLE_SECTIONS[role];
  const homeHref = `/${role}`;

  const isActive = (href: string): boolean => {
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      {sections.map((section, sectionIdx) => (
        <div key={section.title} className={sectionIdx > 0 ? "mt-4" : ""}>
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted dark:text-gray-500">
              {section.title}
            </p>
          )}

          {collapsed && sectionIdx > 0 && (
            <div className="mx-auto mb-2 mt-1 h-px w-6 bg-gray-200 dark:bg-gray-700" />
          )}

          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(item.href);
              const isSolicitudesAdmin = role === "admin" && item.href === "/admin/solicitudes";
              const badge = isSolicitudesAdmin && pendingSolicitudes && pendingSolicitudes > 0
                ? pendingSolicitudes
                : null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  className={`group flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                    collapsed ? "h-11 w-11 justify-center mx-auto" : "h-11 gap-3 px-3"
                  } ${
                    active
                      ? "bg-gradient-to-r from-cta to-cta-dark text-white shadow-md shadow-cta/25"
                      : "text-text-secondary hover:bg-cta/8 hover:text-cta dark:text-gray-300 dark:hover:bg-cta/15 dark:hover:text-cta-dark"
                  }`}
                >
                  <item.Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 ${
                      !active ? "group-hover:scale-110" : ""
                    }`}
                    strokeWidth={2}
                    style={active ? undefined : { color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && badge !== null && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Image
      src="/logo-icon.svg"
      alt="Mi OTEC"
      width={collapsed ? 36 : 36}
      height={collapsed ? 36 : 36}
      className="h-9 w-9 rounded-xl object-contain"
      priority
    />
  );
}

export function Sidebar({ role, collapsed, mobileOpen, onCloseMobile, pendingSolicitudes }: SidebarProps) {
  const widthClass = collapsed ? "w-[4.5rem]" : "w-64";

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-label="Cerrar menú lateral"
        />
      ) : null}

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-gray-950 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <SidebarLogo collapsed={false} />
            <div>
              <p className="text-sm font-bold text-text-primary dark:text-white">Mi OTEC</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">{ROLE_LABELS[role]}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            onClick={onCloseMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarNav role={role} collapsed={false} onNavigate={onCloseMobile} pendingSolicitudes={pendingSolicitudes} />

        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-[11px] text-text-muted dark:text-gray-500">Entorno seguro · v1.0</p>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`fixed left-0 top-16 z-20 hidden h-[calc(100dvh-4rem)] flex-col border-r border-gray-100 bg-white/80 backdrop-blur-sm transition-[width] duration-300 ease-out dark:border-gray-800 dark:bg-gray-950/80 md:flex ${widthClass}`}
      >
        <div className={`flex h-14 items-center border-b border-gray-100 dark:border-gray-800 ${collapsed ? "justify-center px-2" : "px-4"}`}>
          {collapsed ? (
            <SidebarLogo collapsed />
          ) : (
            <div className="flex items-center gap-3">
              <SidebarLogo collapsed={false} />
              <div>
                <p className="text-sm font-bold text-text-primary dark:text-white">Mi OTEC</p>
                <p className="text-xs text-text-secondary dark:text-gray-400">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          )}
        </div>

        <SidebarNav role={role} collapsed={collapsed} pendingSolicitudes={pendingSolicitudes} />

        {!collapsed ? (
          <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-text-muted dark:text-gray-500">Entorno seguro · v1.0</p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
