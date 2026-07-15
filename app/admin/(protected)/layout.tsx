import Link from "next/link";
import { redirect } from "next/navigation";
import { MedicineWheel } from "@/components/medicine-wheel";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { createClient } from "@/lib/supabase/server";

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
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <div className="rounded-lg border border-border bg-surface p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold">Not an organizer account</h1>
          <p className="mt-2 text-sm text-muted">
            You&apos;re signed in as {user.email}, but this account isn&apos;t
            authorized to manage draws. Ask an existing organizer to add you.
          </p>
          <div className="mt-4 flex justify-center [&>button]:border-border [&>button]:text-foreground">
            <SignOutButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="no-print bg-header text-header-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-3">
            <MedicineWheel className="h-9 w-9" />
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-wide">
                Aboriginal Alert
              </span>
              <span className="block text-xs uppercase tracking-widest text-accent">
                Draw Organizer Portal
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <span className="hidden text-header-foreground/70 sm:inline">
              {user.email}
            </span>
            <Link
              href="/admin/password"
              className="rounded border border-header-foreground/30 px-3 py-1.5 hover:bg-header-foreground/10"
            >
              Password
            </Link>
            <SignOutButton />
          </nav>
        </div>
        <div className="h-1 w-full bg-primary" />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
    </>
  );
}
