import Link from "next/link";
import type { Metadata } from "next";
import NavbarClient from "./NavbarClient";

export const metadata: Metadata = {
  title: "Scorr — AI-Powered Quizzes & Flashcards",
  description: "Turn your notes, PDFs, and slides into practice quizzes and flashcards instantly. Study smarter and ace your exams with Scorr.",
};

// ── Hero ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <section
      className="hero-section"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        padding: "120px 24px 80px",
        maxWidth: 1200,
        margin: "0 auto",
        gap: 48,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (max-width: 900px) {
          .hero-section {
            flex-direction: column !important;
            padding: 96px 20px 48px !important;
            text-align: center !important;
            gap: 36px !important;
            min-height: auto !important;
          }
          .hero-left {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }
          .hero-input-row {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 12px !important;
            width: 100% !important;
          }
          .hero-input-divider { display: none !important; }
          .hero-input-btn { width: 100% !important; text-align: center !important; }
          .hero-mockup-wrapper {
            width: 100% !important;
            max-width: 340px !important;
            min-height: 420px !important;
          }
          .hero-floating-badge { display: none !important; }
        }
      `}</style>

      {/* Left */}
      <div className="hero-left" style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            fontSize: "clamp(34px, 6vw, 64px)",
            fontWeight: 900,
            lineHeight: 1.1,
            color: "#fff",
            letterSpacing: "-1.5px",
            marginBottom: 20,
          }}
        >
          Study smarter,<br />ace every exam
        </h1>
        <p
          style={{
            fontSize: 16,
            color: "#9ca3af",
            lineHeight: 1.6,
            marginBottom: 32,
            maxWidth: 480,
          }}
        >
          Turn your notes, slides, and PDFs into AI-generated quizzes and flashcards. Challenge friends in real-time battles and track your progress.
        </p>

        {/* Input row */}
        <div
          className="hero-input-row"
          style={{
            display: "flex",
            alignItems: "center",
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 14,
            padding: "6px 6px 6px 16px",
            marginBottom: 24,
            maxWidth: 480,
            boxSizing: "border-box",
          }}
        >
          <select
            style={{
              background: "transparent",
              border: "none",
              color: "#e5e7eb",
              fontSize: 14,
              fontWeight: 500,
              outline: "none",
              flex: 1,
              cursor: "pointer",
            }}
          >
            <option value="pdf" style={{ background: "#111827" }}>PDF / DOCX / TXT</option>
            <option value="topic" style={{ background: "#111827" }}>Type a Topic</option>
            <option value="slides" style={{ background: "#111827" }}>PowerPoint Slides</option>
          </select>
          <div className="hero-input-divider" style={{ width: 1, height: 24, background: "#1f2937", margin: "0 12px" }} />
          <select
            style={{
              background: "transparent",
              border: "none",
              color: "#e5e7eb",
              fontSize: 14,
              fontWeight: 500,
              outline: "none",
              flex: 1,
              cursor: "pointer",
            }}
          >
            <option value="quiz" style={{ background: "#111827" }}>Questions (MCQ)</option>
            <option value="flashcards" style={{ background: "#111827" }}>Flashcards</option>
          </select>
          <Link
            href="/login"
            className="hero-input-btn"
            style={{
              background: "#fff",
              color: "#0b0f1a",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "10px 20px",
              borderRadius: 10,
              whiteSpace: "nowrap",
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Social proof */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "inherit" }}>
          <div style={{ display: "flex", gap: 2 }}>
            {"★★★★★".split("").map((s, i) => (
              <span key={i} style={{ color: "#fbbf24", fontSize: 14 }}>{s}</span>
            ))}
          </div>
          <span style={{ color: "#6b7280", fontSize: 13 }}>
            Loved by students worldwide · 4.9/5
          </span>
        </div>
      </div>

      {/* Right — App mockup */}
      <div className="hero-mockup-wrapper" style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative", minHeight: 460 }}>
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Browser mockup */}
        <div
          style={{
            width: 340,
            maxWidth: "100%",
            background: "#1a1f2e",
            borderRadius: 16,
            border: "1px solid #2d3748",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            position: "relative",
            zIndex: 2,
            boxSizing: "border-box",
          }}
        >
          {/* Browser bar */}
          <div
            style={{
              background: "#111827",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: "1px solid #1f2937",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
                <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div
              style={{
                flex: 1,
                background: "#1f2937",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                color: "#6b7280",
                textAlign: "center",
              }}
            >
              scorrapp.com
            </div>
          </div>

          {/* App content preview */}
          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>⚡ Recent Study Sets</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 14 }}>Human Anatomy - Cardio</div>

            {[
              { title: "Sinoatrial Node & Action Potentials", q: 24, pct: 92, color: "#10b981" },
              { title: "Pharmacology Beta Blockers", q: 18, pct: 78, color: "#6366f1" },
              { title: "Pathophysiology Ischemia", q: 30, pct: 64, color: "#f59e0b" },
            ].map((quiz, i) => (
              <div
                key={i}
                style={{
                  background: "#111827",
                  borderRadius: 10,
                  padding: "10px 12px",
                  marginBottom: 8,
                  borderLeft: `3px solid ${quiz.color}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {quiz.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: quiz.color, fontWeight: 700, minWidth: 28 }}>{quiz.pct}%</span>
                  <div style={{ flex: 1, height: 4, background: "#1f2937", borderRadius: 2 }}>
                    <div style={{ width: `${quiz.pct}%`, height: "100%", background: quiz.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{quiz.q}q</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Trusted by ────────────────────────────────────────────────────
function TrustedBy() {
  const logos = ["📚 Medical Schools", "🏛 Universities", "🎓 Students", "👩‍⚕️ Nursing Boards", "💊 Pharmacy Exams", "📖 Bar Prep", "🔬 Sciences"];
  return (
    <div
      style={{
        borderTop: "1px solid #1f2937",
        borderBottom: "1px solid #1f2937",
        padding: "24px 0",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          textAlign: "center",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "2px",
          color: "#4b5563",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        TRUSTED BY STUDENTS EVERYWHERE
      </p>
      <div style={{ display: "flex", overflow: "hidden" }}>
        <div className="animate-marquee" style={{ display: "flex", gap: 36, whiteSpace: "nowrap", paddingRight: 36 }}>
          {[...logos, ...logos].map((logo, i) => (
            <span key={i} style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", whiteSpace: "nowrap" }}>
              {logo}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────
function StepCard({
  step,
  title,
  desc,
  children,
}: {
  step: number;
  title: string;
  desc: string;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="step-card"
      style={{
        background: "#0f1420",
        border: "1px solid #1f2937",
        borderRadius: 20,
        padding: "36px 28px",
        display: "flex",
        alignItems: "center",
        gap: 36,
        marginBottom: 16,
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .step-card {
            flex-direction: column !important;
            padding: 24px 18px !important;
            gap: 24px !important;
            text-align: center !important;
          }
          .step-card-btn { margin: 0 auto !important; }
        }
      `}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "inline-block",
            background: "#a3e635",
            color: "#0b0f1a",
            fontSize: 11,
            fontWeight: 800,
            padding: "3px 10px",
            borderRadius: 20,
            marginBottom: 14,
            letterSpacing: "0.5px",
          }}
        >
          Step {step}
        </div>
        <h3
          style={{
            fontSize: "clamp(22px, 4vw, 28px)",
            fontWeight: 800,
            color: "#fff",
            marginBottom: 12,
            lineHeight: 1.2,
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </h3>
        <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 20 }}>
          {desc}
        </p>
        <Link
          href="/login"
          className="step-card-btn"
          style={{
            display: "inline-block",
            background: "#fff",
            color: "#0b0f1a",
            textDecoration: "none",
            fontSize: 14,
            fontWeight: 700,
            padding: "10px 22px",
            borderRadius: 10,
          }}
        >
          Get Started
        </Link>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center", width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 20px" }}>
      <h2
        style={{
          fontSize: "clamp(28px, 5vw, 36px)",
          fontWeight: 800,
          color: "#fff",
          textAlign: "center",
          marginBottom: 40,
          letterSpacing: "-0.8px",
        }}
      >
        AI-Powered Learning Made Easy
      </h2>

      <StepCard
        step={1}
        title="Upload Your Study Materials"
        desc="Stop wasting hours manually creating questions. Upload PDFs, lecture slides, Word docs, or just type a topic. Scorr's AI processes your content in seconds."
      >
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: "24px", textAlign: "center", width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>Drag & Drop Documents</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>PDF, DOCX, TXT, Slides, Images</div>
        </div>
      </StepCard>

      <StepCard
        step={2}
        title="AI Generates Quizzes & Flashcards"
        desc="Transform your documents into interactive MCQ quizzes and smart spaced-repetition flashcards. Review answers with detailed instant explanations."
      >
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: "24px", textAlign: "center", width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✨</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#34d399", marginBottom: 4 }}>Instant AI Generation</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Multi-choice Questions + Flashcards</div>
        </div>
      </StepCard>

      <StepCard
        step={3}
        title="Real-Time 1v1 Battle Arena"
        desc="Challenge classmates and friends to live multiplayer quiz clashes with 5-digit room codes. See who masters the material faster."
      >
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: "24px", textAlign: "center", width: "100%", maxWidth: 300 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚔️</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f43f5e", marginBottom: 4 }}>Multiplayer Battles</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Live Scores • Room Codes • Leaderboards</div>
        </div>
      </StepCard>
    </section>
  );
}

// ── Subjects ──────────────────────────────────────────────────────
function Subjects() {
  const subjects = [
    { icon: "🩺", name: "Medicine", desc: "Clinical reasoning, USMLE revision, anatomy, physiology, and pharmacology recall." },
    { icon: "💉", name: "Nursing", desc: "NCLEX-style practice, clinical judgement, patient safety, and care planning." },
    { icon: "💊", name: "Pharmacy", desc: "Therapeutics, drug mechanisms, interactions, contraindications, and exam prep." },
    { icon: "⚖️", name: "Law", desc: "Case-based recall, statute memorisation, and bar exam technique practice." },
    { icon: "📐", name: "Engineering", desc: "Problem sets, concept recall, formula mastery, and technical vocabulary." },
    { icon: "💰", name: "Business", desc: "Financial concepts, management theory, and case study preparation." },
  ];

  return (
    <section id="subjects" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 20px" }}>
      <h2
        style={{
          fontSize: "clamp(28px, 5vw, 36px)",
          fontWeight: 800,
          color: "#fff",
          textAlign: "center",
          marginBottom: 12,
          letterSpacing: "-0.8px",
        }}
      >
        Built for Every Subject
      </h2>
      <p
        style={{
          fontSize: 15,
          color: "#9ca3af",
          textAlign: "center",
          marginBottom: 36,
          maxWidth: 520,
          margin: "0 auto 36px",
        }}
      >
        Scorr is especially useful for memory-heavy subjects and high-stakes exams.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {subjects.map((s) => (
          <div
            key={s.name}
            style={{
              background: "#0f1420",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: "22px 20px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ width: 42, height: 42, background: "#1a1f2e", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>
              {s.icon}
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{s.name}</h4>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.5, margin: "0 0 14px 0" }}>{s.desc}</p>
            <Link href="/login" style={{ color: "#a3e635", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Get started →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #1a1f2e 0%, #0f1420 100%)",
          border: "1px solid #1f2937",
          borderRadius: 24,
          padding: "48px 24px",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ fontSize: "clamp(26px, 5vw, 36px)", fontWeight: 900, color: "#fff", marginBottom: 12, letterSpacing: "-0.8px" }}>
          Start studying smarter today
        </h2>
        <p style={{ fontSize: 15, color: "#9ca3af", marginBottom: 28, maxWidth: 440, margin: "0 auto 28px" }}>
          Join students worldwide using Scorr on web and mobile to ace their exams.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/login"
            style={{
              background: "#fff",
              color: "#0b0f1a",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 700,
              padding: "14px 28px",
              borderRadius: 12,
            }}
          >
            Get Started — It&apos;s Free
          </Link>
          <Link
            href="/download"
            style={{
              background: "#111827",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#fff",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
              padding: "14px 24px",
              borderRadius: 12,
            }}
          >
            Download Mobile App 📱
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: "1px solid #1f2937", padding: "36px 20px" }}>
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Scorr Logo"
            style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover" }}
          />
          <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>SCORR</span>
        </div>

        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms of Service", href: "/terms-of-service" },
            { label: "Delete Account", href: "/delete-account" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ color: "#6b7280", textDecoration: "none", fontSize: 13 }}>
              {l.label}
            </Link>
          ))}
        </div>

        <p style={{ color: "#4b5563", fontSize: 13, margin: 0 }}>
          © {new Date().getFullYear()} Scorr. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

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
