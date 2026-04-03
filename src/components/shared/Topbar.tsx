// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)
"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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
  X,
} from "lucide-react";

import type { AppRole } from "@/lib/authz";
import { listarMisNotificacionesRecientes } from "@/actions/notificaciones";

import { usePwaInstall } from "./PwaInstallProvider";

type NotifReciente = {
  id: string;
  titulo: string;
  contenido: string;
  createdAt: Date | null;
  leidoAt: Date | null;
  tipo: string | null;
  asignaturaNombre: string | null;
  totalDestinatarios: number | null;
};

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
  const [notifOpen, setNotifOpen] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState<NotifReciente[] | null>(null);
  const [isFetchingNotifs, startFetchNotifs] = useTransition();
  const notifPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cierra el panel de notificaciones al hacer click fuera
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  const timeAgo = (date: Date | null): string => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days}d`;
  };

  const buildAdminNotifContext = (notif: NotifReciente): string => {
    const total = typeof notif.totalDestinatarios === "number"
      ? `${notif.totalDestinatarios} destinatarios`
      : "sin destinatarios";

    if (notif.tipo === "curso") {
      const courseLabel = notif.asignaturaNombre
        ? `Curso: ${notif.asignaturaNombre}`
        : "Curso";
      return `${courseLabel} · ${total}`;
    }

    if (notif.tipo === "individual") {
      return `Envio individual · ${total}`;
    }

    return `Envio global · ${total}`;
  };

  const handleBellClick = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next && recentNotifs === null) {
      startFetchNotifs(async () => {
        const data = await listarMisNotificacionesRecientes();
        setRecentNotifs(data as NotifReciente[]);
      });
    }
  };

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
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        return;
      }
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
        <div ref={notifPanelRef} className="relative">
          <button
            type="button"
            onClick={handleBellClick}
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
          </button>

          {/* Panel recientes (todos los roles) */}
          {notifOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary dark:text-white">
                    {role === "admin" ? "Ultimos envios" : "Notificaciones recientes"}
                  </span>
                  {role !== "admin" && unreadNotifs > 0 && (
                    <span className="text-xs text-primary dark:text-primary-light">
                      Tienes {unreadNotifs} sin leer
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  className="rounded-lg p-1 text-text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Lista */}
              <div className="max-h-72 overflow-y-auto">
                {isFetchingNotifs ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="text-xs text-text-muted dark:text-gray-500">Cargando…</span>
                  </div>
                ) : recentNotifs && recentNotifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1 py-8">
                    <Bell className="h-7 w-7 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
                    <p className="text-xs text-text-muted dark:text-gray-500">Sin notificaciones</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50 dark:divide-gray-800">
                    {(recentNotifs ?? []).map((n) => {
                      const showUnreadMarker = role !== "admin" && !n.leidoAt;
                      const contentPadding = role !== "admin" && n.leidoAt ? "pl-4" : "";

                      return (
                      <li key={n.id} className={`px-4 py-3 ${showUnreadMarker ? "bg-primary/[0.03] dark:bg-primary/5" : ""}`}>
                        <div className="flex items-start gap-2">
                          {showUnreadMarker && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500" />
                          )}
                          <div className={`min-w-0 flex-1 ${contentPadding}`}>
                            <div className="flex items-baseline justify-between gap-2">
                              <p className={`truncate text-sm font-medium leading-snug ${showUnreadMarker ? "text-text-primary dark:text-white" : "text-text-secondary dark:text-gray-400"}`}>
                                {n.titulo}
                              </p>
                              <span className="flex-shrink-0 text-[10px] text-text-muted dark:text-gray-500">
                                {timeAgo(n.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-xs text-text-muted dark:text-gray-500">
                              {role === "admin" ? buildAdminNotifContext(n) : n.contenido}
                            </p>
                          </div>
                        </div>
                      </li>
                    )})}
                  </ul>
                )}
              </div>

              {/* CTA */}
              <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                <Link
                  href={`/${role}/notificaciones`}
                  onClick={() => setNotifOpen(false)}
                  className="block w-full rounded-xl bg-primary/10 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-light"
                >
                  {role === "admin" ? "Ver historial de envios →" : "Ver todas las notificaciones →"}
                </Link>
              </div>
            </div>
          )}
        </div>

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
