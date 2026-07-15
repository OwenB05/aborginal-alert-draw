import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aboriginal Alert Community Draws",
  description:
    "Enter community draws hosted by Aboriginal Alert — Canada's Indigenous Awareness Network.",
};

// Applies the stored-or-system theme before first paint (no flash).
const themeScript = `(function(){try{var t=localStorage.getItem("aau-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${openSans.variable} font-sans antialiased flex min-h-dvh flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
