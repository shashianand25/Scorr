"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  ChevronRight,
  Lock,
  Trophy,
  Copy,
  Check,
  Users,
  Zap,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import type { QstParseResult } from "@/lib/qst/types";
import { MarkdownRenderer } from "../markdown-renderer";

interface LivePanelProps {
  parsed: QstParseResult;
}

const MOCK_PLAYERS = [
  { name: "Maya", score: 920, streak: 12, avatar: "M" },
  { name: "Arjun", score: 860, streak: 9, avatar: "A" },
  { name: "Nora", score: 790, streak: 6, avatar: "N" },
  { name: "Guest-42", score: 610, streak: 3, avatar: "G" },
  { name: "Tyler", score: 540, streak: 1, avatar: "T" },
];

const ROOM_CODE = "QF-82K";

const RANK_COLORS = [
  { bg: "rgba(255, 215, 0, 0.12)", border: "rgba(255, 215, 0, 0.3)", text: "#ffd700" },
  { bg: "rgba(192, 192, 192, 0.12)", border: "rgba(192, 192, 192, 0.3)", text: "#c0c0c0" },
  { bg: "rgba(205, 127, 50, 0.12)", border: "rgba(205, 127, 50, 0.3)", text: "#cd7f32" },
  { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "var(--text-secondary)" },
  { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "var(--text-secondary)" },
];

export function LivePanel({ parsed }: LivePanelProps) {
  const [isLive, setIsLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(false);

  function copyRoomCode() {
    navigator.clipboard.writeText(ROOM_CODE);
    setCopied(true);
    toast.success(`Room code ${ROOM_CODE} copied`);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentPrompt =
    parsed.data.questions[0]?.prompt ?? "Import a QST quiz to begin the live session.";

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      {/* === LEFT: Control center === */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        {/* Room header */}
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Animated grid bg */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,229,160,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.05) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                {/* LIVE indicator */}
                <div className="flex items-center gap-1.5">
                  <motion.div
                    animate={isLive ? { opacity: [1, 0.2, 1] } : { opacity: 0.3 }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                    className="size-2.5 rounded-full"
                    style={{ background: isLive ? "#ef4444" : "rgba(255,255,255,0.3)" }}
                  />
                  <span
                    className="text-xs font-bold tracking-widest"
                    style={{ color: isLive ? "#ef4444" : "var(--text-tertiary)" }}
                  >
                    {isLive ? "LIVE" : "OFFLINE"}
                  </span>
                </div>
              </div>
              <h2
                className="text-heading mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                Live Room
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {parsed.data.questions.length} question{parsed.data.questions.length !== 1 ? "s" : ""} · Socket.IO + Redis
              </p>
            </div>

            {/* Room code */}
            <div className="flex items-center gap-2">
              <div
                className="rounded-2xl px-5 py-3 font-mono text-2xl font-bold tracking-widest"
                style={{
                  background: "rgba(0, 229, 160, 0.08)",
                  border: "1px solid rgba(0, 229, 160, 0.25)",
                  color: "var(--accent-primary)",
                  letterSpacing: "0.15em",
                  boxShadow: "0 0 20px rgba(0, 229, 160, 0.1)",
                }}
              >
                {ROOM_CODE}
              </div>
              <motion.button
                onClick={copyRoomCode}
                whileTap={{ scale: 0.9 }}
                className="grid size-10 place-items-center rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "var(--text-secondary)",
                }}
              >
                {copied ? (
                  <Check className="size-4" style={{ color: "var(--accent-primary)" }} />
                ) : (
                  <Copy className="size-4" />
                )}
              </motion.button>
            </div>
          </div>

          {/* Stats row */}
          <div className="relative mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: Users, label: "Players", value: MOCK_PLAYERS.length.toString() },
              { icon: Radio, label: "Status", value: locked ? "Locked" : "Open" },
              { icon: Zap, label: "Avg Score", value: "744" },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl p-3 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <Icon className="mx-auto mb-1 size-4" style={{ color: "var(--text-tertiary)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {value}
                </p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-3 gap-3">
          {/* Start/Stop */}
          <motion.button
            onClick={() => {
              setIsLive(!isLive);
              toast.success(isLive ? "Session stopped" : "Session started!");
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center gap-2 rounded-2xl p-5 font-medium transition-all"
            style={{
              background: isLive
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(0, 229, 160, 0.1)",
              border: isLive
                ? "1px solid rgba(239, 68, 68, 0.3)"
                : "1px solid rgba(0, 229, 160, 0.3)",
              boxShadow: isLive
                ? "0 0 20px rgba(239, 68, 68, 0.1)"
                : "0 0 20px rgba(0, 229, 160, 0.1)",
            }}
          >
            {isLive ? (
              <>
                <div
                  className="grid size-10 place-items-center rounded-xl"
                  style={{ background: "rgba(239, 68, 68, 0.15)" }}
                >
                  <div className="size-4 rounded-sm" style={{ background: "#ef4444" }} />
                </div>
                <span className="text-sm" style={{ color: "#ef4444" }}>
                  Stop
                </span>
              </>
            ) : (
              <>
                <div
                  className="grid size-10 place-items-center rounded-xl"
                  style={{ background: "rgba(0, 229, 160, 0.15)" }}
                >
                  <Play className="size-5" style={{ color: "var(--accent-primary)" }} />
                </div>
                <span className="text-sm" style={{ color: "var(--accent-primary)" }}>
                  Start
                </span>
              </>
            )}
          </motion.button>

          {/* Next */}
          <motion.button
            onClick={() => toast.success("Advanced to next question")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center gap-2 rounded-2xl p-5 font-medium"
            style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <div
              className="grid size-10 place-items-center rounded-xl"
              style={{ background: "rgba(59, 130, 246, 0.15)" }}
            >
              <ChevronRight className="size-5" style={{ color: "#3b82f6" }} />
            </div>
            <span className="text-sm" style={{ color: "#3b82f6" }}>
              Next
            </span>
          </motion.button>

          {/* Lockdown */}
          <motion.button
            onClick={() => {
              setLocked(!locked);
              toast.success(locked ? "Room unlocked" : "Room locked down");
            }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex flex-col items-center gap-2 rounded-2xl p-5 font-medium"
            style={{
              background: locked ? "rgba(168, 85, 247, 0.1)" : "rgba(255,255,255,0.04)",
              border: locked
                ? "1px solid rgba(168, 85, 247, 0.3)"
                : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div
              className="grid size-10 place-items-center rounded-xl"
              style={{
                background: locked
                  ? "rgba(168, 85, 247, 0.15)"
                  : "rgba(255,255,255,0.06)",
              }}
            >
              <Lock
                className="size-5"
                style={{ color: locked ? "#a855f7" : "var(--text-secondary)" }}
              />
            </div>
            <span
              className="text-sm"
              style={{ color: locked ? "#a855f7" : "var(--text-secondary)" }}
            >
              {locked ? "Locked" : "Lock"}
            </span>
          </motion.button>
        </div>

        {/* Current question display */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span className="text-label" style={{ color: "var(--text-tertiary)" }}>
              Current Question
            </span>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {parsed.data.questions.length} total
            </span>
          </div>
          <div className="p-5 prose-lite">
            <MarkdownRenderer value={currentPrompt} />
          </div>
        </div>
      </motion.div>

      {/* === RIGHT: Scoreboard === */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="space-y-4"
      >
        {/* Scoreboard header */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="size-4" style={{ color: "var(--accent-primary)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Live Scoreboard
            </h3>
            <div
              className="ml-auto rounded-full px-2 py-0.5 text-xs"
              style={{
                background: "rgba(0,229,160,0.1)",
                color: "var(--accent-primary)",
                border: "1px solid rgba(0,229,160,0.2)",
              }}
            >
              {MOCK_PLAYERS.length} players
            </div>
          </div>

          <div className="space-y-2">
            {MOCK_PLAYERS.map((player, index) => {
              const rankColor = RANK_COLORS[Math.min(index, RANK_COLORS.length - 1)];
              const rankEmoji = ["🥇", "🥈", "🥉"][index] ?? "";

              return (
                <motion.div
                  key={player.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  layout
                  className="flex items-center gap-3 rounded-xl p-3"
                  style={{
                    background: rankColor.bg,
                    border: `1px solid ${rankColor.border}`,
                  }}
                >
                  {/* Rank */}
                  <div
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      color: rankColor.text,
                    }}
                  >
                    {rankEmoji || index + 1}
                  </div>

                  {/* Avatar + name */}
                  <div
                    className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold"
                    style={{
                      background: `${rankColor.border}`,
                      color: rankColor.text,
                    }}
                  >
                    {player.avatar}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {player.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {player.streak > 0 ? `🔥 ${player.streak} streak` : "No streak"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className="text-sm font-bold"
                      style={{ color: rankColor.text, fontFamily: "var(--font-mono)" }}
                    >
                      {player.score.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      pts
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Score distribution mini-bar */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-label mb-3" style={{ color: "var(--text-tertiary)" }}>
            Score Distribution
          </p>
          <div className="flex items-end gap-1 h-16">
            {MOCK_PLAYERS.map((player, i) => {
              const maxScore = MOCK_PLAYERS[0].score;
              const pct = (player.score / maxScore) * 100;
              return (
                <motion.div
                  key={player.name}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 200 }}
                  className="flex-1 rounded-t-lg origin-bottom"
                  style={{
                    height: `${pct}%`,
                    background: i === 0
                      ? "linear-gradient(to top, var(--accent-primary), #7dd3fc)"
                      : "rgba(255,255,255,0.1)",
                    boxShadow: i === 0 ? "0 0 10px rgba(0,229,160,0.3)" : "none",
                  }}
                  title={`${player.name}: ${player.score}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex gap-1">
            {MOCK_PLAYERS.map((player) => (
              <div key={player.name} className="flex-1 text-center">
                <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                  {player.avatar}
                </p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
