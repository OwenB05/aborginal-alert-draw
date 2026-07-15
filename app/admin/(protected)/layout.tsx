import { redirect } from "next/navigation";
import { TopNav, NavLink } from "@/components/layout/top-nav";
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
        <TopNav subtitle="Draw Organizer" />
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
      <TopNav subtitle="Draw Organizer" homeHref="/admin">
        <span
          className="hidden max-w-[16rem] truncate text-xs text-maroon-200 md:inline"
          title={user.email ?? undefined}
        >
          {user.email}
        </span>
        <NavLink href="/admin/password">Password</NavLink>
        <SignOutButton />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
