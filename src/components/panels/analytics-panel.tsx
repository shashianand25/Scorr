"use client";

import { motion } from "framer-motion";
import {
  Users,
  FileText,
  Activity,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import { StatCounter } from "../ui/stat-counter";

const CHART_DATA = [42, 58, 39, 72, 66, 91, 77, 88, 64, 95, 86, 100];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACTIVITY = [
  { user: "Maya R.", action: "Completed Biology Quiz", time: "2m ago", score: 920 },
  { user: "Arjun P.", action: "Joined Live Room QF-82K", time: "4m ago", score: null },
  { user: "Nora K.", action: "Created 'Physics Exam'", time: "7m ago", score: null },
  { user: "Tyler M.", action: "Exported QST file", time: "12m ago", score: null },
  { user: "Guest-42", action: "Completed Math Quiz", time: "15m ago", score: 610 },
];

export function AnalyticsPanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Hero stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Users,
            label: "Total Users",
            value: 48210,
            change: "+12.4%",
            positive: true,
            color: "var(--accent-primary)",
          },
          {
            icon: FileText,
            label: "Quizzes Created",
            value: 112904,
            change: "+8.1%",
            positive: true,
            color: "#3b82f6",
          },
          {
            icon: Activity,
            label: "Attempts Today",
            value: 83441,
            change: "+23.7%",
            positive: true,
            color: "#a855f7",
          },
          {
            icon: Zap,
            label: "Active Sessions",
            value: 142,
            change: "+5",
            positive: true,
            color: "#f59e0b",
          },
        ].map(({ icon: Icon, label, value, change, positive, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Background glow */}
            <div
              className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full opacity-10"
              style={{ background: color, filter: "blur(24px)" }}
            />

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
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: positive ? "rgba(0,229,160,0.1)" : "rgba(239,68,68,0.1)",
                  color: positive ? "var(--accent-primary)" : "#ef4444",
                }}
              >
                <ArrowUpRight className="size-3" />
                {change}
              </span>
            </div>

            <p
              className="text-3xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              <StatCounter value={value} />
            </p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Main content: Chart + Activity */}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        {/* Traffic chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-5"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div>
              <h2
                className="text-subheading"
                style={{ color: "var(--text-primary)" }}
              >
                Quiz Activity
              </h2>
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                Attempts per month · 2025
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5"
              style={{
                background: "rgba(0,229,160,0.08)",
                border: "1px solid rgba(0,229,160,0.2)",
              }}
            >
              <TrendingUp className="size-3.5" style={{ color: "var(--accent-primary)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--accent-primary)" }}>
                +38% YoY
              </span>
            </div>
          </div>

          <div className="px-6 pb-6 pt-6">
            {/* Chart */}
            <div className="relative flex items-end gap-2 h-48">
              {/* Horizontal grid lines */}
              {[0, 25, 50, 75, 100].map((pct) => (
                <div
                  key={pct}
                  className="pointer-events-none absolute left-0 right-0"
                  style={{
                    bottom: `${pct}%`,
                    borderTop: "1px dashed rgba(255,255,255,0.05)",
                  }}
                />
              ))}

              {CHART_DATA.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <motion.div
                    className="relative w-full overflow-hidden rounded-t-lg"
                    style={{ height: `${height}%` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      delay: 0.4 + index * 0.05,
                      type: "spring",
                      stiffness: 150,
                      damping: 20,
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          index === CHART_DATA.length - 1
                            ? "linear-gradient(to top, var(--accent-primary), #7dd3fc)"
                            : "linear-gradient(to top, rgba(0,229,160,0.6), rgba(0,229,160,0.2))",
                        boxShadow:
                          index === CHART_DATA.length - 1
                            ? "0 0 12px rgba(0,229,160,0.4)"
                            : "none",
                      }}
                    />
                  </motion.div>
                </div>
              ))}
            </div>

            {/* X-axis labels */}
            <div className="mt-3 flex gap-2">
              {MONTHS.map((month) => (
                <div key={month} className="flex-1 text-center">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {month}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <h2 className="text-subheading" style={{ color: "var(--text-primary)" }}>
              Live Activity
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
              Real-time user events
            </p>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {ACTIVITY.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                className="flex items-start gap-3 px-5 py-4"
              >
                {/* Avatar */}
                <div
                  className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(0,229,160,0.1)",
                    border: "1px solid rgba(0,229,160,0.2)",
                    color: "var(--accent-primary)",
                  }}
                >
                  {event.user[0]}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                    {event.user}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {event.action}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <Clock className="size-2.5" style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {event.time}
                    </span>
                  </div>
                  {event.score !== null && (
                    <span
                      className="text-xs font-bold"
                      style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}
                    >
                      {event.score} pts
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div
            className="px-5 py-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              className="text-xs font-medium transition-colors"
              style={{ color: "var(--accent-primary)" }}
            >
              View all activity →
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
