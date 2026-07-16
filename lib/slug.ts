/** Build a URL slug from a draw title plus a short random suffix so links
 * are readable but not guessable from the title alone. */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  const random = new Uint32Array(6);
  crypto.getRandomValues(random);
  for (const n of random) suffix += alphabet[n % alphabet.length];

  return base ? `${base}-${suffix}` : suffix;
}

/** A long, URL-safe random token for invite links (~43 chars). */
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
