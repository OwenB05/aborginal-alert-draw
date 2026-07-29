// Site-wide accessibility preferences — the single owner of storage keys,
// class names, and the pre-paint init script, so the settings popover
// (components/layout/SettingsMenu.tsx), the FOUC script (app/layout.tsx), and
// the CSS blocks (app/globals.css) can never disagree.
//
// Prefs are DEVICE-LOCAL (localStorage, like the original theme toggle) — no
// DB column. Everything applies as classes on <html> (plus one inline CSS var
// for the font) so Tailwind's token variables restyle the whole app.
//
// No "use client" pragma: app/layout.tsx (server) imports A11Y_INIT_SCRIPT.
// The DOM/localStorage functions must only be CALLED client-side.

export type A11yPrefs = {
  theme: "light" | "dark" | "system";
  /** 0 = normal, 1 = larger (112.5%), 2 = largest (125%) */
  textSize: 0 | 1 | 2;
  reduceMotion: boolean;
  highContrast: boolean;
  underlineLinks: boolean;
  /** Font family name (curated or installed); null = site default (Open Sans). */
  font: string | null;
};

export const DEFAULT_PREFS: A11yPrefs = {
  theme: "system",
  textSize: 0,
  reduceMotion: false,
  highContrast: false,
  underlineLinks: false,
  font: null,
};

// aau-theme keeps its original semantics ("light"/"dark", absent = follow the
// OS) so values stored by the old ThemeToggle keep working unchanged.
export const PREF_KEYS = {
  theme: "aau-theme",
  text: "aau-text",
  motion: "aau-motion",
  contrast: "aau-contrast",
  links: "aau-links",
  font: "aau-font",
} as const;

// Every <html> class this module may add — cleared before re-applying.
export const A11Y_CLASSES = [
  "dark",
  "a11y-text-1",
  "a11y-text-2",
  "a11y-reduce-motion",
  "a11y-contrast",
  "a11y-underline-links",
] as const;

// Widely-installed families for the font picker — every OS ships most of
// these, so the dropdown works even in browsers that can't enumerate local
// fonts (only Chromium exposes queryLocalFonts). A name that isn't installed
// simply falls back to the default stack.
export const CURATED_FONTS = [
  "Arial",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Segoe UI",
  "Calibri",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Comic Sans MS",
] as const;

// Pure: the exact class list <html> should carry. `systemDark` is the current
// prefers-color-scheme value (only consulted when theme === "system").
export function prefClasses(prefs: A11yPrefs, systemDark: boolean): string[] {
  const classes: string[] = [];
  if (prefs.theme === "dark" || (prefs.theme === "system" && systemDark)) classes.push("dark");
  if (prefs.textSize === 1 || prefs.textSize === 2) classes.push(`a11y-text-${prefs.textSize}`);
  if (prefs.reduceMotion) classes.push("a11y-reduce-motion");
  if (prefs.highContrast) classes.push("a11y-contrast");
  if (prefs.underlineLinks) classes.push("a11y-underline-links");
  return classes;
}

// Pure: the --font-sans value for a chosen family. Quotes/backslashes are
// stripped rather than escaped — font family names never legitimately contain
// them, and stripping keeps the inline style un-injectable.
export function fontStack(name: string): string {
  return `"${name.replace(/["\\]/g, "")}", var(--font-fallback-sans)`;
}

export function readPrefs(): A11yPrefs {
  try {
    const s = window.localStorage;
    const theme = s.getItem(PREF_KEYS.theme);
    const text = s.getItem(PREF_KEYS.text);
    return {
      theme: theme === "dark" || theme === "light" ? theme : "system",
      textSize: text === "1" ? 1 : text === "2" ? 2 : 0,
      reduceMotion: s.getItem(PREF_KEYS.motion) === "reduce",
      highContrast: s.getItem(PREF_KEYS.contrast) === "more",
      underlineLinks: s.getItem(PREF_KEYS.links) === "underline",
      font: s.getItem(PREF_KEYS.font) || null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

// Apply to the live document AND persist. Default-valued prefs remove their
// key (so "system" theme really follows the OS on next load).
export function applyPrefs(prefs: A11yPrefs): void {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  root.classList.remove(...A11Y_CLASSES);
  root.classList.add(...prefClasses(prefs, systemDark));
  if (prefs.font) root.style.setProperty("--font-sans", fontStack(prefs.font));
  else root.style.removeProperty("--font-sans");

  try {
    const s = window.localStorage;
    const set = (key: string, value: string | null) =>
      value === null ? s.removeItem(key) : s.setItem(key, value);
    set(PREF_KEYS.theme, prefs.theme === "system" ? null : prefs.theme);
    set(PREF_KEYS.text, prefs.textSize === 0 ? null : String(prefs.textSize));
    set(PREF_KEYS.motion, prefs.reduceMotion ? "reduce" : null);
    set(PREF_KEYS.contrast, prefs.highContrast ? "more" : null);
    set(PREF_KEYS.links, prefs.underlineLinks ? "underline" : null);
    set(PREF_KEYS.font, prefs.font);
  } catch {
    // Storage unavailable (private mode) — prefs still apply for this page.
  }
}

// Pre-paint init script, inlined into <head> by app/layout.tsx so stored
// preferences apply before first paint (no flash). Hand-minified; it MUST
// mention every PREF_KEYS value and every A11Y_CLASSES name — a unit test
// (tests/a11y-prefs.test.ts) guards against drift with this module.
// JSON.stringify quotes the stored font name safely for the CSS var.
export const A11Y_INIT_SCRIPT = `try{var d=document.documentElement,s=localStorage,t=s.getItem("aau-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))d.classList.add("dark");var x=s.getItem("aau-text");if(x==="1")d.classList.add("a11y-text-1");if(x==="2")d.classList.add("a11y-text-2");if(s.getItem("aau-motion")==="reduce")d.classList.add("a11y-reduce-motion");if(s.getItem("aau-contrast")==="more")d.classList.add("a11y-contrast");if(s.getItem("aau-links")==="underline")d.classList.add("a11y-underline-links");var f=s.getItem("aau-font");if(f)d.style.setProperty("--font-sans",JSON.stringify(f)+", var(--font-fallback-sans)")}catch(e){}`;
