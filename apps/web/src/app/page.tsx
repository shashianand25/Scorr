import type { Metadata } from "next";
import NavbarClient from "./NavbarClient";
import { Hero } from "@/components/landing/Hero";
import { TrustedBy } from "@/components/landing/TrustedBy";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Subjects } from "@/components/landing/Subjects";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Scorr — AI-Powered Quizzes & Flashcards",
  description:
    "Turn your notes, PDFs, and slides into practice quizzes and flashcards instantly. Study smarter and ace your exams with Scorr.",
};

// ── Main Page ─────────────────────────────────────────────────────
export default function Home() {
  return (
    <div style={{ background: "#0b0f1a", minHeight: "100vh", overflowX: "hidden" }}>
      <NavbarClient />
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <Subjects />
      <CTA />
      <Footer />
    </div>
  );
}
