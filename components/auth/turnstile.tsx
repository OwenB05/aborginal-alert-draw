"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, explicit render. One contract shared with the
// hCaptcha widget: onToken(token|null) plus a resetKey. Tokens are
// single-use, so callers bump resetKey after every submit attempt and the
// widget issues a fresh one. Vendor error codes are surfaced verbatim so a
// misconfiguration is self-diagnosing (e.g. 400020 = wrong site key,
// 110200 = hostname not on the widget's list, 600010 = automated browser).

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
type TurnstileWindow = Window & { turnstile?: TurnstileApi };

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function whenReady(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const api = (window as TurnstileWindow).turnstile;
      if (api) return resolve(api);
      if (Date.now() - started > 15000)
        return reject(new Error("timeout"));
      setTimeout(poll, 50);
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onerror = () => reject(new Error("script"));
      document.head.appendChild(s);
    }
    poll();
  });
}

export function Turnstile({
  siteKey,
  onToken,
  resetKey,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  resetKey?: unknown;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest callback without re-rendering the widget.
  const tokenCb = useRef(onToken);
  tokenCb.current = onToken;

  useEffect(() => {
    let cancelled = false;
    whenReady()
      .then((api) => {
        if (cancelled || !boxRef.current || widgetId.current) return;
        widgetId.current = api.render(boxRef.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            setError(null);
            tokenCb.current(token);
          },
          "expired-callback": () => tokenCb.current(null),
          "timeout-callback": () => tokenCb.current(null),
          "error-callback": (code?: string) => {
            setError(code ? String(code) : "unknown");
            tokenCb.current(null);
            return true;
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError("could not load");
      });
    return () => {
      cancelled = true;
      const api = (window as TurnstileWindow).turnstile;
      if (api && widgetId.current) {
        try {
          api.remove(widgetId.current);
        } catch {
          // widget already gone
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    const api = (window as TurnstileWindow).turnstile;
    if (api && widgetId.current) {
      try {
        api.reset(widgetId.current);
      } catch {
        // not yet rendered
      }
    }
    tokenCb.current(null);
  }, []);

  // Fresh token per attempt.
  useEffect(() => {
    if (resetKey === undefined) return;
    reset();
  }, [resetKey, reset]);

  return (
    <div>
      <div ref={boxRef} />
      {error && (
        <p className="mt-1 text-xs text-accent-text dark:text-red-400">
          The human check couldn&apos;t load (error {error}).
        </p>
      )}
    </div>
  );
}
