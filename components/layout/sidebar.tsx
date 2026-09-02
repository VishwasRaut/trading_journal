"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  LineChart,
  ListChecks,
  CalendarDays,
  Settings,
  Wallet,
  Upload,
  BookOpen,
  NotebookPen,
} from "lucide-react";
import type { AppUser } from "./app-shell";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: ListChecks },
  { href: "/playbooks", label: "Playbooks", icon: BookOpen },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-sidebar/70 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <LineChart className="size-5" />
        </div>
        <span className="font-display text-xl leading-none tracking-[-0.03em]">
          Ledger
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "text-sidebar-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-primary shadow-md shadow-primary/25"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative flex items-center gap-3">
                <item.icon className="size-4" />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-xl border border-border/50 bg-card/40 p-3 backdrop-blur">
        <div className="text-xs text-muted-foreground">Signed in as</div>
        <div className="truncate text-sm font-medium">{user.displayName}</div>
        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
      </div>
    </aside>
  );
}
