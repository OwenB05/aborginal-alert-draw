import { heading, metaText } from "@/lib/ui";
import { CircleComparison } from "./circle-comparison";

// Compassion Circle Comparison: event entrants vs the Airtable sign-up list
// ("Individuals - Compassion Circle"). The comparison runs in the
// circle-compare Edge Function (organizer-only; Airtable token stays in
// Vault) and is fetched live on load / refresh.
export const dynamic = "force-dynamic";

export default function CirclePage() {
  return (
    <div className="mt-6">
      <h1 className={`text-2xl ${heading}`}>Compassion Circle Comparison</h1>
      <p className={`mt-1 max-w-2xl text-sm ${metaText}`}>
        Everyone who enters a draw consents to joining the Compassionate
        Circle. This compares event entrants against the sign-ups recorded in
        Airtable (matched by email) — so you can see who still needs to be
        added, and grab their details to sign them up.
      </p>
      <CircleComparison />
    </div>
  );
}
