"use client";

import { useEffect, useState } from "react";

/** Ekran en az `min` px mi? (varsayılan 768: masaüstü; mobilde sürükle-bırak kapalı). */
export function useIsDesktop(min = 768) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${min}px)`);
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [min]);
  return v;
}
