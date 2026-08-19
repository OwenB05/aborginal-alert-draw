import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { heading, link, metaText } from "@/lib/ui";
import { PaperEntryForm } from "./paper-entry-form";

export const dynamic = "force-dynamic";

export default async function PaperEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: draw } = await supabase
    .from("draws")
    .select("*")
    .eq("id", id)
    .maybeSingle<Draw>();

  if (!draw) notFound();

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <Link href={`/admin/draws/${draw.id}`} className={`text-sm ${link}`}>
        ← Back to draw
      </Link>

      <h1 className={`mt-3 text-2xl ${heading}`}>Enter paper sheet</h1>
      <p className={`mt-1 text-sm ${metaText}`}>
        Type in each row from the signed sign-up sheet for{" "}
        <span className="font-semibold">{draw.title}</span>. City and province
        stay filled between rows, and Enter adds the row — so you can work
        straight down the page. Keep the paper sheets on file: the signature on
        paper is the consent record.
      </p>

      {draw.status !== "open" ? (
        <p className="mt-6 rounded-lg border border-missing/40 bg-missing-bg px-3 py-2 text-sm font-semibold text-missing">
          This draw is closed, so entries can&apos;t be added. Reopen it from
          the draw page, transcribe the sheet, then close it again.
        </p>
      ) : (
        <PaperEntryForm drawId={draw.id} />
      )}
    </div>
  );
}
