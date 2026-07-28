import { notFound } from "next/navigation";
import { TopNav } from "@/components/layout/top-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Footer } from "@/components/layout/footer";
import { FeatherGlyph } from "@/components/layout/wordmark";
import { createClient } from "@/lib/supabase/server";
import { PUBLIC_DRAW_COLUMNS, type PublicDraw } from "@/lib/types";
import { card, heading, bodyText } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function EnteredPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: draw } = await supabase
    .from("draws")
    .select(PUBLIC_DRAW_COLUMNS)
    .eq("slug", slug)
    .maybeSingle<PublicDraw>();

  if (!draw) notFound();

  return (
    <>
      <TopNav>
        <ThemeToggle />
      </TopNav>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-10 sm:px-6">
        <div className={`mx-auto mt-16 max-w-xl ${card} p-8 text-center`}>
          <FeatherGlyph className="mx-auto h-14 w-14 text-accent" />
          <h1 className={`mt-6 text-2xl ${heading}`}>You&apos;re in!</h1>
          <p className={`mt-3 ${bodyText}`}>
            Your entry for <span className="font-semibold">{draw.title}</span>{" "}
            has been recorded. If you win, you&apos;ll be contacted at the
            email you provided.
          </p>
          <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
            Good luck — you can close this page now.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
