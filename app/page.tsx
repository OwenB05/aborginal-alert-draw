import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { MedicineWheel } from "@/components/medicine-wheel";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <MedicineWheel className="h-20 w-20" />
          <h1 className="mt-6 text-4xl font-bold tracking-tight">
            Community Draws
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Paperless draws for in-person community events. Scan the QR code
            posted at the event to enter — no app needed, just your name and
            email.
          </p>
          <div className="mt-10 grid w-full gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface p-6 text-left">
              <h2 className="font-semibold text-primary">Entering a draw?</h2>
              <p className="mt-2 text-sm text-muted">
                Scan the QR code at the event with your phone camera. It opens
                the entry page for that draw — sign, submit, done.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-6 text-left">
              <h2 className="font-semibold text-primary">Running a draw?</h2>
              <p className="mt-2 text-sm text-muted">
                Organizers can create draws, print QR posters, watch entries
                come in, and pick a random winner.
              </p>
              <Link
                href="/admin"
                className="mt-3 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark"
              >
                Organizer sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
