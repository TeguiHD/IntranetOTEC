"use client";

import { useEffect, useRef } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationSetup() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current || !VAPID_PUBLIC_KEY) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "denied") return;

    registered.current = true;

    const setup = async () => {
      try {
        const permission = Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

        if (permission !== "granted") return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();

        // Si ya hay suscripcion activa, registrarla en el servidor igualmente
        const subscription =
          existing ??
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
          }));

        const json = subscription.toJSON();

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
          }),
        });
      } catch {
        // Silently fail — push notifications are optional
      }
    };

    // Esperar a que el SW este activo
    navigator.serviceWorker.ready.then(() => setup());
  }, []);

  return null;
}
