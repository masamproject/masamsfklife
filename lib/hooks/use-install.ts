"use client";

import { useEffect, useState } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Tarayıcının "uygulama olarak yükle" teklifini yakalar; düğmeyle tetiklenir. */
export function useInstall() {
  const [ev, setEv] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEv(e as InstallEvent);
    };
    const onInstalled = () => setEv(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return {
    canInstall: !!ev,
    install: async () => {
      if (!ev) return;
      await ev.prompt();
      await ev.userChoice;
      setEv(null);
    },
  };
}
