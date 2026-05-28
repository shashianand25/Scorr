import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#07090e",
};

export const metadata: Metadata = {
  title: "QuizForge — Live Quiz & Exam Platform",
  description: "Create, run, and analyze realtime quizzes with the QST-native live exam delivery platform.",
  manifest: "/manifest.json",
  openGraph: {
    title: "QuizForge",
    description: "Cinematic realtime quiz platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[#07090e] text-[var(--text-primary)] overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
