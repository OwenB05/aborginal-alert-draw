"use client";

import { useEffect, useState } from "react";
import { navPill } from "./main-nav";

/** Class-based dark mode toggle; persists to localStorage ("aau-theme").
 * Styled as a header pill. Icon is ◐ until mounted (unknown during SSR),
 * then ☀/☾. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("aau-theme", next);
    } catch {
      // localStorage unavailable (private mode) — theme still toggles for
      // this page view.
    }
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={theme === "dark"}
      className={navPill}
    >
      {theme === null ? "◐" : theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
