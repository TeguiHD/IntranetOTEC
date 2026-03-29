"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Platform = "android" | "ios" | "desktop" | null;
type InstallOutcome = "accepted" | "dismissed" | "unavailable";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PwaInstallContextValue = {
  platform: Platform;
  isIosSafari: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  promptInstall: () => Promise<InstallOutcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

const detectPlatform = (): Platform => {
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent.toLowerCase();
  const isIpadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/.test(ua) || isIpadOs) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
};

const detectIosSafari = (): boolean => {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent.toLowerCase();
  const isIpadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIos = /iphone|ipad|ipod/.test(ua) || isIpadOs;
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|opios/.test(ua);

  return isIos && isSafari;
};

const computeInstalled = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
};

export function PwaInstallProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [platform, setPlatform] = useState<Platform>(null);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsIosSafari(detectIosSafari());
    setIsInstalled(computeInstalled());

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    const syncInstalledState = () => {
      setIsInstalled(computeInstalled());
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    mediaQuery.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);

      mediaQuery.removeEventListener("change", syncInstalledState);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable";

    const installEvent = deferredPrompt;
    setDeferredPrompt(null);

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    return outcome;
  }, [deferredPrompt]);

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      platform,
      isIosSafari,
      isInstalled,
      isInstallable: deferredPrompt !== null,
      promptInstall,
    }),
    [deferredPrompt, isInstalled, isIosSafari, platform, promptInstall],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);

  if (!context) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }

  return context;
}
