"use client";

import { useEffect, useRef } from "react";

import { toast } from "sonner";

type MessageTone = "success" | "error" | "info";

type MessageToastProps = {
  message?: string | null;
  tone?: MessageTone;
};

export function MessageToast({ message, tone = "info" }: MessageToastProps) {
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!message || lastMessageRef.current === message) {
      return;
    }

    lastMessageRef.current = message;

    if (tone === "success") {
      toast.success(message);
    } else if (tone === "error") {
      toast.error(message);
    } else {
      toast(message);
    }
  }, [message, tone]);

  return null;
}
