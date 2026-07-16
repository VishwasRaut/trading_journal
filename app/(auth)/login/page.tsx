import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Sign in — Ledger" };

export default function LoginPage() {
  return (
    <div className="glass rounded-3xl p-8 shadow-2xl shadow-primary/5">
      <div className="mb-7 space-y-1.5">
        <h2 className="font-display text-3xl leading-tight tracking-tight">
          Welcome back
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Sign in to open your trading journal.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        New here?{" "}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
