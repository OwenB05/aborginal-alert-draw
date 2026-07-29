import Link from "next/link";
import { redirect } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { AdminNav } from "@/components/layout/main-nav";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { Footer } from "@/components/layout/footer";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { btnSecondary, card, heading } from "@/lib/ui";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  // Only allowlisted organizers may use the portal. RLS lets a user read
  // exactly their own admin_users row, so this returns 0 or 1 rows.
  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRow) {
    return (
      <>
        <TopNav homeHref="/admin">
          <SettingsMenu />
          <SignOutButton />
        </TopNav>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
          <div className={`mx-auto mt-12 max-w-md ${card} p-6 text-center`}>
            <h1 className={`text-xl ${heading}`}>Not an organizer account</h1>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              You&apos;re signed in as {user.email}, but this account
              isn&apos;t authorized to manage draws. Ask an existing organizer
              to add you.
            </p>
            <div className="mt-4 flex justify-center">
              <SignOutButton className={btnSecondary} />
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <TopNav homeHref="/admin">
        <AdminNav />
        <SettingsMenu showAccount />
        <span
          aria-hidden="true"
          className="mx-2 hidden h-5 w-px bg-white/30 sm:block"
        />
        <Link
          href="/account"
          className="hidden max-w-44 truncate rounded text-xs font-normal text-maroon-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:inline"
          title={`${user.email} — account settings`}
        >
          {user.email}
        </Link>
        <SignOutButton />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
