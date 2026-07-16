import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/settings-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = { title: "Settings — Ledger" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Settings"
        subtitle="Configure your profile and preferences."
      />
      <SettingsForm
        userId={user.id}
        email={user.email ?? ""}
        initial={profile}
      />
    </div>
  );
}
