import Link from "next/link";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";

const navLinkClass =
  "rounded px-2 py-1 text-sm font-semibold hover:bg-maroon-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

/** Full-bleed maroon header bar. `children` renders on the right, before
 * the theme toggle (nav links, identity, sign-out, …). */
export function TopNav({
  subtitle,
  homeHref = "/",
  children,
}: {
  subtitle: string;
  homeHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="no-print bg-maroon-700 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href={homeHref}
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Wordmark subtitle={subtitle} />
        </Link>
        <nav className="flex flex-wrap items-center gap-3">
          {children}
          <span className="mx-2 h-5 w-px bg-white/30" aria-hidden="true" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={navLinkClass}>
      {children}
    </Link>
  );
}
