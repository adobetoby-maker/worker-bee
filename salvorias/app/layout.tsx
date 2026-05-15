import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salvorias — Your Web Presence, Paid in SAV",
  description:
    "CJA Web Services is opening 25 spots for SAV token holders. Get a fully built, custom WordPress site — no USD required.",
  openGraph: {
    title: "Salvorias — Your Web Presence, Paid in SAV",
    description: "Get a fully built, custom WordPress site — no USD required. Only 25 spots.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
