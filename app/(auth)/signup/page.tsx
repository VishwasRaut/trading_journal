import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = { title: "Create your journal — Ledger" };

export default function SignupPage() {
  return (
    <div className="glass rounded-3xl p-8 shadow-2xl shadow-primary/5">
      <div className="mb-7 space-y-1.5">
        <h2 className="font-display text-3xl leading-tight tracking-tight">
          Start your journal
        </h2>
        <p className="text-[15px] text-muted-foreground">
          Free forever for personal use. Your data is only yours.
        </p>
      </div>
      <SignupForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
