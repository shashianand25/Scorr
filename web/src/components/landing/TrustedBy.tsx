
// ── Trusted by ────────────────────────────────────────────────────
export function TrustedBy() {
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

