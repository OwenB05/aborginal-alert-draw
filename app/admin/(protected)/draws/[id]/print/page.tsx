import Link from "next/link";
import { notFound } from "next/navigation";
import { FeatherGlyph } from "@/components/layout/wordmark";
import { QrCode } from "@/components/admin/qr-code";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { link } from "@/lib/ui";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function PrintPosterPage({
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
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href={`/admin/draws/${draw.id}`} className={`text-sm ${link}`}>
          ← Back to draw
        </Link>
        <PrintButton />
      </div>

      {/* Poster is always light — it prints white even in dark mode. */}
      <div className="rounded-xl border border-stone-200 bg-white p-8 text-center text-stone-900 sm:p-10">
        <div className="flex items-center justify-center gap-3">
          <FeatherGlyph className="h-10 w-10 text-accent" />
          <div className="text-left leading-tight">
            <p className="text-xl font-bold uppercase tracking-wide text-maroon-900">
              Aboriginal Alert
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-maroon-600">
              Community Draw
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold text-maroon-900 sm:text-4xl">
          {draw.title}
        </h1>
        {draw.prize && (
          <p className="mt-3 text-xl">
            <span className="font-semibold">Prize:</span> {draw.prize}
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <QrCode path={`/draw/${draw.slug}`} size={320} />
        </div>

        <p className="mt-8 text-2xl font-bold text-maroon-700">
          Scan to enter the draw
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Point your phone camera at the code — no app needed. Enter your name
          and email, sign, and you&apos;re in.
        </p>
        {draw.description && (
          <p className="mt-6 whitespace-pre-wrap border-t border-stone-200 pt-4 text-xs text-stone-500">
            {draw.description}
          </p>
        )}
      </div>
    </div>
  );
}
