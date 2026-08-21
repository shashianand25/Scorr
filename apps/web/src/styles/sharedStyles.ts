import type { CSSProperties } from "react";

/**
 * Shared Theme and Style Constants for Scorr Web Application.
 * Consolidates repeated inline styling patterns for cards, tabs, and buttons.
 */

export const THEME_COLORS = {
  bgDark: "#0d111d",
  borderDark: "rgba(255, 255, 255, 0.08)",
  borderAccent: "rgba(99, 102, 241, 0.2)",
  textPrimary: "#ffffff",
  textSecondary: "#9ca3af",
  accentPurple: "#6366f1",
  accentIndigo: "#4f46e5",
  successGreen: "#10b981",
  dangerRed: "#ef4444",
} as const;

export const glassCard: CSSProperties = {
  background: THEME_COLORS.bgDark,
  border: `1px solid ${THEME_COLORS.borderDark}`,
  borderRadius: 14,
};

export const tabContainerStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  background: THEME_COLORS.bgDark,
  border: `1px solid ${THEME_COLORS.borderDark}`,
  borderRadius: 14,
  padding: 4,
  overflowX: "auto",
};

export const pillButtonBase: CSSProperties = {
  flex: 1,
  minWidth: 120,
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  whiteSpace: "nowrap",
  transition: "all 0.15s ease",
};

export const getTabButtonStyle = (isActive: boolean): CSSProperties => ({
  ...pillButtonBase,
  background: isActive ? THEME_COLORS.borderAccent : "transparent",
  color: isActive ? THEME_COLORS.textPrimary : THEME_COLORS.textSecondary,
  fontWeight: isActive ? 700 : 500,
});
