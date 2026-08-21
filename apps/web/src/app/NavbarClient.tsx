"use client";

import Link from "next/link";
import { useState } from "react";

export default function NavbarClient() {
  const [hovered, setHovered] = useState<string | null>(null);

  const navItems = ["Features", "How It Works", "Subjects"];

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(11, 15, 26, 0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .nav-desktop-links { display: none !important; }
          .nav-login-btn { display: none !important; }
          .nav-container { padding: 0 16px !important; }
        }
      `}</style>
      <div
        className="nav-container"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/logo.png"
            alt="Scorr"
            style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }}
          />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>SCORR</span>
        </Link>

        {/* Nav links (Desktop) */}
        <nav className="nav-desktop-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {navItems.map((item) => {
            const path = item === "Features" || item === "How It Works" ? "/#how-it-works" : `/#${item.toLowerCase().replace(/ /g, "-")}`;
            return (
              <Link
                key={item}
                href={path}
                style={{
                  color: hovered === item ? "#fff" : "#9ca3af",
                  textDecoration: "none",
                  fontSize: 15,
                  fontWeight: 500,
                  transition: "color 0.2s",
                }}
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >
                {item}
              </Link>
            );
          })}
        </nav>

        {/* CTA buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link
            href="/login"
            className="nav-login-btn"
            style={{
              color: "#e5e7eb",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 500,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            Login
          </Link>
          <Link
            href="/login"
            style={{
              background: "#ffffff",
              color: "#0b0f1a",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 700,
              padding: "8px 18px",
              borderRadius: 10,
              whiteSpace: "nowrap",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
