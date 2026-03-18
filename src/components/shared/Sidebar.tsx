"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/authz";

type IconProps = {
  className?: string;
};

const HomeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
  </svg>
);

const BookIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12.5H8A3 3 0 0 1 5 17.5V4.5Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 20.5V7.5A3 3 0 0 1 11 4.5" />
  </svg>
);

const CoinIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <ellipse cx="12" cy="7" rx="6.5" ry="3.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 7v10c0 1.93 2.91 3.5 6.5 3.5s6.5-1.57 6.5-3.5V7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 12c0 1.93 2.91 3.5 6.5 3.5s6.5-1.57 6.5-3.5" />
  </svg>
);

const UserIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

const UsersIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 21a6 6 0 0 1 12 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 21a5 5 0 0 1 8 0" />
  </svg>
);

const CalendarIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <rect x="3" y="4" width="18" height="17" rx="2" />
    <path strokeLinecap="round" d="M8 2v4M16 2v4M3 10h18" />
  </svg>
);

const DocumentIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

type NavItem = {
  href: string;
  label: string;
  Icon: (props: IconProps) => JSX.Element;
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrador",
  docente: "Docente",
  alumno: "Alumno",
};

const ROLE_NAV: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Panel", Icon: HomeIcon },
    { href: "/admin/asignaturas", label: "Asignaturas", Icon: BookIcon },
    { href: "/admin/matriculas", label: "Matrículas", Icon: CoinIcon },
    { href: "/admin/clases", label: "Clases", Icon: CalendarIcon },
    { href: "/admin/docentes", label: "Docentes", Icon: UserIcon },
    { href: "/admin/alumnos", label: "Alumnos", Icon: UsersIcon },
    { href: "/admin/solicitudes", label: "Solicitudes", Icon: DocumentIcon },
  ],
  docente: [
    { href: "/docente", label: "Panel", Icon: HomeIcon },
    { href: "/docente/asignaturas", label: "Mis Asignaturas", Icon: BookIcon },
  ],
  alumno: [
    { href: "/alumno", label: "Panel", Icon: HomeIcon },
    { href: "/alumno/asignaturas", label: "Mis Cursos", Icon: BookIcon },
    { href: "/alumno/solicitudes", label: "Solicitudes", Icon: DocumentIcon },
  ],
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
  const items = ROLE_NAV[role];
  const homeHref = `/${role}`;

  const isActive = (href: string): boolean => {
    if (href === homeHref) {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav className="flex-1 space-y-1 p-3">
      {items.map((item) => {
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            onClick={onNavigate}
            className={`flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:bg-gray-100 hover:text-text-primary dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
            } ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <item.Icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const widthClass = collapsed ? "w-16" : "w-64";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Cerrar menú"
          onClick={onCloseMobile}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-16 z-40 flex h-[calc(100dvh-4rem)] w-64 flex-col border-r border-gray-200 bg-white shadow-md transition-transform duration-300 dark:border-gray-700 dark:bg-gray-950 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white">Mi OTEC</p>
            <p className="text-xs text-text-secondary dark:text-gray-300">{ROLE_LABELS[role]}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar menú lateral"
            onClick={onCloseMobile}
            className="rounded px-2 py-1 text-sm font-medium text-text-primary hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Cerrar
          </button>
        </div>

        <SidebarNav role={role} collapsed={false} onNavigate={onCloseMobile} />

        <div className="border-t border-gray-200 px-4 py-3 text-xs text-text-secondary dark:border-gray-700 dark:text-gray-400">
          Navegación por rol
        </div>
      </aside>

      <aside
        className={`fixed left-0 top-16 z-20 hidden h-[calc(100dvh-4rem)] flex-col border-r border-gray-200 bg-white transition-[width] duration-300 dark:border-gray-700 dark:bg-gray-950 md:flex ${widthClass}`}
      >
        <div className={`flex h-14 items-center border-b border-gray-200 px-3 dark:border-gray-700 ${collapsed ? "justify-center" : "justify-start"}`}>
          {collapsed ? (
            <span className="text-lg font-bold text-primary" aria-hidden>
              O
            </span>
          ) : (
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-white">Mi OTEC</p>
              <p className="text-xs text-text-secondary dark:text-gray-300">{ROLE_LABELS[role]}</p>
            </div>
          )}
        </div>

        <SidebarNav role={role} collapsed={collapsed} />

        {!collapsed ? (
          <div className="border-t border-gray-200 px-4 py-3 text-xs text-text-secondary dark:border-gray-700 dark:text-gray-400">
            Entorno seguro
          </div>
        ) : (
          <div className="flex justify-center border-t border-gray-200 py-3 dark:border-gray-700">
            <CoinIcon className="h-5 w-5 text-text-secondary dark:text-gray-400" />
          </div>
        )}
      </aside>
    </>
  );
}