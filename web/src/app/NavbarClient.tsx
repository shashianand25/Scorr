"use client";

import Link from "next/link";
import { useState } from "react";

export default function NavbarClient() {
  const [hovered, setHovered] = useState<string | null>(null);

  const navItems = ["Features", "How It Works", "Subjects"];

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(11,15,26,0.85)", backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>S</span>
          </div>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>SCORR</span>
        </Link>

        {/* Nav links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {navItems.map((item) => {
            const path = item === "Features" ? "/how-it-works" : `/${item.toLowerCase().replace(/ /g, "-")}`;
            return (
              <Link
                key={item}
                href={path}
                style={{
                  color: hovered === item ? "#fff" : "#9ca3af",
                  textDecoration: "none", fontSize: 15, fontWeight: 500,
                  transition: "color 0.2s",
                }}
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
              >{item}</Link>
            );
          })}
        </nav>

        {/* CTA buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/login" style={{
            color: "#e5e7eb", textDecoration: "none", fontSize: 15, fontWeight: 500,
            padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
          }}>Login</Link>
          <Link href="/login" style={{
            background: "#fff", color: "#0b0f1a", textDecoration: "none",
            fontSize: 15, fontWeight: 700, padding: "8px 20px", borderRadius: 10,
          }}>Get Started</Link>
        </div>
      </div>
    </header>
  );
}
