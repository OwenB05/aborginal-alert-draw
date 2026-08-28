import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { heading, link, metaText } from "@/lib/ui";
import { ScanSheetForm } from "./scan-form";

export const dynamic = "force-dynamic";

export default async function ScanSheetPage({
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
    <div className="mx-auto mt-6 max-w-4xl">
      <Link href={`/admin/draws/${draw.id}`} className={`text-sm ${link}`}>
        ← Back to draw
      </Link>

      <h1 className={`mt-3 text-2xl ${heading}`}>Scan a paper sheet</h1>
      <p className={`mt-1 max-w-2xl text-sm ${metaText}`}>
        Photograph a signed sign-up sheet or a stack of sign-up cards for{" "}
        <span className="font-semibold">{draw.title}</span> and the AI will read
        the rows for you. It is a first draft, not the final word —{" "}
        <span className="font-semibold">
          check every row before adding it
        </span>
        , especially the email addresses. Anything the AI was unsure of is
        highlighted for you.
      </p>

      {draw.status !== "open" ? (
        <p className="mt-6 rounded-lg border border-missing/40 bg-missing-bg px-3 py-2 text-sm font-semibold text-missing">
          This draw is closed, so entries can&apos;t be added. Reopen it from
          the draw page, add the sheet, then close it again.
        </p>
      ) : (
        <ScanSheetForm drawId={draw.id} />
      )}
    </div>
  );
}
