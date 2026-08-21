import Link from "next/link";

// ── CTA ───────────────────────────────────────────────────────────
export function CTA() {
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

