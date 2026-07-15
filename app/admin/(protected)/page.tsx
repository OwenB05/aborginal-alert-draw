import Link from "next/link";
import { CreateDrawForm } from "@/components/admin/create-draw-form";
import { createClient } from "@/lib/supabase/server";
import type { Draw } from "@/lib/types";

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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-2xl font-bold">Your draws</h1>
        {!draws?.length ? (
          <p className="mt-4 rounded-lg border border-dashed border-border bg-surface p-8 text-center text-muted">
            No draws yet — create your first one to get a QR code you can
            print and post at your event.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {draws.map((draw) => (
              <li key={draw.id}>
                <Link
                  href={`/admin/draws/${draw.id}`}
                  className="block rounded-lg border border-border bg-surface p-4 shadow-sm transition hover:border-primary"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{draw.title}</h2>
                      {draw.prize && (
                        <p className="mt-0.5 text-sm text-muted">
                          Prize: {draw.prize}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-sm">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          draw.status === "open"
                            ? "bg-success/15 text-success"
                            : "bg-border text-muted"
                        }`}
                      >
                        {draw.status === "open" ? "Open" : "Closed"}
                      </span>
                      <p className="mt-1 text-muted">
                        {draw.entries?.[0]?.count ?? 0}{" "}
                        {(draw.entries?.[0]?.count ?? 0) === 1
                          ? "entry"
                          : "entries"}
                      </p>
                      {draw.winner_entry_id && (
                        <p className="text-xs font-medium text-accent">
                          Winner drawn
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside>
        <CreateDrawForm />
      </aside>
    </div>
  );
}
