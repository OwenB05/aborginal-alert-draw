"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  applyPrefs,
  readPrefs,
  CURATED_FONTS,
  DEFAULT_PREFS,
  type A11yPrefs,
} from "@/lib/a11y-prefs";

// The header settings gear (see AAMODULESETTINGSGUIDE) — replaces the old
// light/dark toggle with a popover of site-wide accessibility preferences
// (theme, text size, font, motion, contrast, link underlines), all
// device-local via lib/a11y-prefs.ts and applied instantly (no save button).
// Disclosure pattern: aria-expanded trigger, outside-click/Escape close, but
// right-aligned and it stays open on interaction (it holds form controls).
// `showAccount` gates the Account-settings link (hidden on public pages where
// the visitor isn't signed in).

type FontData = { family: string };
type LocalFontWindow = Window & { queryLocalFonts?: () => Promise<FontData[]> };

const groupLabel =
  "block text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400";

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={groupLabel}>{label}</legend>
      <div
        role="group"
        className="mt-1.5 flex overflow-hidden rounded-lg border border-stone-300 dark:border-stone-600"
      >
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={`flex-1 px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-maroon-700 ${
                active
                  ? "bg-maroon-700 font-semibold text-white"
                  : "bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-300 accent-maroon-700"
      />
      {label}
    </label>
  );
}

export function SettingsMenu({ showAccount = false }: { showAccount?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();

  // null until mounted — prefs live in localStorage, unknown during SSR.
  const [prefs, setPrefs] = useState<A11yPrefs | null>(null);
  useEffect(() => setPrefs(readPrefs()), []);

  const [installedFonts, setInstalledFonts] = useState<string[] | null>(null);
  const [canQueryFonts, setCanQueryFonts] = useState(false);
  useEffect(() => {
    setCanQueryFonts(
      typeof (window as LocalFontWindow).queryLocalFonts === "function"
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close when a navigation happens (the Account link).
  useEffect(() => setOpen(false), [pathname]);

  const update = (patch: Partial<A11yPrefs>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    applyPrefs(next);
  };

  const loadInstalledFonts = async () => {
    try {
      const list = await (window as LocalFontWindow).queryLocalFonts?.();
      if (!list) return;
      const families = [...new Set(list.map((f) => f.family))].sort((a, b) =>
        a.localeCompare(b)
      );
      if (families.length > 0) setInstalledFonts(families);
    } catch {
      // Permission denied or API failure — the curated list stays.
    }
  };

  const fontOptions =
    installedFonts ??
    (prefs?.font &&
    !CURATED_FONTS.includes(prefs.font as (typeof CURATED_FONTS)[number])
      ? [prefs.font, ...CURATED_FONTS]
      : [...CURATED_FONTS]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center rounded-md border px-2.5 py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
          open
            ? "border-white/25 bg-maroon-800/60 text-white"
            : "border-transparent text-maroon-100 hover:border-white/25 hover:bg-maroon-600 hover:text-white"
        }`}
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          fill="currentColor"
          className="h-4 w-4"
        >
          <path
            fillRule="evenodd"
            d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.99 6.99 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.05 7.05 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.99 6.99 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.99 6.99 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="region"
          aria-labelledby={headingId}
          className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-lg border border-stone-200 bg-white p-4 text-left shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <h2
            id={headingId}
            className="text-sm font-bold text-maroon-900 dark:text-maroon-100"
          >
            Display &amp; accessibility
          </h2>

          {prefs ? (
            <div className="mt-3 space-y-4">
              <Segmented
                label="Theme"
                value={prefs.theme}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  {
                    value: "system",
                    label: "System",
                    title: "Follow your device setting",
                  },
                ]}
                onChange={(theme) => update({ theme })}
              />

              <Segmented
                label="Text size"
                value={prefs.textSize}
                options={[
                  { value: 0, label: "A", title: "Normal" },
                  { value: 1, label: "A+", title: "Larger" },
                  { value: 2, label: "A++", title: "Largest" },
                ]}
                onChange={(textSize) => update({ textSize })}
              />

              <div>
                <label htmlFor={`${headingId}-font`} className={groupLabel}>
                  Font
                </label>
                <select
                  id={`${headingId}-font`}
                  value={prefs.font ?? ""}
                  onChange={(e) => update({ font: e.target.value || null })}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                >
                  <option value="">Default (Open Sans)</option>
                  {fontOptions.map((f) => (
                    <option key={f} value={f} style={{ fontFamily: f }}>
                      {f}
                    </option>
                  ))}
                </select>
                {canQueryFonts && !installedFonts ? (
                  <button
                    type="button"
                    onClick={loadInstalledFonts}
                    className="mt-1.5 text-xs text-maroon-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:text-maroon-300"
                  >
                    Choose from fonts installed on this computer…
                  </button>
                ) : null}
              </div>

              <div className="space-y-2">
                <Toggle
                  label="Reduce motion"
                  checked={prefs.reduceMotion}
                  onChange={(reduceMotion) => update({ reduceMotion })}
                />
                <Toggle
                  label="High contrast"
                  checked={prefs.highContrast}
                  onChange={(highContrast) => update({ highContrast })}
                />
                <Toggle
                  label="Underline links"
                  checked={prefs.underlineLinks}
                  onChange={(underlineLinks) => update({ underlineLinks })}
                />
              </div>

              <div className="flex items-center justify-between border-t border-stone-200 pt-3 dark:border-stone-700">
                {showAccount ? (
                  <Link
                    href="/account"
                    className="text-sm font-semibold text-maroon-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:text-maroon-300"
                  >
                    Account settings
                  </Link>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPrefs({ ...DEFAULT_PREFS });
                    applyPrefs(DEFAULT_PREFS);
                  }}
                  className="rounded px-1 text-xs text-stone-500 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 dark:text-stone-400"
                >
                  Reset all
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
