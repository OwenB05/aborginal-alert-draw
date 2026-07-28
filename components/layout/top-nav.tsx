import Link from "next/link";
import { Wordmark } from "./wordmark";

// Header shell (see AAMODULEUIGUIDE): one maroon-700 bar with the real logo
// lockup on the left (links to the module home) and a nav cluster on the right.
// Callers compose the right side (main nav + theme toggle + account) so each
// context — public vs organizer portal — can differ.
export function TopNav({
  subtitle = "Events",
  homeHref = "/",
  children,
}: {
  subtitle?: string;
  homeHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="no-print bg-maroon-700 text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
        <Link
          href={homeHref}
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-maroon-700"
        >
          <Wordmark subtitle={subtitle} />
        </Link>
        <nav
          aria-label="Main"
          className="flex flex-wrap items-center gap-1 text-sm font-semibold"
        >
          {children}
        </nav>
      </div>
    </header>
  );
}
