"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/** İki adımlı onay: ilk tık "Emin misin?" gösterir (4 sn), ikinci tık işlemi yapar. */
export function ConfirmButton({ label, onConfirm, className }: { label: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(t.current), []);
  return (
    <Button
      type="button"
      size="sm"
      variant={armed ? "destructive" : "outline"}
      className={armed ? className : `text-destructive hover:text-destructive ${className ?? ""}`}
      onClick={() => {
        if (armed) {
          clearTimeout(t.current);
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        t.current = setTimeout(() => setArmed(false), 4000);
      }}
    >
      {armed ? "Emin misin?" : label}
    </Button>
  );
}
