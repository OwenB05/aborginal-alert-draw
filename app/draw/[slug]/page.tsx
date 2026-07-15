import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_DRAW_COLUMNS, type PublicDraw } from "@/lib/types";
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
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Community Draw
          </p>
          <h1 className="mt-1 text-3xl font-bold">{draw.title}</h1>
          {draw.prize && (
            <p className="mt-3 rounded bg-accent/15 px-3 py-2 text-sm">
              <span className="font-semibold">Prize:</span> {draw.prize}
            </p>
          )}
          {draw.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-muted">
              {draw.description}
            </p>
          )}

          {draw.status === "open" ? (
            <EntryForm drawId={draw.id} slug={draw.slug} />
          ) : (
            <div className="mt-6 rounded border border-border bg-background px-4 py-6 text-center">
              <p className="text-lg font-semibold">This draw is closed.</p>
              <p className="mt-1 text-sm text-muted">
                Entries are no longer being accepted. Thank you for your
                interest!
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
