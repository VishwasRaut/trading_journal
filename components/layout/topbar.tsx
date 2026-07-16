"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LineChart, LogOut, Menu, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { AccountSwitcher } from "@/components/accounts/account-switcher";
import { Sidebar } from "./sidebar";
import type { AppUser } from "./app-shell";
import type { TradingAccountRow } from "@/types/database";

export function Topbar({
  user,
  accounts,
  currentAccountId,
  balances,
}: {
  user: AppUser;
  accounts: TradingAccountRow[];
  currentAccountId: string;
  balances: Record<string, number>;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.replace("/login");
    router.refresh();
  }

  const initials = user.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur-xl md:px-8">
      <Sheet>
        <SheetTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "lg:hidden",
          )}
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar user={user} />
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <LineChart className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">Ledger</span>
      </Link>

      <AccountSwitcher
        accounts={accounts}
        currentAccountId={currentAccountId}
        balances={balances}
      />

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/trades/new"
          className={cn(
            buttonVariants({ size: "sm" }),
            "hidden md:inline-flex",
          )}
        >
          <PlusCircle className="mr-1.5 size-4" /> New trade
        </Link>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="grid size-10 place-items-center rounded-full bg-linear-to-br from-primary to-chart-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:scale-105"
            aria-label="Account menu"
          >
            {initials || "?"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{user.displayName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {user.email}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/settings">Settings</Link>}
            />
            <DropdownMenuItem
              onClick={signOut}
              className="text-loss"
            >
              <LogOut className="mr-2 size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
