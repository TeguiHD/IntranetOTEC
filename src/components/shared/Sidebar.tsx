"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  GraduationCap,
  History,
  Home,
  LayoutDashboard,
  type LucideIcon,
  ScrollText,
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
  badge?: number;
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
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/admin/docentes", label: "Docentes", Icon: UserCog, gradient: "grad-amber" },
      { href: "/admin/alumnos", label: "Alumnos", Icon: Users, gradient: "grad-emerald" },
      { href: "/admin/matriculas", label: "Matrículas", Icon: Wallet, gradient: "grad-pink" },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/admin/evaluaciones", label: "Evaluaciones", Icon: ClipboardList, gradient: "grad-violet" },
      { href: "/admin/solicitudes", label: "Solicitudes", Icon: FileText, gradient: "grad-violet" },
      { href: "/admin/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-cyan" },
      { href: "/admin/finanzas", label: "Finanzas", Icon: DollarSign, gradient: "grad-emerald" },
      { href: "/admin/certificados", label: "Certificados", Icon: Award, gradient: "grad-cyan" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/auditoria", label: "Auditoría", Icon: History, gradient: "grad-cyan" },
      { href: "/admin/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-amber" },
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
  {
    title: "Cuenta",
    items: [
      { href: "/docente/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-violet" },
      { href: "/docente/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-amber" },
    ],
  },
];

const ALUMNO_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { href: "/alumno", label: "Panel", Icon: Home, gradient: "grad-purple" },
      { href: "/alumno/perfil", label: "Mi Perfil", Icon: User, gradient: "grad-amber" },
    ],
  },
  {
    title: "Académico",
    items: [
      { href: "/alumno/asignaturas", label: "Mis Cursos", Icon: GraduationCap, gradient: "grad-blue" },
    ],
  },
  {
    title: "Gestión",
    items: [
      { href: "/alumno/evaluaciones", label: "Mis Evaluaciones", Icon: ClipboardList, gradient: "grad-violet" },
      { href: "/alumno/solicitudes", label: "Solicitudes", Icon: ScrollText, gradient: "grad-violet" },
      { href: "/alumno/notificaciones", label: "Notificaciones", Icon: Bell, gradient: "grad-cyan" },
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
  userName: string;
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
  const rawSections = ROLE_SECTIONS[role];

  // Inject badge into the admin Solicitudes nav item
  const sections = rawSections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.href === "/admin/solicitudes" && pendingSolicitudes && pendingSolicitudes > 0
        ? { ...item, badge: pendingSolicitudes }
        : item,
    ),
  }));
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
                  className={`relative group flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
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
                    strokeWidth={active ? 2.2 : 1.8}
                    stroke={active ? "currentColor" : `url(#${item.gradient})`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge ? (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                  {collapsed && item.badge ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
                  ) : null}
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

export function Sidebar({ role, userName, collapsed, mobileOpen, onCloseMobile, pendingSolicitudes }: SidebarProps) {
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
              <p className="text-xs text-text-secondary dark:text-gray-400">
                {ROLE_LABELS[role]} · {userName.split(" ")[0]}
              </p>
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
