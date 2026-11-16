"use client";

import { useEffect, useState } from "react";

/** Masaüstü (>=768px) mü? Mobilde sürükle-bırak kapalı. */
export function useIsDesktop() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return v;
}
