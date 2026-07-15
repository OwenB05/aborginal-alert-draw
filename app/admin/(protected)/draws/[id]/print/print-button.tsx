"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-dark"
    >
      Print
    </button>
  );
}
