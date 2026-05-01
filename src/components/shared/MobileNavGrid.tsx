// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { X } from "lucide-react";

import type { AppRole } from "@/lib/authz";
import {
  GRADIENT_COLORS,
  ROLE_LABELS,
  getNavigationSectionsForRole,
} from "./navigationConfig";

type MobileNavGridProps = {
  role: AppRole;
  userName: string;
  open: boolean;
  onClose: () => void;
};

export function MobileNavGrid({ role, userName, open, onClose }: MobileNavGridProps) {
  const pathname = usePathname();
  const sections = getNavigationSectionsForRole(role);
  const homeHref = `/${role}`;

  const isActive = (href: string): boolean => {
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (!open) return null;

  return (
    <div className="app-mobile-sheet fixed inset-0 z-50 flex flex-col bg-[#f3eef9] dark:bg-gray-950 md:hidden">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-purple-100 bg-white px-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-intranet.webp"
            alt="Mi OTEC Intranet"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
            priority
            unoptimized
          />
          <div>
            <p className="text-sm font-bold text-text-primary dark:text-white">Mi OTEC</p>
            <p className="text-xs text-text-secondary dark:text-gray-400">
              {ROLE_LABELS[role]} · {userName.split(" ")[0]}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Grid sections */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <div className="px-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-gray-500">
                  {section.title}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex flex-col items-center gap-3 rounded-2xl p-5 text-center transition-all duration-200 active:scale-95 ${
                        active
                          ? "bg-white shadow-lg ring-2 ring-cta/30 dark:bg-gray-800 dark:ring-cta/50"
                          : "bg-white shadow-sm hover:shadow-md dark:bg-gray-900 dark:hover:bg-gray-800"
                      }`}
                    >
                      <item.Icon
                        className="h-12 w-12 transition-transform duration-200 group-hover:scale-110"
                        strokeWidth={1.5}
                        style={{ color: GRADIENT_COLORS[item.gradient] ?? "#6B7280" }}
                      />
                      <span
                        className={`text-sm font-bold leading-tight ${
                          active
                            ? "text-cta dark:text-cta"
                            : "text-text-primary dark:text-gray-200"
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-purple-100 bg-white/80 px-4 py-3 text-center backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
        <p className="text-xs text-text-muted dark:text-gray-500">
          Entorno seguro ·{" "}
          <a
            href="https://www.instagram.com/netlinks.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            Creado por NETLINKS
          </a>
        </p>
      </div>
    </div>
  );
}
