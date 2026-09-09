// Sign-in CAPTCHA configuration.
//
// The login endpoint belongs to Supabase, not to us, so a puzzle drawn in
// our own page would protect nothing — a bot can post straight to
// /auth/v1/token. Supabase's Attack Protection verifies the token
// server-side on signInWithPassword, so the check cannot be skipped. Our
// job is only to render a widget and pass the token along.
//
// Exactly one provider is active: hCaptcha wins if both keys are set.
// Neither key set => no widget, plain sign-in (this is the default, and the
// rollback: unset the key, or turn the toggle off in Supabase).

export type CaptchaProvider = "turnstile" | "hcaptcha";
export type CaptchaConfig = { provider: CaptchaProvider; siteKey: string };

/** NEXT_PUBLIC_* are inlined at build time, so this works in the browser. */
export function captchaConfig(): CaptchaConfig | null {
  const hcaptcha = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY?.trim();
  if (hcaptcha) return { provider: "hcaptcha", siteKey: hcaptcha };
  const turnstile = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (turnstile) return { provider: "turnstile", siteKey: turnstile };
  return null;
}

export function captchaEnabled(): boolean {
  return captchaConfig() !== null;
}

/** Supabase reports a failed check as "captcha verification process failed". */
export function isCaptchaError(message?: string | null): boolean {
  return typeof message === "string" && /captcha/i.test(message);
}

export const CAPTCHA_FAILED_MESSAGE =
  "The “I’m human” check didn’t pass. Please try it again.";
