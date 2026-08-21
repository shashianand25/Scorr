import Link from "next/link";
import NavbarClient from "@/app/NavbarClient";

// ── Hero ──────────────────────────────────────────────────────────
export function Hero() {
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

