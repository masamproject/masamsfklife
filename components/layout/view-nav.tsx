"use client";

import { KanbanSquare, ListTodo, NotebookText, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const VIEWS = [
  { href: "/pano", label: "Pano", icon: KanbanSquare },
  { href: "/liste", label: "Liste", icon: ListTodo },
  { href: "/notlar", label: "Notlar", icon: NotebookText },
  { href: "/cop-kutusu", label: "Çöp Kutusu", icon: Trash2 },
];

export function ViewNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {VIEWS.map((v) => {
        const active = pathname.startsWith(v.href);
        return (
          <Link
            key={v.href}
            href={v.href}
            title={v.label}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <v.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{v.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
