import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatherGlyph } from "@/components/layout/wordmark";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { link } from "@/lib/ui";
import { PrintButton } from "../print/print-button";

export const dynamic = "force-dynamic";

// Paper sign-up sheet for events without cell service. Bonnie prints a few
// copies, entrants fill in a row and sign by hand (the signed sheet IS the
// consent record), and an organizer transcribes rows later at
// /admin/draws/[id]/paper. Landscape so the email column has real room.
const ROWS = 12;

export default async function SignUpSheetPage({
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

  const th =
    "border border-stone-400 px-2 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide text-stone-700";
  const td = "border border-stone-400 px-2";

  return (
    <div className="mx-auto mt-6 max-w-5xl">
      <style>{`@media print { @page { size: letter landscape; margin: 0.5in; } }`}</style>

      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/admin/draws/${draw.id}`} className={`text-sm ${link}`}>
          ← Back to draw
        </Link>
        <PrintButton />
      </div>

      <p className="no-print mb-4 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300">
        Print one or more copies for events without cell service (prints in
        landscape). Afterwards, type the rows in under{" "}
        <span className="font-semibold">Enter paper sheet</span> on the draw
        page, and keep the signed sheets on file — they are the consent record.
      </p>

      {/* The sheet is always light — it prints white even in dark mode. */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 text-stone-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <FeatherGlyph className="h-8 w-8 text-accent" />
            <div className="leading-tight">
              <p className="text-lg font-bold uppercase tracking-wide text-maroon-900">
                Aboriginal Alert
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-maroon-600">
                Community Draw — Sign-up Sheet
              </p>
            </div>
          </div>
          <div className="text-right text-sm leading-snug">
            <p className="font-bold">{draw.title}</p>
            {draw.prize && <p>Prize: {draw.prize}</p>}
            <p className="mt-1 text-xs text-stone-500">
              Date: ____________ &nbsp; Location: ____________
            </p>
          </div>
        </div>

        <p className="mt-4 border-y border-stone-300 py-2 text-[11px] leading-snug text-stone-700">
          <span className="font-bold">By signing below</span> I give Aboriginal
          Alert permission to add me to the Compassionate Circle using the
          name, email, and location I have provided, and I consent to my name
          being announced if I win. One entry per person.{" "}
          <span className="font-bold">Mail list</span> is optional — check it to
          also receive Aboriginal Alert news and updates by email (you can
          unsubscribe at any time).
        </p>

        <table className="mt-3 w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-7`}>#</th>
              <th className={`${th} w-[19%]`}>Full name</th>
              <th className={`${th} w-[26%]`}>Email (required)</th>
              <th className={`${th} w-[14%]`}>City / Town</th>
              <th className={`${th} w-[11%]`}>Province</th>
              <th className={`${th} w-14 text-center`}>Mail list</th>
              <th className={th}>Signature</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, i) => (
              <tr key={i} className="h-10">
                <td
                  className={`${td} text-center text-[11px] text-stone-400`}
                >
                  {i + 1}
                </td>
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={td} />
                <td className={`${td} text-center align-middle`}>
                  <span className="inline-block h-4 w-4 border border-stone-500 align-middle" />
                </td>
                <td className={td} />
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-2 text-[10px] text-stone-400">
          Organizer use: transcribe at the draw portal → this draw → Enter
          paper sheet. Sheet ___ of ___
        </p>
      </div>
    </div>
  );
}
