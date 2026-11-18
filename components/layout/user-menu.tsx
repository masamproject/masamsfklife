"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Download, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { useInstall } from "@/lib/hooks/use-install";

export function UserMenu() {
  const { id: workspaceId, user, plan, role } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const checkout = process.env.NEXT_PUBLIC_CHECKOUT_URL;
  const { canInstall, install } = useInstall();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-8 w-8">
          {user.image && <AvatarImage src={user.image} alt={user.name} />}
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
          <div className="flex gap-1 pt-1">
            <Badge variant={plan === "pro" ? "default" : "secondary"}>
              {plan === "pro" ? "Pro" : "Free"}
            </Badge>
            <Badge variant="outline">{role}</Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {plan === "free" && (
          <DropdownMenuItem
            disabled={!checkout}
            onClick={() => {
              if (!checkout) return;
              // Ödeme sağlayıcısı webhook'ta workspace'i bu özel alandan tanır
              const sep = checkout.includes("?") ? "&" : "?";
              window.open(
                `${checkout}${sep}checkout[custom][workspace_id]=${encodeURIComponent(workspaceId)}`,
                "_blank",
              );
            }}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {checkout ? "Pro'ya geç" : "Pro'ya geç (yakında)"}
          </DropdownMenuItem>
        )}
        {canInstall && (
          <DropdownMenuItem onClick={install}>
            <Download className="mr-2 h-4 w-4" /> Uygulamayı yükle
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            qc.clear();
            router.replace("/");
            router.refresh();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Çıkış yap
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
