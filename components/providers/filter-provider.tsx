"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = { q: string; setQ: (v: string) => void; pf: string; setPf: (v: string) => void };
const C = createContext<Ctx | null>(null);

/** Üst çubuktaki arama metni ve proje filtresi; tüm görünümler bunu okur. */
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [pf, setPfState] = useState("");
  // Seçili proje yenilemede kaybolmasın (uyumsuzluk olmasın diye mount sonrası okunur)
  useEffect(() => {
    try {
      setPfState(localStorage.getItem("masam-pf") ?? "");
    } catch {
      /* okunamazsa tüm projeler */
    }
  }, []);
  const setPf = useCallback((v: string) => {
    setPfState(v);
    try {
      localStorage.setItem("masam-pf", v);
    } catch {
      /* yoksay */
    }
  }, []);
  const v = useMemo(() => ({ q, setQ, pf, setPf }), [q, pf, setPf]);
  return <C.Provider value={v}>{children}</C.Provider>;
}

export function useFilter() {
  const v = useContext(C);
  if (!v) throw new Error("useFilter FilterProvider dışında kullanıldı");
  return v;
}

const norm = (s: string) => s.toLocaleLowerCase("tr-TR");
/** Arama: verilen alanların herhangi biri eşleşirse true. */
export function matches(q: string, ...parts: (string | string[] | null | undefined)[]) {
  if (!q) return true;
  const n = norm(q);
  return parts.some((p) => norm(Array.isArray(p) ? p.join(" ") : (p ?? "")).includes(n));
}
