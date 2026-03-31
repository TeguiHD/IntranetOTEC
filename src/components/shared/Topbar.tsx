// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Sun,
} from "lucide-react";

import type { AppRole } from "@/lib/authz";

import { usePwaInstall } from "./PwaInstallProvider";

type TopbarProps = {
  role: AppRole;
  userName: string;
  isSidebarCollapsed: boolean;
  navMode: "grid" | "sidebar";
  unreadNotifs?: number;
  onToggleDesktopSidebar: () => void;
  onToggleMobileSidebar: () => void;
  onToggleNavMode: () => void;
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
  if (!clean) return "US";
  const words = clean.split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
};

export function Topbar({
  role,
  userName,
  isSidebarCollapsed,
  navMode,
  unreadNotifs = 0,
  onToggleDesktopSidebar,
  onToggleMobileSidebar,
  onToggleNavMode,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { platform, isInstalled, isInstallable, promptInstall } = usePwaInstall();
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
  const showInstallAction =
    !isInstalled && (platform === "ios" || isInstallable);

  const handleThemeToggle = () => {
    document.documentElement.classList.add("theme-transition");
    setTheme(isDark ? "light" : "dark");
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 350);
  };

  const handleInstallAction = async () => {
    if (platform !== "ios" && isInstallable) {
      await promptInstall();
      return;
    }

    router.push("/instalar");
  };

  return (
    <header className="app-topbar fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-gray-200/80 bg-white/90 px-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-950/90 sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="Abrir menú"
          onClick={onToggleMobileSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary hover:bg-primary/10 active:bg-primary/20 dark:text-gray-100 dark:hover:bg-primary/20 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          type="button"
          aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
          onClick={onToggleDesktopSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-xl text-text-primary hover:bg-primary/10 dark:text-gray-100 dark:hover:bg-primary/20 md:inline-flex"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
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
        {showInstallAction ? (
          <button
            type="button"
            onClick={handleInstallAction}
            aria-label="Instalar app"
            title={platform === "ios" ? "Ver pasos de instalacion" : "Instalar app"}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-cta px-3 text-sm font-semibold text-white shadow-sm shadow-cta/20 transition-colors hover:bg-cta-dark active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">
              {platform === "ios" ? "Instalar app" : "Instalar"}
            </span>
          </button>
        ) : null}

        {/* Mobile nav mode toggle */}
        <button
          type="button"
          aria-label={navMode === "grid" ? "Cambiar a vista de lista" : "Cambiar a vista de iconos"}
          title={navMode === "grid" ? "Vista de lista" : "Vista de iconos"}
          onClick={onToggleNavMode}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-primary/10 active:scale-95 dark:text-gray-100 dark:hover:bg-primary/20 md:hidden"
        >
          {navMode === "grid" ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <LayoutGrid className="h-5 w-5" />
          )}
        </button>

        {/* Notification bell */}
        <Link
          href={`/${role}/notificaciones`}
          aria-label={unreadNotifs > 0 ? `${unreadNotifs} notificaciones sin leer` : "Notificaciones"}
          title="Notificaciones"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-primary/10 active:scale-95 dark:text-gray-100 dark:hover:bg-primary/20"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifs > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white shadow-sm ring-2 ring-white dark:ring-gray-950">
              {unreadNotifs > 99 ? "99+" : unreadNotifs}
            </span>
          )}
        </Link>

        {/* Theme toggle */}
        <button
          type="button"
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={isDark ? "Modo claro" : "Modo oscuro"}
          onClick={handleThemeToggle}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-text-primary transition-colors hover:bg-primary/10 active:scale-95 dark:text-gray-100 dark:hover:bg-primary/20"
        >
          {mounted ? (
            isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />
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
          className="inline-flex h-11 items-center gap-2 rounded-xl border border-danger/30 px-3 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-white active:scale-95 disabled:opacity-50 dark:border-danger/40 dark:text-red-400 dark:hover:bg-danger dark:hover:text-white sm:px-4"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{isSigningOut ? "..." : "Salir"}</span>
        </button>
      </div>
    </header>
  );
}
