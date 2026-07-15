export function Footer() {
  return (
    <footer className="no-print mt-12 bg-maroon-900 text-maroon-200">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 text-sm sm:px-6">
        <p>
          Community draw platform inspired by{" "}
          <a
            href="https://www.aboriginalalert.ca"
            className="underline hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Aboriginal Alert ↗
          </a>{" "}
          — Canada&apos;s Indigenous Awareness Network.
        </p>
        <p className="mt-2 text-xs">
          Entrant information is used only to run the draw it was submitted
          to.
        </p>
        <p className="mt-4 text-maroon-300">
          In honour of Missing and Murdered Indigenous Women, Girls and
          Two-Spirit people.
        </p>
      </div>
    </footer>
  );
}
