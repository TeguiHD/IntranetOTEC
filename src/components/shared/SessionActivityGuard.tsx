"use client";

import { useEffect, useRef } from "react";

import { signOut } from "next-auth/react";

import type { AppRole } from "@/lib/authz";

type SessionActivityGuardProps = {
  role: AppRole;
};

const ALUMNO_INACTIVITY_MS = 12 * 60 * 60 * 1000;

export function SessionActivityGuard({ role }: SessionActivityGuardProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (role !== "alumno") return;

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        void signOut({ callbackUrl: "/login?state=session_expired" });
      }, ALUMNO_INACTIVITY_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    resetTimer();
    events.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
    };
  }, [role]);

  return null;
}
