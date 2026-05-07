// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)
"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/authz";

import { Breadcrumbs } from "./Breadcrumbs";
import { Footer } from "./Footer";
import { MobileNavGrid } from "./MobileNavGrid";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const SIDEBAR_STORAGE_KEY = "otec.sidebar.collapsed";
const NAV_MODE_STORAGE_KEY = "otec.nav.mode";

type NavMode = "grid" | "sidebar";

type RoleShellProps = {
  role: AppRole;
  userName: string;
  children: React.ReactNode;
  pendingSolicitudes?: number;
  unreadNotifs?: number;
};

export function RoleShell({ role, userName, children, pendingSolicitudes, unreadNotifs }: RoleShellProps) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [navMode, setNavMode] = useState<NavMode>("grid");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedCollapsed = globalThis.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedCollapsed === "1") setIsSidebarCollapsed(true);

    const storedMode = globalThis.localStorage.getItem(NAV_MODE_STORAGE_KEY);
    if (storedMode === "sidebar") setNavMode("sidebar");

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    globalThis.localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarCollapsed ? "1" : "0");
  }, [hydrated, isSidebarCollapsed]);

  useEffect(() => {
    if (!hydrated) return;
    globalThis.localStorage.setItem(NAV_MODE_STORAGE_KEY, navMode);
  }, [hydrated, navMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.documentElement.dataset.otecMobileNavOpen =
      isMobileSidebarOpen ? "1" : "0";

    window.dispatchEvent(
      new CustomEvent("otec:mobile-nav-state", {
        detail: { open: isMobileSidebarOpen },
      }),
    );

    return () => {
      document.documentElement.dataset.otecMobileNavOpen = "0";
    };
  }, [isMobileSidebarOpen]);

  // Close mobile nav on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleToggleMobile = () => setIsMobileSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark">
      <Topbar
        role={role}
        userName={userName}
        isSidebarCollapsed={isSidebarCollapsed}
        navMode={navMode}
        unreadNotifs={unreadNotifs ?? 0}
        pendingSolicitudes={pendingSolicitudes ?? 0}
        onToggleDesktopSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onToggleMobileSidebar={handleToggleMobile}
        onToggleNavMode={() => setNavMode((m) => (m === "grid" ? "sidebar" : "grid"))}
      />

      {/* Mobile: grid overlay (default) */}
      <MobileNavGrid
        role={role}
        userName={userName}
        open={isMobileSidebarOpen && navMode === "grid"}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Desktop sidebar + Mobile sidebar (when mode is "sidebar") */}
      <Sidebar
        role={role}
        userName={userName}
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen && navMode === "sidebar"}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingSolicitudes={pendingSolicitudes}
      />

      <div
        className={`app-shell-offset transition-[margin-left] duration-300 ease-out ${
          isSidebarCollapsed ? "md:ml-[4.5rem]" : "md:ml-64"
        }`}
      >
        <main className="app-main-shell mx-auto min-h-[calc(100dvh-4rem)] max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
          <Breadcrumbs />
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
