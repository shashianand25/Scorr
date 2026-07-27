"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/dashboard", icon: "🏠", label: "Home" },
  { href: "/library",   icon: "📚", label: "Library" },
  { href: "/quiz/create", icon: "✨", label: "Create Quiz" },
  { href: "/flashcards", icon: "🃏", label: "Flashcards" },
  { href: "/battle",    icon: "⚔️", label: "Battle Arena" },
  { href: "/history",   icon: "📊", label: "Stats & History" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return (
    <div style={{ minHeight: "100vh", background: "#0b0f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0b0f1a", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: collapsed ? 72 : 240,
        background: "#0f1420",
        borderRight: "1px solid #1f2937",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transition: "width 0.2s ease",
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #1f2937" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>S</span>
          </div>
          {!collapsed && <span style={{ color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px", whiteSpace: "nowrap" }}>SCORR</span>}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                background: active ? "rgba(99,102,241,0.15)" : "transparent",
                border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                {!collapsed && <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#a5b4fc" : "#9ca3af", whiteSpace: "nowrap" }}>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + collapse */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #1f2937", display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={() => setCollapsed(!collapsed)} style={{
            width: "100%", background: "transparent", border: "1px solid #1f2937",
            borderRadius: 10, padding: "8px 12px", color: "#6b7280", cursor: "pointer",
            fontSize: 13, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 8,
          }}>
            <span>{collapsed ? "→" : "←"}</span>
            {!collapsed && <span>Collapse</span>}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px" }}>
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{(user.displayName || user.email || "U")[0].toUpperCase()}</span>
              </div>
            )}
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.displayName || "User"}
                </div>
                <button onClick={signOut} style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: collapsed ? 72 : 240, transition: "margin-left 0.2s ease", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
