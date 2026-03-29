// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { X } from "lucide-react";

import type { AppRole } from "@/lib/authz";
import { GRADIENT_COLORS, ROLE_LABELS, ROLE_SECTIONS } from "./navigationConfig";

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
      src="/logo-intranet.webp"
      alt="Mi OTEC Intranet"
      width={collapsed ? 44 : 44}
      height={collapsed ? 44 : 44}
      className="h-11 w-11 rounded-xl object-contain"
      priority
      unoptimized
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
