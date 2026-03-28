"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates every 60 seconds
        setInterval(() => registration.update(), 60_000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              toast("Hay una nueva versión disponible.", {
                action: {
                  label: "Actualizar",
                  onClick: () => {
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                    window.location.reload();
                  },
                },
                duration: 30_000,
              });
            }
          });
        });
      })
      .catch(() => {});
  }, []);

  return null;
}
