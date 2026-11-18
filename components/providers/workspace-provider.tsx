"use client";

import { createContext, useContext } from "react";

export type WorkspaceCtx = {
  id: string;
  name: string;
  role: "owner" | "admin" | "member";
  user: { id: string; name: string; email: string; image?: string | null };
};

const Ctx = createContext<WorkspaceCtx | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceCtx;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace WorkspaceProvider dışında kullanıldı");
  return v;
}
