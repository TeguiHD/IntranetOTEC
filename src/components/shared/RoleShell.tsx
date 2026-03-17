"use client";

import { useEffect, useState } from "react";

import { usePathname } from "next/navigation";

import type { AppRole } from "@/lib/authz";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const SIDEBAR_STORAGE_KEY = "otec.sidebar.collapsed";

type RoleShellProps = {
  role: AppRole;
  userName: string;
  children: React.ReactNode;
};

export function RoleShell({ role, userName, children }: RoleShellProps) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedState = globalThis.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (storedState === "1") {
      setIsSidebarCollapsed(true);
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    globalThis.localStorage.setItem(SIDEBAR_STORAGE_KEY, isSidebarCollapsed ? "1" : "0");
  }, [hydrated, isSidebarCollapsed]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-bg-light dark:bg-gray-950">
      <Topbar
        role={role}
        userName={userName}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleDesktopSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
      />

      <Sidebar
        role={role}
        collapsed={isSidebarCollapsed}
        mobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={`pt-16 transition-[margin-left] duration-300 ease-out ${
          isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <main className="min-h-[calc(100dvh-4rem)] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}