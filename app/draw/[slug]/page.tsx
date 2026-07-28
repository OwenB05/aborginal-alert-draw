import { notFound } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Footer } from "@/components/layout/footer";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_DRAW_COLUMNS, type PublicDraw } from "@/lib/types";
import { card, heading, bodyText } from "@/lib/ui";
import { EntryForm } from "./entry-form";

export const dynamic = "force-dynamic";

export default async function DrawPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Anon role only has column-level SELECT on these fields — never use "*".
  const { data: draw } = await supabase
    .from("draws")
    .select(PUBLIC_DRAW_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<PublicDraw>();

  if (!draw) notFound();

  return (
    <>
      <TopNav>
        <ThemeToggle />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        <div className={`mx-auto mt-6 max-w-xl ${card} p-5 sm:p-6`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-maroon-700 dark:text-maroon-300">
              Community Draw
            </p>
            <StatusBadge status={draw.status} />
          </div>
          <h1 className={`mt-2 text-2xl ${heading}`}>{draw.title}</h1>
          {draw.prize && (
            <p className="mt-3 rounded-lg bg-maroon-50 px-3 py-2 text-sm text-maroon-900 dark:bg-maroon-950 dark:text-maroon-100">
              <span className="font-semibold">Prize:</span> {draw.prize}
            </p>
          )}
          {draw.description && (
            <p className={`mt-3 whitespace-pre-wrap text-sm ${bodyText}`}>
              {draw.description}
            </p>
          )}

          {draw.status === "open" ? (
            <EntryForm drawId={draw.id} slug={draw.slug} />
          ) : (
            <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-6 text-center dark:border-stone-700 dark:bg-stone-800">
              <p className={`text-lg ${heading}`}>This draw is closed.</p>
              <p className={`mt-1 text-sm ${bodyText}`}>
                Entries are no longer being accepted. Thank you for your
                interest!
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
