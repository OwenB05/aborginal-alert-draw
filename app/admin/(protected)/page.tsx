import Link from "next/link";
import { CreateDrawForm } from "@/components/admin/create-draw-form";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { card, heading, metaText, ring } from "@/lib/ui";

export const dynamic = "force-dynamic";

type DrawWithMeta = Draw & {
  entries: { count: number }[];
  winner: { full_name: string } | null;
};

function DrawCard({ draw }: { draw: DrawWithMeta }) {
  const count = draw.entries?.[0]?.count ?? 0;
  return (
    <Link
      href={`/admin/draws/${draw.id}`}
      className={`block ${card} p-4 transition hover:border-maroon-400 dark:hover:border-maroon-400 ${ring}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`truncate text-lg ${heading}`}>{draw.title}</h3>
          {draw.prize && (
            <p className={`mt-0.5 truncate text-sm ${metaText}`}>
              Prize: {draw.prize}
            </p>
          )}
          {draw.winner && (
            <p className="mt-1 truncate text-sm font-semibold text-maroon-700 dark:text-maroon-300">
              🏆 Winner: {draw.winner.full_name}
              {draw.drawn_at
                ? ` · ${new Date(draw.drawn_at).toLocaleDateString()}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <StatusBadge status={draw.status} />
          <p className={`text-sm ${metaText}`}>
            {count} {count === 1 ? "entry" : "entries"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  // Disambiguate the two draws↔entries relationships explicitly, and embed
  // the winner's name for the history/archive listing.
  const { data: draws } = await supabase
    .from("draws")
    .select(
      "*, entries!entries_draw_id_fkey(count), winner:entries!draws_winner_entry_id_fkey(full_name)"
    )
    .order("created_at", { ascending: false })
    .returns<DrawWithMeta[]>();

  const active = draws?.filter((d) => d.status === "open") ?? [];
  const past = draws?.filter((d) => d.status === "closed") ?? [];

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* On phones the create form comes first — it's the most common
          action when setting up at an event. */}
      <aside className="order-first lg:order-last">
        <CreateDrawForm />
      </aside>

      <div className="space-y-8">
        <section>
          <h1 className={`text-2xl ${heading}`}>Active draws</h1>
          {!active.length ? (
            <p className="mt-4 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
              No open draws right now — create one to get a QR code you can
              print and post at your event.
            </p>
          ) : (
            <ul className="mt-4 list-none space-y-4">
              {active.map((draw) => (
                <li key={draw.id}>
                  <DrawCard draw={draw} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className={`text-xl ${heading}`}>Past draws</h2>
          <p className={`mt-1 text-sm ${metaText}`}>
            Finalized draws are kept here as historical records — winners,
            entrants, and dates are preserved.
          </p>
          {!past.length ? (
            <p className="mt-4 rounded-xl border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
              No past draws yet. Once you close a draw or pick a winner, it
              moves here.
            </p>
          ) : (
            <ul className="mt-4 list-none space-y-4">
              {past.map((draw) => (
                <li key={draw.id}>
                  <DrawCard draw={draw} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
