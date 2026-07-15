"use client";

import { btnPrimary } from "@/lib/ui";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className={btnPrimary}>
      Print
    </button>
  );
}
