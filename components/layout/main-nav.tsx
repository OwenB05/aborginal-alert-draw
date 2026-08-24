"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Shared Aboriginal Alert nav treatment (see AAMODULEUIGUIDE), adapted for the
// Events module. Every item is a boxed pill: the border is always present but
// transparent when idle so hovering never shifts layout; the current page keeps
// a persistent box (aria-current). Groups are WAI disclosure buttons (kept here
// for when the bar outgrows ~7 items — the Events nav is small enough not to
// need one yet). Count badges use the red accent (chrome only, never status).

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
  match?: (pathname: string) => boolean;
};

export const navItemBase =
  "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";
export const navItemIdle =
  "border-transparent text-maroon-100 hover:border-white/25 hover:bg-maroon-600 hover:text-white";
export const navItemActive = "border-white/25 bg-maroon-800/60 text-white";
/** Idle pill for utility controls (theme toggle, sign out) that aren't links. */
export const navPill = `${navItemBase} ${navItemIdle}`;

function defaultMatch(href: string) {
  return (pathname: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
}

export function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = (item.match ?? defaultMatch(item.href))(pathname);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`${navItemBase} ${active ? navItemActive : navItemIdle}`}
    >
      {item.label}
      <Badge n={item.badge} />
    </Link>
  );
}

export function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const childActive = items.some((i) => (i.match ?? defaultMatch(i.href))(pathname));

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

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${navItemBase} ${childActive || open ? navItemActive : navItemIdle}`}
      >
        {label}
        <svg
          viewBox="0 0 12 12"
          aria-hidden="true"
          fill="currentColor"
          className={`h-3 w-3 opacity-80 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.1 4.3 6 8.2l3.9-3.9H2.1Z" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-44 rounded-lg border border-stone-200 bg-white py-1 text-left shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {items.map((i) => {
            const active = (i.match ?? defaultMatch(i.href))(pathname);
            return (
              <Link
                key={i.href}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-maroon-50 text-maroon-800 dark:bg-stone-800 dark:text-maroon-200"
                    : "text-stone-700 hover:bg-maroon-50 hover:text-maroon-800 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-maroon-200"
                }`}
              >
                {i.label}
                <Badge n={i.badge} />
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** The organizer portal's main nav. "Draws" covers the dashboard and every
 * draw detail/print page; "Invitations" is its own surface. */
export function AdminNav() {
  return (
    <>
      <NavLink
        item={{
          href: "/admin",
          label: "Draws",
          match: (p) => p === "/admin" || p.startsWith("/admin/draws"),
        }}
      />
      <NavLink item={{ href: "/admin/circle", label: "Circle" }} />
      <NavLink item={{ href: "/admin/invite", label: "Invitations" }} />
    </>
  );
}
