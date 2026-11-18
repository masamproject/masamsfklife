"use client";

import { useEffect } from "react";

/** Sert yenileme: servis çalışanı + önbellekleri temizleyip sayfayı yeniden yükler. */
async function hardReload() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}

/** Servis çalışanını kaydeder (yalnızca production) ve Ctrl/Cmd+(Shift)+R kısayollarını sağlar. */
export function PwaRegister() {
  useEffect(() => {
    // Yüklü uygulamada (standalone) tarayıcı kısayolları çalışmaz; kendimiz karşılıyoruz.
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== "r") return;
      e.preventDefault();
      if (e.shiftKey) void hardReload();
      else window.location.reload();
    };
    window.addEventListener("keydown", onKey);

    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* kayıt başarısızsa uygulama yine normal çalışır */
      });
    }
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
