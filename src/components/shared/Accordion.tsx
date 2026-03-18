"use client";

import { useState } from "react";

type AccordionItemProps = {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function AccordionItem({ title, badge, children, defaultOpen = false }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/50 dark:active:bg-gray-800"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium text-text-primary dark:text-gray-100">
            {title}
          </span>
          {badge ? (
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {badge}
            </span>
          ) : null}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 text-text-secondary transition-transform duration-200 dark:text-gray-400 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          {children}
        </div>
      ) : null}
    </div>
  );
}
