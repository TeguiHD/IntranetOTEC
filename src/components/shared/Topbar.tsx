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

  const handleThemeToggle = () => {
    document.documentElement.classList.add("theme-transition");
    setTheme(isDark ? "light" : "dark");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 350);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/80 bg-white/90 px-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90 sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        {/* Mobile menu */}
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={onToggleMobileSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary hover:bg-primary/10 active:bg-primary/20 dark:text-gray-100 dark:hover:bg-primary/20 md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        {/* Desktop sidebar toggle */}
        <button
          type="button"
          aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          onClick={onToggleDesktopSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-xl text-text-primary hover:bg-primary/10 dark:text-gray-100 dark:hover:bg-primary/20 md:inline-flex"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d={isSidebarCollapsed ? "M8 6l6 6-6 6" : "M16 6l-6 6 6 6"} />
          </svg>
        </button>

        {/* Breadcrumbs - desktop only */}
        <nav className="hidden min-w-0 items-center text-sm sm:flex" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <div key={crumb.href} className="flex min-w-0 items-center">
                {index > 0 ? <span className="px-1.5 text-gray-400 dark:text-gray-500">/</span> : null}

                {isLast ? (
                  <span className="truncate font-semibold text-text-primary dark:text-white">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="truncate text-text-secondary transition-colors hover:text-primary dark:text-gray-400 dark:hover:text-primary-light"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Mobile: role badge */}
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light sm:hidden">
          {ROLE_NAMES[role]}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={isDark ? "Modo claro" : "Modo oscuro"}
          onClick={handleThemeToggle}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-primary/10 active:scale-95 dark:text-gray-100 dark:hover:bg-primary/20"
        >
          {mounted ? (
            isDark ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <circle cx="12" cy="12" r="4" />
                <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
              </svg>
            )
          ) : (
            <span className="h-5 w-5" />
          )}
        </button>

        {/* User avatar + name (desktop) */}
        <div className="hidden items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-1.5 dark:bg-gray-900 sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark text-xs font-bold text-white shadow-sm">
            {getInitials(userName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary dark:text-white">{userName}</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">{ROLE_NAMES[role]}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          type="button"
          onClick={() => {
            startSignOut(async () => {
              await signOut({ callbackUrl: "/login" });
            });
          }}
          disabled={isSigningOut}
          className="h-11 rounded-xl border border-danger/30 px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white active:scale-95 disabled:opacity-50 dark:border-danger/40 dark:text-red-400 dark:hover:bg-danger dark:hover:text-white sm:px-4"
        >
          {isSigningOut ? "..." : "Salir"}
        </button>
      </div>
    </header>
  );
}
