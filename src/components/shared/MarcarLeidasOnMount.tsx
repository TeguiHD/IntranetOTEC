"use client";

import { useEffect, useRef } from "react";

type Props = {
  action: () => Promise<unknown>;
};

export function MarcarLeidasOnMount({ action }: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    action().catch(() => {});
  }, [action]);

  return null;
}
