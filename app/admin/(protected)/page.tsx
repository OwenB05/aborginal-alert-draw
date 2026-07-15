import Link from "next/link";
import { CreateDrawForm } from "@/components/admin/create-draw-form";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";
import { card, heading, metaText, ring } from "@/lib/ui";

export const dynamic = "force-dynamic";

type DrawWithCount = Draw & { entries: { count: number }[] };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: draws } = await supabase
    .from("draws")
    .select("*, entries(count)")
    .order("created_at", { ascending: false })
    .returns<DrawWithCount[]>();

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      {/* On phones the create form comes first — it's the most common
          action when setting up at an event. */}
      <aside className="order-first lg:order-last">
        <CreateDrawForm />
      </aside>
      <section>
        <h1 className={`text-2xl ${heading}`}>Your draws</h1>
        {!draws?.length ? (
          <p className="mt-4 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500 dark:border-stone-600 dark:text-stone-400">
            No draws yet — create your first one to get a QR code you can
            print and post at your event.
          </p>
        ) : (
          <ul className="mt-4 list-none space-y-4">
            {draws.map((draw) => {
              const count = draw.entries?.[0]?.count ?? 0;
              return (
                <li key={draw.id}>
                  <Link
                    href={`/admin/draws/${draw.id}`}
                    className={`block ${card} p-4 transition hover:border-maroon-400 dark:hover:border-maroon-400 ${ring}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className={`truncate text-lg ${heading}`}>
                          {draw.title}
                        </h2>
                        {draw.prize && (
                          <p className={`mt-0.5 truncate text-sm ${metaText}`}>
                            Prize: {draw.prize}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <StatusBadge status={draw.status} />
                        <p className={`text-sm ${metaText}`}>
                          {count} {count === 1 ? "entry" : "entries"}
                        </p>
                        {draw.winner_entry_id && (
                          <span className="rounded bg-maroon-700 px-2 py-0.5 text-xs font-semibold text-white">
                            Winner drawn
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
