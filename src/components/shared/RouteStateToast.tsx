"use client";

import { useEffect, useMemo, useRef } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

type ToastTone = "success" | "error" | "info";

export type RouteStateToastMap = Record<
  string,
  {
    tone: ToastTone;
    text: string;
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

    if (notification.tone === "success") {
      toast.success(notification.text, { id: toastId });
    } else if (notification.tone === "info") {
      toast(notification.text, { id: toastId });
    } else {
      toast.error(notification.text, { id: toastId });
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
