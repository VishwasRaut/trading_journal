import { LineChart, Copy, ExternalLink } from "lucide-react";

export const metadata = { title: "Setup — Ledger" };

export default function SetupPage() {
  return (
    <div className="relative min-h-screen w-full">
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6 md:p-12">
        <div className="mb-6 flex items-center gap-2 text-lg font-semibold tracking-tight">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <LineChart className="size-5" />
          </div>
          Ledger
        </div>

        <div className="glass rounded-3xl p-8 shadow-2xl shadow-primary/5">
          <h1 className="text-3xl font-semibold tracking-tight">
            Almost there — let&apos;s connect Supabase
          </h1>
          <p className="text-muted-foreground mt-2">
            Ledger stores your trades, notes and chart images in Supabase.
            Follow these three steps to finish setup (it takes ~2 minutes).
          </p>

          <ol className="mt-8 grid gap-6">
            <Step number={1} title="Create a free Supabase project">
              Head to{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-primary font-medium hover:underline"
              >
                supabase.com/dashboard
                <ExternalLink className="ml-0.5 inline size-3" />
              </a>{" "}
              and create a new project. Any region is fine.
            </Step>

            <Step
              number={2}
              title="Run the schema migration"
            >
              In the Supabase dashboard, open{" "}
              <span className="font-medium">SQL Editor</span> and paste the
              contents of{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                supabase/migrations/0001_init.sql
              </code>{" "}
              from this repo. Click <span className="font-medium">Run</span>.
              This creates the schema, RLS policies, and the{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                trade-charts
              </code>{" "}
              storage bucket.
            </Step>

            <Step
              number={3}
              title="Add your API keys to .env.local"
            >
              <p>
                In Supabase, go to{" "}
                <span className="font-medium">Project Settings → API</span>{" "}
                and copy the <em>Project URL</em> and the <em>anon public</em>{" "}
                key.
              </p>
              <p className="mt-3">
                Create a file called{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  .env.local
                </code>{" "}
                at the project root with:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg border bg-muted/50 p-3 text-xs">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>`}
              </pre>
              <p className="text-muted-foreground mt-3 text-sm">
                Then stop the dev server (Ctrl+C) and run{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  npm run dev
                </code>{" "}
                again. This page will disappear and you&apos;ll see the
                login screen.
              </p>
            </Step>
          </ol>

          <div className="mt-8 rounded-xl border border-border/60 bg-card/50 p-4 text-sm">
            <div className="mb-1 flex items-center gap-2 font-medium">
              <Copy className="size-4" /> Tip
            </div>
            <p className="text-muted-foreground">
              You can copy{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                .env.local.example
              </code>{" "}
              in the project root as a starting point.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-semibold text-primary">
        {number}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="font-medium">{title}</div>
        <div className="text-muted-foreground mt-1 text-sm">{children}</div>
      </div>
    </li>
  );
}
