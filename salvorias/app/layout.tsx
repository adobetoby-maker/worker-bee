import type { Metadata } from "next";
import { Instrument_Serif, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const BASE_URL = "https://salvorias.worker-bee.app"

export const metadata: Metadata = {
  title: {
    default: "Salvorias — A Web Build, Settled in SAV",
    template: "%s — Salvorias",
  },
  description:
    "Twenty-five seats. One sum, settled in SAV. CJA Web Services opens a private build cohort for verified token holders — quoted in USD, paid in SAV at the rate locked at signing.",
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Salvorias — A Web Build, Settled in SAV",
    description:
      "A private build cohort for SAV token holders. Twenty-five seats. Settled in SAV.",
    type: "website",
    url: BASE_URL,
    siteName: "Salvorias",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Salvorias — A Web Build, Settled in SAV",
    description: "A private build cohort for SAV token holders. Twenty-five seats.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "CJA Web Services",
  url: BASE_URL,
  description:
    "CJA Web Services offers a private web-build cohort for SAV token holders. Twenty-five seats. Quoted in USD, settled in SAV.",
  offers: {
    "@type": "Offer",
    name: "Salvorias Build Cohort",
    price: "1995",
    priceCurrency: "USD",
    description: "Six deliverables. One signed brief. Settled in SAV.",
    url: `${BASE_URL}/apply`,
    availability: "https://schema.org/LimitedAvailability",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <div className="noise-overlay" aria-hidden />
        <Nav />
        <main className="relative bg-ink-900 min-h-screen overflow-x-hidden">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
