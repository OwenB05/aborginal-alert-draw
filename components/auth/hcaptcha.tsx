"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// hCaptcha, explicit render. Same contract as the Turnstile widget:
// onToken(token|null) + resetKey.
//
// Two hCaptcha specifics worth knowing:
//  - The API must be rendered from inside the script's `onload` callback.
//    The <script> load event fires before window.hcaptcha is usable, so a
//    naive onload render logs a warning and never reaches hCaptcha.
//  - hCaptcha refuses the hostnames localhost / 127.0.0.1. To test locally,
//    use http://<anything>.localhost:<port> (Chrome resolves *.localhost to
//    loopback and Next dev accepts it).
//
// The widget is a fixed 303x78 box, so it is centred rather than stretched.

type HCaptchaApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
};
type HCaptchaWindow = Window & {
  hcaptcha?: HCaptchaApi;
  __aaHcaptchaOnload?: () => void;
};

const SCRIPT_ID = "hcaptcha-script";
const ONLOAD_FN = "__aaHcaptchaOnload";

function whenReady(): Promise<HCaptchaApi> {
  return new Promise((resolve, reject) => {
    const w = window as HCaptchaWindow;
    if (w.hcaptcha) return resolve(w.hcaptcha);

    const started = Date.now();
    const poll = () => {
      if (w.hcaptcha) return resolve(w.hcaptcha);
      if (Date.now() - started > 15000) return reject(new Error("timeout"));
      setTimeout(poll, 50);
    };

    if (!document.getElementById(SCRIPT_ID)) {
      // Render only once this fires — see note above.
      w.__aaHcaptchaOnload = () => {
        if (w.hcaptcha) resolve(w.hcaptcha);
      };
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = `https://js.hcaptcha.com/1/api.js?render=explicit&onload=${ONLOAD_FN}`;
      s.async = true;
      s.defer = true;
      s.onerror = () => reject(new Error("script"));
      document.head.appendChild(s);
    }
    poll();
  });
}

export function HCaptcha({
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
          "chalexpired-callback": () => tokenCb.current(null),
          "error-callback": (code?: string) => {
            setError(code ? String(code) : "unknown");
            tokenCb.current(null);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError("could not load");
      });
    return () => {
      cancelled = true;
      const api = (window as HCaptchaWindow).hcaptcha;
      if (api && widgetId.current) {
        try {
          api.remove(widgetId.current);
        } catch {
          // already gone
        }
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    const api = (window as HCaptchaWindow).hcaptcha;
    if (api && widgetId.current) {
      try {
        api.reset(widgetId.current);
      } catch {
        // not yet rendered
      }
    }
    tokenCb.current(null);
  }, []);

  useEffect(() => {
    if (resetKey === undefined) return;
    reset();
  }, [resetKey, reset]);

  return (
    <div>
      <div ref={boxRef} className="flex justify-center" />
      {error && (
        <p className="mt-1 text-xs text-accent-text dark:text-red-400">
          The human check couldn&apos;t load (error {error}).
        </p>
      )}
    </div>
  );
}
