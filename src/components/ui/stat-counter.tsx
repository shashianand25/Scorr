"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, animate } from "framer-motion";

interface StatCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function StatCounter({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  style,
}: StatCounterProps) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    stiffness: 80,
    damping: 20,
    mass: 0.8,
  });

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (nodeRef.current) {
        const formatted =
          decimals > 0
            ? latest.toFixed(decimals)
            : Math.floor(latest).toLocaleString();
        nodeRef.current.textContent = `${prefix}${formatted}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springValue, prefix, suffix, decimals]);

  return (
    <span ref={nodeRef} className={className} style={style}>
      {prefix}0{suffix}
    </span>
  );
}

// Animated badge for showing status changes
interface AnimatedBadgeProps {
  children: React.ReactNode;
  tone?: "success" | "warning" | "error" | "neutral" | "accent";
}

export function AnimatedBadge({ children, tone = "neutral" }: AnimatedBadgeProps) {
  const colors = {
    success: { bg: "rgba(0, 229, 160, 0.12)", border: "rgba(0, 229, 160, 0.3)", text: "#00e5a0" },
    warning: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b" },
    error: { bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.3)", text: "#ef4444" },
    accent: { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.3)", text: "#a855f7" },
    neutral: { bg: "rgba(255, 255, 255, 0.06)", border: "rgba(255, 255, 255, 0.12)", text: "var(--text-secondary)" },
  };
  const c = colors[tone];

  return (
    <motion.span
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
      }}
    >
      {children}
    </motion.span>
  );
}
