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

  // Check if current screen is an active immersive session (quiz runner, flashcards session, battle match)
  const isImmersiveSession =
    (pathname.startsWith("/quiz/") && pathname !== "/quiz/create") ||
    (pathname.startsWith("/flashcards/") && pathname !== "/flashcards") ||
    (pathname.startsWith("/battle/") && pathname !== "/battle");

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
        overflowX: "hidden",
        width: "100%",
      }}
    >
      <style>{`
        .mobile-bottom-bar { display: none; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-bottom-bar { display: ${isImmersiveSession ? "none !important" : "flex !important"}; }
          .main-content {
            margin-left: 0 !important;
            padding-bottom: ${isImmersiveSession ? "16px !important" : "calc(76px + env(safe-area-inset-bottom, 0px)) !important"};
          }
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
          <img
            src="/logo.png"
            alt="Scorr Logo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              objectFit: "cover",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
            }}
          />
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

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: "16px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
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
                  padding: "11px 14px",
                  borderRadius: 12,
                  background: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  color: active ? "#ffffff" : "#9ca3af",
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  border: active ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                }}
              >
                <span style={{ fontSize: 18 }}>{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle button */}
        <div style={{ padding: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: "100%",
              padding: "8px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              color: "#9ca3af",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {collapsed ? "→" : "← Collapse"}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main
        className="main-content"
        style={{
          flex: 1,
          marginLeft: collapsed ? 76 : 240,
          transition: "margin-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          minHeight: "100vh",
          background: "#09090f",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>

      {/* ── Bottom Bar (Mobile) ── */}
      {!isImmersiveSession && (
        <div
          className="mobile-bottom-bar"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(13, 17, 29, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
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
                  flex: 1,
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    background: active ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    padding: "4px 12px",
                    borderRadius: 14,
                    transition: "all 0.15s ease",
                  }}
                >
                  {icon}
                </div>
                <span
                  style={{
                    fontSize: 10,
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
      )}
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
