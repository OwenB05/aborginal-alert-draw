export function MedicineWheel({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#f5efe7" />
      <path d="M20 20 L20 1 A19 19 0 0 1 39 20 Z" fill="#e8a33d" />
      <path d="M20 20 L39 20 A19 19 0 0 1 20 39 Z" fill="#b3282d" />
      <path d="M20 20 L20 39 A19 19 0 0 1 1 20 Z" fill="#221b16" />
      <circle
        cx="20"
        cy="20"
        r="19"
        fill="none"
        stroke="#221b16"
        strokeWidth="1.5"
      />
    </svg>
  );
}
