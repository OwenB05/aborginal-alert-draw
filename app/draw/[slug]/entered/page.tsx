import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { MedicineWheel } from "@/components/medicine-wheel";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_DRAW_COLUMNS, type PublicDraw } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EnteredPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: draw } = await supabase
    .from("draws")
    .select(PUBLIC_DRAW_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<PublicDraw>();

  if (!draw) notFound();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
        <div className="rounded-lg border border-border bg-surface p-8 text-center shadow-sm">
          <MedicineWheel className="mx-auto h-16 w-16" />
          <h1 className="mt-6 text-3xl font-bold text-success">
            You&apos;re in!
          </h1>
          <p className="mt-3 text-muted">
            Your entry for <span className="font-semibold">{draw.title}</span>{" "}
            has been recorded. If you win, you&apos;ll be contacted at the
            email you provided.
          </p>
          <p className="mt-6 text-sm text-muted">
            Good luck — you can close this page now.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
