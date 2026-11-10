// RETIRED. AI sheet scanning now runs in the Next.js app at /api/scan-sheet,
// which calls Vercel AI Gateway with the deployment's OIDC token — so no AI
// provider key is stored anywhere. This stub stays deployed only so an old
// browser tab gets a clear answer instead of a missing-function error; it
// never sends anything anywhere.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  return new Response(
    JSON.stringify({
      error:
        "The scanner has moved. Reload the page and try the scan again.",
    }),
    { status: 410, headers: { ...cors, "Content-Type": "application/json" } },
  );
});
