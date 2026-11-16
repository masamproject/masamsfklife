import Link from "next/link";
import { SearchBox } from "@/components/layout/search-box";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { ViewNav } from "@/components/layout/view-nav";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

export function Topbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 sm:px-4">
      <WorkspaceSwitcher />
      <Link href="/pano" className="hidden text-lg font-bold tracking-tight sm:block">
        Masam
      </Link>
      <div className="flex min-w-0 flex-1 justify-center">
        <SearchBox />
      </div>
      <ViewNav />
      <ThemeToggle />
      <UserMenu />
    </header>
  );
}
