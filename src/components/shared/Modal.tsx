"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Max width class. Defaults to "max-w-lg" */
  size?: "max-w-md" | "max-w-lg" | "max-w-xl" | "max-w-2xl" | "max-w-3xl";
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "max-w-lg",
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  // Focus trap: focus first focusable element on open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelector<HTMLElement>(
      'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();
  }, [open]);

  if (!open) return null;

  const content = (
    <div
      ref={overlayRef}
      role="presentation"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${size} max-h-[90dvh] overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-700/60 dark:bg-gray-900`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
          <div>
            <h2 className="text-lg font-semibold text-text-primary dark:text-white">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-gray-100 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
