"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Home,
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
      { href: "/admin", label: "Panel", Icon: LayoutDashboard },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/admin/asignaturas", label: "Asignaturas", Icon: BookOpen },
      { href: "/admin/clases", label: "Clases", Icon: CalendarDays },
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/admin/docentes", label: "Docentes", Icon: UserCog },
      { href: "/admin/alumnos", label: "Alumnos", Icon: Users },
      { href: "/admin/matriculas", label: "Matrículas", Icon: Wallet },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/admin/solicitudes", label: "Solicitudes", Icon: FileText },
    ],
  },
];

const DOCENTE_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/docente", label: "Panel", Icon: Home },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookOpen },
    ],
  },
];

const ALUMNO_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/alumno", label: "Panel", Icon: Home },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/alumno/asignaturas", label: "Mis Cursos", Icon: GraduationCap },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/alumno/solicitudes", label: "Solicitudes", Icon: ScrollText },
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
};

function SidebarNav({
  role,
  collapsed,
  onNavigate,
}: {
  role: AppRole;
  collapsed: boolean;
  onNavigate?: () => void;
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
                      ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/25"
                      : "text-text-secondary hover:bg-primary/8 hover:text-primary dark:text-gray-300 dark:hover:bg-primary/15 dark:hover:text-primary-light"
                  }`}
                >
                  <item.Icon
                    className={`h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 ${
                      !active ? "group-hover:scale-110" : ""
                    }`}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-sm">
              <Shield className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
            </div>
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

        <SidebarNav role={role} collapsed={false} onNavigate={onCloseMobile} />

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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-sm">
              <Shield className="h-4 w-4 text-white" strokeWidth={2.2} />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-dark shadow-sm">
                <Shield className="h-4 w-4 text-white" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary dark:text-white">Mi OTEC</p>
                <p className="text-xs text-text-secondary dark:text-gray-400">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          )}
        </div>

        <SidebarNav role={role} collapsed={collapsed} />

        {!collapsed ? (
          <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-[11px] text-text-muted dark:text-gray-500">Entorno seguro · v1.0</p>
          </div>
        ) : null}
      </aside>
    </>
  );
}
