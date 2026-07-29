import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { A11Y_INIT_SCRIPT } from "@/lib/a11y-prefs";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aboriginal Alert Community Draws",
  description:
    "Enter community draws hosted by Aboriginal Alert — Canada's Indigenous Awareness Network.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies stored accessibility prefs (theme, text size, font, …)
            before first paint so there's no flash. */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
      </head>
      <body
        className={`${openSans.variable} font-sans antialiased flex min-h-dvh flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
