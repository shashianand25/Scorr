
// ── Step Card ─────────────────────────────────────────────────────
export function StepCard({
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
export function HowItWorks() {
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

