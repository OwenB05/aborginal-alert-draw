import Link from "next/link";
import { MedicineWheel } from "./medicine-wheel";

export function SiteHeader() {
  return (
    <header className="no-print bg-header text-header-foreground">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <MedicineWheel className="h-9 w-9" />
          <span className="leading-tight">
            <span className="block text-lg font-bold tracking-wide">
              Aboriginal Alert
            </span>
            <span className="block text-xs uppercase tracking-widest text-accent">
              Community Draws
            </span>
          </span>
        </Link>
        <nav className="text-sm">
          <Link
            href="/admin"
            className="rounded border border-header-foreground/30 px-3 py-1.5 hover:bg-header-foreground/10"
          >
            Organizer sign in
          </Link>
        </nav>
      </div>
      <div className="h-1 w-full bg-primary" />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print mt-auto bg-header text-header-foreground/70">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center text-xs">
        <p>
          Community draw platform inspired by{" "}
          <a
            href="https://www.aboriginalalert.ca"
            className="underline hover:text-header-foreground"
          >
            Aboriginal Alert
          </a>{" "}
          — Canada&apos;s Indigenous Awareness Network.
        </p>
        <p className="mt-1">
          Entrant information is used only to run the draw it was submitted to.
        </p>
      </div>
    </footer>
  );
}
