import React from "react";
import Link from "next/link";

// ── Footer ────────────────────────────────────────────────────────
export function Footer() {
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

