"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useState } from "react";
import { I18nProvider, useTranslation } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/ToastPill";

function NavigationLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const NAV = [
    { href: "/dashboard", icon: "🏠", label: t("tabs.home") || "Home" },
    { href: "/library", icon: "📚", label: t("tabs.library") || "Library" },
    { href: "/quiz/create", icon: "✨", label: t("tabs.create") || "Create" },
    { href: "/flashcards", icon: "🃏", label: t("flashcards.title") || "Cards" },
    { href: "/battle", icon: "⚔️", label: t("battle.multiplayer") || "Battle" },
    { href: "/profile", icon: "👤", label: t("tabs.profile") || "Profile" },
  ];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#09090f",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#ffffff",
      }}
    >
      <style>{`
        .mobile-bottom-bar { display: none; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottom-bar { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-bottom: 76px !important; }
        }
      `}</style>

      {/* ── Sidebar (Desktop) ── */}
      <aside
        className="desktop-sidebar"
        style={{
          width: collapsed ? 76 : 240,
          background: "#0d111d",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "20px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              flexShrink: 0,
              background: "linear-gradient(135deg, #6366f1, #34d399)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(99, 102, 241, 0.3)",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 18 }}>⚡</span>
          </div>
          {!collapsed && (
            <span
              style={{
                color: "#fff",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "-0.5px",
                whiteSpace: "nowrap",
              }}
            >
              SCORR
            </span>
          )}
        </div>

        {/* Nav links */}
        <nav
          style={{
            flex: 1,
            padding: "16px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  textDecoration: "none",
                  background: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  border: active ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                {!collapsed && (
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: active ? 700 : 500,
                      color: active ? "#a5b4fc" : "#9ca3af",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + collapse */}
        <div
          style={{
            padding: "14px 10px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              padding: "8px 12px",
              color: "#9ca3af",
              cursor: "pointer",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
            }}
          >
            <span>{collapsed ? "→" : "←"}</span>
            {!collapsed && <span>Collapse</span>}
          </button>

          <Link
            href="/profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 6px",
              textDecoration: "none",
            }}
          >
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="avatar"
                style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: user ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>
                  {user ? (user.displayName || user.email || "U")[0].toUpperCase() : "👤"}
                </span>
              </div>
            )}
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#f3f4f6",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.displayName || (user ? "Account" : "Guest Mode")}
                </div>
                <div style={{ fontSize: 11, color: user ? "#34d399" : "#a5b4fc" }}>
                  {user ? "Cloud Synced" : "Tap to sign in"}
                </div>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className="main-content"
        style={{
          flex: 1,
          marginLeft: collapsed ? 76 : 240,
          transition: "margin-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          minHeight: "100vh",
          background: "#09090f",
        }}
      >
        {children}
      </main>

      {/* ── Bottom Bar (Mobile) ── */}
      <div
        className="mobile-bottom-bar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(13, 17, 29, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          justifyContent: "space-around",
          alignItems: "center",
          padding: "8px 0",
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          zIndex: 50,
        }}
      >
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  background: active ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  padding: "4px 14px",
                  borderRadius: 14,
                  transition: "all 0.15s ease",
                }}
              >
                {icon}
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: active ? 700 : 500,
                  color: active ? "#a5b4fc" : "#9ca3af",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <NavigationLayout>{children}</NavigationLayout>
      </ToastProvider>
    </I18nProvider>
  );
}
