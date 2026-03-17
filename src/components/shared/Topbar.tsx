"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import type { AppRole } from "@/lib/authz";

type TopbarProps = {
  role: AppRole;
  userName: string;
  isSidebarCollapsed: boolean;
  onToggleDesktopSidebar: () => void;
  onToggleMobileSidebar: () => void;
};

const ROLE_NAMES: Record<AppRole, string> = {
  admin: "Admin",
  docente: "Docente",
  alumno: "Alumno",
};

const toLabel = (segment: string): string =>
  segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getInitials = (name: string): string => {
  const clean = name.trim();

  if (!clean) {
    return "US";
  }

  const words = clean.split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
};

export function Topbar({
  role,
  userName,
  isSidebarCollapsed,
  onToggleDesktopSidebar,
  onToggleMobileSidebar,
}: TopbarProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);

    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join("/")}`;
      const label = index === 0 ? ROLE_NAMES[role] : toLabel(segment);

      return { href, label };
    });
  }, [pathname, role]);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/90 bg-white/95 px-4 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-950/95">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={onToggleMobileSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-200 text-text-primary hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <button
          type="button"
          aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          onClick={onToggleDesktopSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded border border-gray-200 text-text-primary hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 md:inline-flex"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d={isSidebarCollapsed ? "M8 6l6 6-6 6" : "M16 6l-6 6 6 6"} />
          </svg>
        </button>

        <nav className="hidden min-w-0 items-center text-sm sm:flex" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={crumb.href} className="flex min-w-0 items-center">
                {index > 0 ? <span className="px-2 text-text-secondary dark:text-gray-400">/</span> : null}

                {isLast ? (
                  <span className="truncate font-semibold text-text-primary dark:text-white">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate text-text-secondary hover:text-text-primary dark:text-gray-300 dark:hover:text-white"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Cambiar tema"
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="inline-flex h-10 w-10 items-center justify-center rounded border border-gray-200 text-text-primary hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
            </svg>
          )}
        </button>

        <div className="hidden items-center gap-2 rounded border border-gray-200 px-2 py-1 dark:border-gray-700 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary text-xs font-bold text-white">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white">{userName}</p>
            <p className="text-xs text-text-secondary dark:text-gray-300">{ROLE_NAMES[role]}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            startSignOut(async () => {
              await signOut({ callbackUrl: "/login" });
            });
          }}
          className="h-10 rounded border border-danger/40 px-3 text-sm font-medium text-text-primary hover:bg-danger/10 focus:ring-2 focus:ring-danger/40 dark:text-gray-100 dark:hover:bg-danger/20"
        >
          {isSigningOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </div>
    </header>
  );
}