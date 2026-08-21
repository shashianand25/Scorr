import React from "react";
import Link from "next/link";

// ── Subjects ──────────────────────────────────────────────────────
export function Subjects() {
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

