import Link from "next/link";
import { TopNav } from "@/components/layout/top-nav";
import { NavLink } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Footer } from "@/components/layout/footer";
import { FeatherGlyph } from "@/components/layout/wordmark";
import { btnPrimary, card, heading, bodyText } from "@/lib/ui";

export default function Home() {
  return (
    <>
      <TopNav>
        <NavLink item={{ href: "/admin", label: "Organizer sign in" }} />
        <ThemeToggle />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center pt-16 text-center">
          <FeatherGlyph className="h-16 w-16 text-accent" />
          <h1 className={`mt-6 text-2xl sm:text-3xl ${heading}`}>
            Community Draws
          </h1>
          <p className={`mt-4 max-w-xl ${bodyText}`}>
            Paperless draws for in-person community events. Scan the QR code
            posted at the event to enter — no app needed, just your name and
            email.
          </p>
          <div className="mt-10 grid w-full grid-cols-1 gap-5 sm:grid-cols-2">
            <div className={`${card} p-5 text-left`}>
              <h2 className={`text-lg ${heading}`}>Entering a draw?</h2>
              <p className={`mt-2 text-sm ${bodyText}`}>
                Scan the QR code at the event with your phone camera. It opens
                the entry page for that draw — sign, submit, done.
              </p>
            </div>
            <div className={`${card} p-5 text-left`}>
              <h2 className={`text-lg ${heading}`}>Running a draw?</h2>
              <p className={`mt-2 text-sm ${bodyText}`}>
                Organizers can create draws, print QR posters, watch entries
                come in, and pick a random winner.
              </p>
              <Link href="/admin" className={`mt-4 inline-block ${btnPrimary}`}>
                Organizer sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
