import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { Footer } from "@/components/layout/footer";
import { createClient } from "@/lib/supabase/server";
import { getMfaStatus } from "@/lib/mfa";
import { safeNext } from "@/lib/mfa-policy";
import { MfaChallengeForm } from "./mfa-challenge-form";

export const dynamic = "force-dynamic";

/** Per-session step-up. Reached only via the middleware choke point. */
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const status = await getMfaStatus();
  // Nothing to challenge, or already stepped up — don't trap anyone here.
  if (!status.enrolled || status.currentLevel === "aal2")
    redirect(safeNext(next));

  return (
    <>
      <TopNav homeHref="/admin">
        <SettingsMenu />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        <MfaChallengeForm next={safeNext(next)} email={user.email ?? ""} />
      </main>
      <Footer />
    </>
  );
}
