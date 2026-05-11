"use client";

import { useEffect } from "react";

const KEEP_ALIVE_INTERVAL_MS = 10 * 60 * 1000;

const refreshSession = () => {
  void fetch("/api/auth/session", {
    cache: "no-store",
    credentials: "same-origin",
  }).catch(() => {
    // If the device goes offline, the next focus/interval retries.
  });
};

export function SessionKeepAlive() {
  useEffect(() => {
    refreshSession();

    const intervalId = window.setInterval(refreshSession, KEEP_ALIVE_INTERVAL_MS);

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    };

    window.addEventListener("focus", refreshSession);
    window.addEventListener("online", refreshSession);
    document.addEventListener("visibilitychange", handleVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("online", refreshSession);
      document.removeEventListener("visibilitychange", handleVisible);
    };
  }, []);

  return null;
}
