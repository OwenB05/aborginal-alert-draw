// Aboriginal Alert's real logo lockup (leaf-and-feather mark + ABORIGINAL
// ALERT wordmark), recolored WHITE for the maroon header. The assets
// (public/aa-leaf-white.png, public/aa-wordmark-white.png) come from the
// official full-resolution logo with every pixel's RGB set to white while the
// alpha channel is preserved exactly, so the SHAPE is untouched — the feather
// is a transparent cutout and the header maroon shows through it. The subtitle
// slot carries this module's name (EVENTS) as real text, never baked into a
// bitmap. Shared AA module treatment; see AAMODULEUIGUIDE.
export function Wordmark({ subtitle = "Events" }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/aa-leaf-white.png"
        alt=""
        width={39}
        height={40}
        className="h-10 w-auto"
      />
      <span className="flex flex-col gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/aa-wordmark-white.png"
          alt="Aboriginal Alert"
          width={194}
          height={16}
          className="h-4 w-auto"
        />
        <span className="text-[10px] font-semibold uppercase leading-none tracking-[0.5em] text-maroon-100">
          {subtitle}
        </span>
      </span>
    </span>
  );
}

// Lightweight decorative feather glyph (not the official logo) — used on the
// landing hero and confirmation screens as an accent, never as the wordmark.
export function FeatherGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
      <path d="M16 8 2 22" />
      <path d="M17.5 15H9" />
    </svg>
  );
}
