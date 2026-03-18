"use client";

import { useEffect, useMemo, useRef } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ToastTone = "success" | "error" | "info" | "warning";

export type RouteStateToastMap = Record<
  string,
  {
    tone: ToastTone;
    text: string;
    description?: string;
  }
>;

type RouteStateToastProps = {
  state?: string;
  map: RouteStateToastMap;
  clearParam?: boolean;
  paramName?: string;
};

export function RouteStateToast({
  state,
  map,
  clearParam = true,
  paramName = "state",
}: RouteStateToastProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastToastIdRef = useRef<string | null>(null);

  const notification = useMemo(() => {
    if (!state) {
      return null;
    }

    return map[state] ?? map.error ?? null;
  }, [map, state]);

  useEffect(() => {
    if (!state || !notification) {
      return;
    }

    const toastId = `${pathname}:${paramName}:${state}`;

    if (lastToastIdRef.current === toastId) {
      return;
    }

    lastToastIdRef.current = toastId;

    const opts = {
      id: toastId,
      description: notification.description,
    };

    switch (notification.tone) {
      case "success":
        toast.success(notification.text, opts);
        break;
      case "warning":
        toast.warning(notification.text, opts);
        break;
      case "info":
        toast.info(notification.text, opts);
        break;
      default:
        toast.error(notification.text, opts);
        break;
    }

    if (!clearParam) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());

    if (!nextParams.has(paramName)) {
      return;
    }

    nextParams.delete(paramName);

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    clearParam,
    notification,
    paramName,
    pathname,
    router,
    searchParams,
    state,
  ]);

  return null;
}
