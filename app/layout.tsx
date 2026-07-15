import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
