import type { DrawStatus } from "@/lib/types";

/** Outlined pill + colored dot + text label — color is never the only
 * signal. Open uses the found-green pair, closed the neutral pair. */
export function StatusBadge({ status }: { status: DrawStatus }) {
  const open = status === "open";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        open
          ? "border-found/40 bg-found-bg text-found dark:border-green-400/40 dark:bg-green-400/20 dark:text-green-300"
          : "border-noupdate/40 bg-noupdate-bg text-noupdate dark:border-stone-500/40 dark:bg-stone-500/20 dark:text-stone-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          open ? "bg-found dark:bg-green-300" : "bg-noupdate dark:bg-stone-300"
        }`}
        aria-hidden="true"
      />
      {open ? "Open for entries" : "Closed"}
    </span>
  );
}
