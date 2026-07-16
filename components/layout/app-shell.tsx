"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { PageTransition } from "./page-transition";
import type { TradingAccountRow } from "@/types/database";

export type AppUser = {
  id: string;
  email: string;
  displayName: string;
  currency: string;
};

export function AppShell({
  user,
  accounts,
  currentAccountId,
  balances,
  children,
}: {
  user: AppUser;
  accounts: TradingAccountRow[];
  currentAccountId: string;
  balances: Record<string, number>;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen w-full">
      <div className="pointer-events-none fixed inset-0 bg-radial-fade" />
      <div className="pointer-events-none fixed inset-0 bg-grid opacity-30" />

      <Sidebar user={user} />
      <div className="relative flex min-h-screen flex-1 flex-col lg:pl-64">
        <Topbar
          user={user}
          accounts={accounts}
          currentAccountId={currentAccountId}
          balances={balances}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
