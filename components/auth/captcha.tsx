"use client";

import { captchaConfig } from "@/lib/captcha";
import { Turnstile } from "./turnstile";
import { HCaptcha } from "./hcaptcha";

/** Renders whichever provider is configured, or nothing at all when neither
 * site key is set (the default, and the safe state). */
export function Captcha({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  resetKey?: unknown;
}) {
  const config = captchaConfig();
  if (!config) return null;
  return (
    <div className="pt-1">
      {config.provider === "hcaptcha" ? (
        <HCaptcha
          siteKey={config.siteKey}
          onToken={onToken}
          resetKey={resetKey}
        />
      ) : (
        <Turnstile
          siteKey={config.siteKey}
          onToken={onToken}
          resetKey={resetKey}
        />
      )}
    </div>
  );
}
