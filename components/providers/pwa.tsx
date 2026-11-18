"use client";

import { useEffect } from "react";

/** Servis çalışanını kaydeder (yalnızca production; geliştirmede önbellek karışmasın). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* kayıt başarısızsa uygulama yine normal çalışır */
    });
  }, []);
  return null;
}
