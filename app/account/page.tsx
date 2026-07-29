import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { Footer } from "@/components/layout/footer";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { card, heading, link, metaText } from "@/lib/ui";
import { ChangePasswordForm } from "./change-password-form";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Organizers have a row here (RLS lets a user read only their own).
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const isOrganizer = !!adminRow;

  return (
    <>
      <TopNav homeHref={isOrganizer ? "/admin" : "/"}>
        <SettingsMenu showAccount />
        <SignOutButton />
      </TopNav>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 sm:px-6">
        {isOrganizer && (
          <Link href="/admin" className={`mt-6 inline-block text-sm ${link}`}>
            ← All draws
          </Link>
        )}

        <h1 className={`mt-4 text-2xl ${heading}`}>Account</h1>

        <div className={`mt-4 ${card} p-5`}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className={metaText}>Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className={metaText}>Role</dt>
              <dd>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isOrganizer
                      ? "bg-maroon-50 text-maroon-700 dark:bg-maroon-950 dark:text-maroon-200"
                      : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  {isOrganizer ? "Organizer" : "Signed in"}
                </span>
              </dd>
            </div>
            {user.created_at && (
              <div className="flex justify-between gap-3">
                <dt className={metaText}>Member since</dt>
                <dd className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className={`mt-4 ${card} p-5`}>
          <h2 className={`text-lg ${heading}`}>Password</h2>
          <ChangePasswordForm email={user.email ?? ""} />
        </div>

        <p className={`mt-4 text-xs ${metaText}`}>
          Display and accessibility settings (theme, text size, font, motion,
          contrast) live under the gear icon in the header and are saved on this
          device.
        </p>
      </main>
      <Footer />
    </>
  );
}
