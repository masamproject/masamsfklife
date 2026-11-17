"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Debounce'lu otomatik kayıt: alanlar birikir, `delay` ms sonra tek `commit` çağrılır.
 * Bileşen kapanırken (unmount) bekleyen değişiklik hemen yazılır.
 */
export function useSaver<P extends object>(commit: (p: Partial<P>) => void, delay = 500) {
  const patch = useRef<Partial<P>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const p = patch.current;
    patch.current = {};
    if (Object.keys(p).length) commitRef.current(p);
  }, []);

  const set = useCallback(
    (p: Partial<P>, d = delay) => {
      Object.assign(patch.current, p);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, d);
    },
    [flush, delay],
  );

  const discard = useCallback(() => {
    clearTimeout(timer.current);
    patch.current = {};
  }, []);

  useEffect(() => flush, [flush]);
  return { set, flush, discard };
}
