import type { Metadata, Viewport } from "next";
import "./globals.css";
import ScrollToTop from "@/components/ScrollToTop";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SvarAI – AI-resepsjonist for klinikker",
  description:
    "SvarAI svarer på henvendelser, håndterer bookinger og løfter kundeservicen din – 24/7. Bygget for klinikker i Norge.",
  metadataBase: new URL("https://svarai.no"),
  icons: {
    icon: "/logo.png",
    apple: "/logo-192.png",
  },
  openGraph: {
    title: "SvarAI – AI-resepsjonist for klinikker",
    description:
      "Svar på alle henvendelser og fyll kalenderen – uten å løfte telefonen.",
    url: "https://svarai.no",
    siteName: "SvarAI",
    locale: "nb_NO",
    type: "website",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "SvarAI" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SvarAI – AI-resepsjonist for klinikker",
    description:
      "Svar på alle henvendelser og fyll kalenderen – uten å løfte telefonen.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className="antialiased bg-white text-ink-900">
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
