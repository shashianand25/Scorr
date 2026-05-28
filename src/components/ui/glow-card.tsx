"use client";

import { motion, type MotionProps } from "framer-motion";
import { type ReactNode } from "react";

interface GlowCardProps extends MotionProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  accent?: "cyan" | "purple" | "blue" | "none";
  hover?: boolean;
  noPadding?: boolean;
}

export function GlowCard({
  children,
  className = "",
  style = {},
  accent = "none",
  hover = true,
  noPadding = false,
  ...motionProps
}: GlowCardProps) {
  const accentColors = {
    cyan: {
      border: "rgba(0, 229, 160, 0.2)",
      glow: "rgba(0, 229, 160, 0.08)",
      hover: "rgba(0, 229, 160, 0.12)",
    },
    purple: {
      border: "rgba(168, 85, 247, 0.2)",
      glow: "rgba(168, 85, 247, 0.08)",
      hover: "rgba(168, 85, 247, 0.12)",
    },
    blue: {
      border: "rgba(59, 130, 246, 0.2)",
      glow: "rgba(59, 130, 246, 0.08)",
      hover: "rgba(59, 130, 246, 0.12)",
    },
    none: {
      border: "rgba(255, 255, 255, 0.08)",
      glow: "rgba(0, 0, 0, 0)",
      hover: "rgba(255, 255, 255, 0.04)",
    },
  };

  const c = accentColors[accent];

  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative overflow-hidden rounded-2xl ${noPadding ? "" : "p-5"} ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.025)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${c.border}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`,
        ...style,
      }}
      {...motionProps}
    >
      {/* Top gradient sheen */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${c.border}, transparent)`,
        }}
      />
      {children}
    </motion.div>
  );
}

// Smaller variant for metrics
interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
  description?: string;
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  description,
}: MetricCardProps) {
  const toneColors = {
    neutral: "var(--accent-primary)",
    good: "#00e5a0",
    warn: "#f59e0b",
    bad: "#ef4444",
  };
  const color = toneColors[tone];

  return (
    <GlowCard accent={tone === "neutral" ? "none" : tone === "good" ? "cyan" : tone === "warn" ? "none" : "none"}>
      <div className="mb-4 flex items-start justify-between">
        <div
          className="grid size-9 place-items-center rounded-xl"
          style={{
            background: `${color}18`,
            border: `1px solid ${color}30`,
          }}
        >
          <Icon className="size-4" style={{ color }} />
        </div>
        <div
          className="size-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <p
        className="mb-0.5 text-2xl font-bold tracking-tight"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </p>
      <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
        {label}
      </p>
      {description && (
        <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
          {description}
        </p>
      )}
    </GlowCard>
  );
}
