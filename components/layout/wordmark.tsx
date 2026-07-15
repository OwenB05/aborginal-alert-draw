/** Text wordmark with a feather glyph — deliberately NOT the real
 * Aboriginal Alert logo. The feather is the only accent-colored brand
 * element. */
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

export function Wordmark({ subtitle }: { subtitle: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <FeatherGlyph className="h-7 w-7 shrink-0 text-accent" />
      <span className="leading-tight">
        <span className="block text-base font-bold uppercase tracking-wide">
          Aboriginal Alert
        </span>
        <span className="block text-[10px] uppercase tracking-[0.2em] text-maroon-200">
          {subtitle}
        </span>
      </span>
    </span>
  );
}
