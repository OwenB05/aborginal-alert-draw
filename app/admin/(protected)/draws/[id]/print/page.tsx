import Link from "next/link";
import { notFound } from "next/navigation";
import { MedicineWheel } from "@/components/medicine-wheel";
import { QrCode } from "@/components/admin/qr-code";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
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
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/admin/draws/${draw.id}`}
          className="text-sm text-muted hover:text-primary"
        >
          ← Back to draw
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-lg border border-border bg-white p-10 text-center text-[#221b16]">
        <div className="flex items-center justify-center gap-3">
          <MedicineWheel className="h-12 w-12" />
          <div className="text-left leading-tight">
            <p className="text-xl font-bold">Aboriginal Alert</p>
            <p className="text-xs uppercase tracking-widest text-[#b3282d]">
              Community Draw
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-4xl font-extrabold">{draw.title}</h1>
        {draw.prize && (
          <p className="mt-3 text-xl">
            <span className="font-semibold">Prize:</span> {draw.prize}
          </p>
        )}

        <div className="mt-8 flex justify-center">
          <QrCode path={`/draw/${draw.slug}`} size={320} />
        </div>

        <p className="mt-8 text-2xl font-bold text-[#b3282d]">
          Scan to enter the draw
        </p>
        <p className="mt-2 text-sm text-[#6b5f56]">
          Point your phone camera at the code — no app needed. Enter your name
          and email, sign, and you&apos;re in.
        </p>
        {draw.description && (
          <p className="mt-6 whitespace-pre-wrap border-t border-[#e5ddd3] pt-4 text-xs text-[#6b5f56]">
            {draw.description}
          </p>
        )}
      </div>
    </div>
  );
}
