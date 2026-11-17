import { cn } from "@/lib/utils";

const TONES = {
  default: "bg-muted text-muted-foreground",
  late: "bg-danger-soft text-destructive",
  today: "bg-warn-soft text-warn",
  high: "bg-danger-soft text-destructive",
  mid: "bg-warn-soft text-warn",
  tag: "border border-border bg-transparent text-muted-foreground",
  link: "bg-primary-soft text-primary",
  proj: "border border-primary bg-transparent text-primary",
} as const;

export function Pill({
  tone = "default",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block max-w-full truncate whitespace-nowrap rounded-full px-[7px] py-px font-mono text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
