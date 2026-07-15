/** Design-system class recipes (see DESIGN.md). Buttons are rounded-lg,
 * cards rounded-xl; neutrals are stone; every colored utility ships a
 * dark: variant. */

export const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:focus-visible:ring-maroon-400";

export const btnPrimary = `rounded-lg bg-maroon-700 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-600 disabled:opacity-60 ${ring} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-900`;

export const btnSecondary = `rounded-lg border border-maroon-700 px-4 py-2 text-sm font-semibold text-maroon-700 hover:bg-maroon-50 dark:border-maroon-400 dark:text-maroon-300 dark:hover:bg-maroon-950 ${ring}`;

export const card =
  "rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900";

export const input = `w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 ${ring}`;

export const label =
  "mb-1 block text-sm font-semibold text-stone-800 dark:text-stone-200";

export const errorText = "text-sm text-accent-text dark:text-red-400";

export const heading = "font-bold text-maroon-900 dark:text-maroon-100";

export const bodyText = "text-stone-700 dark:text-stone-300";

export const metaText = "text-stone-500 dark:text-stone-400";

export const link = `rounded font-semibold text-maroon-700 hover:text-maroon-600 dark:text-maroon-300 dark:hover:text-maroon-200 ${ring}`;
