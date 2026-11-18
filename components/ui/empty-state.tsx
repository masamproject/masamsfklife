import { cn } from "@/lib/utils";

/** Boş durum: bulunduğu alanı tamamen doldurur, ortada mesaj gösterir. */
export function EmptyState({ title, children, className }: { title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-h-[220px] flex-1 place-items-center rounded-lg border border-dashed bg-card/60 p-8 text-center text-muted-foreground", className)}>
      <div className="max-w-md">
        <strong className="mb-1 block text-base text-foreground">{title}</strong>
        {children}
      </div>
    </div>
  );
}
