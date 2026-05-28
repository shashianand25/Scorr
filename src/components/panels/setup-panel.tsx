"use client";

import { motion } from "framer-motion";
import {
  ChevronLeft,
  Play,
  Shuffle,
  Clock,
  ArrowRightLeft,
  CheckSquare,
  List,
  AlertTriangle,
} from "lucide-react";
import type { QstParseResult } from "@/lib/qst/types";
import type { QuizConfig, SessionHistory } from "../quiz-types";

interface SetupPanelProps {
  parsed: QstParseResult;
  fileName: string;
  config: QuizConfig;
  setConfig: (c: QuizConfig) => void;
  history: SessionHistory;
  onStart: () => void;
  onBack: () => void;
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: checked ? "var(--accent-primary)" : "rgba(255,255,255,0.12)" }}
    >
      <motion.span
        className="absolute size-4 rounded-full bg-white shadow"
        animate={{ x: checked ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title}
      </p>
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      {children}
    </div>
  );
}

function LastRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">{children}</div>
  );
}

export function SetupPanel({
  parsed,
  fileName,
  config,
  setConfig,
  history,
  onStart,
  onBack,
}: SetupPanelProps) {
  const total = parsed.data.questions.length;
  const unansweredCount = total - history.answered.size;
  const wrongCount = history.wrong.size;

  const update = (patch: Partial<QuizConfig>) => setConfig({ ...config, ...patch });

  // Compute how many questions will be used
  const questionCount = (() => {
    switch (config.selectionMode) {
      case "random":
        return Math.min(config.randomCount, total);
      case "range":
        return Math.max(0, Math.min(config.rangeEnd, total) - Math.max(config.rangeStart - 1, 0));
      case "unanswered":
        return unansweredCount;
      case "wrong":
        return wrongCount;
      default:
        return total;
    }
  })();

  type SelectMode = QuizConfig["selectionMode"];
  const modes: { value: SelectMode; label: string; sub: string; disabled?: boolean }[] = [
    { value: "all", label: "All questions", sub: `${total} questions` },
    { value: "random", label: "Random pick", sub: "Choose how many" },
    { value: "range", label: "Question range", sub: "From Q1 to Q450" },
    {
      value: "unanswered",
      label: "Unanswered only",
      sub: unansweredCount > 0 ? `${unansweredCount} remaining` : "No session yet",
      disabled: unansweredCount === 0,
    },
    {
      value: "wrong",
      label: "Wrong answers",
      sub: wrongCount > 0 ? `${wrongCount} questions` : "No session yet",
      disabled: wrongCount === 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto max-w-2xl space-y-6 pb-32"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.025em" }}
          >
            {parsed.data.metadata.title ?? fileName.replace(/\.[^.]+$/, "")}
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
            {total} questions available
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-white/5"
          style={{ color: "var(--text-secondary)" }}
        >
          <ChevronLeft className="size-4" />
          Change file
        </button>
      </div>

      {/* Question Selection */}
      <Section title="Question selection">
        {modes.map(({ value, label, sub, disabled }, i) => {
          const isActive = config.selectionMode === value;
          const isLast = i === modes.length - 1;
          const Wrapper = isLast ? LastRow : Row;
          return (
            <div key={value}>
              <Wrapper>
                <button
                  disabled={disabled}
                  onClick={() => update({ selectionMode: value })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {/* Radio */}
                  <div
                    className="grid size-5 shrink-0 place-items-center rounded-full"
                    style={{
                      border: `2px solid ${isActive ? "var(--accent-primary)" : "rgba(255,255,255,0.2)"}`,
                      background: isActive ? "var(--accent-primary)" : "transparent",
                    }}
                  >
                    {isActive && <div className="size-2 rounded-full bg-[#07090e]" />}
                  </div>
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: disabled ? "var(--text-tertiary)" : "var(--text-primary)" }}
                    >
                      {label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {sub}
                    </p>
                  </div>
                </button>

                {/* Inline input for random */}
                {value === "random" && isActive && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={total}
                      value={config.randomCount}
                      onChange={(e) =>
                        update({ randomCount: Math.min(total, Math.max(1, Number(e.target.value))) })
                      }
                      className="w-20 rounded-xl bg-transparent px-3 py-1.5 text-center text-sm font-semibold outline-none"
                      style={{
                        border: "1px solid rgba(0,229,160,0.3)",
                        color: "var(--accent-primary)",
                        background: "rgba(0,229,160,0.06)",
                      }}
                    />
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      / {total}
                    </span>
                  </div>
                )}

                {/* Inline input for range */}
                {value === "range" && isActive && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={total}
                      value={config.rangeStart}
                      onChange={(e) =>
                        update({
                          rangeStart: Math.min(
                            config.rangeEnd,
                            Math.max(1, Number(e.target.value))
                          ),
                        })
                      }
                      className="w-16 rounded-xl bg-transparent px-2 py-1.5 text-center text-sm font-semibold outline-none"
                      style={{
                        border: "1px solid rgba(0,229,160,0.3)",
                        color: "var(--accent-primary)",
                        background: "rgba(0,229,160,0.06)",
                      }}
                    />
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>to</span>
                    <input
                      type="number"
                      min={1}
                      max={total}
                      value={config.rangeEnd}
                      onChange={(e) =>
                        update({
                          rangeEnd: Math.min(total, Math.max(config.rangeStart, Number(e.target.value))),
                        })
                      }
                      className="w-16 rounded-xl bg-transparent px-2 py-1.5 text-center text-sm font-semibold outline-none"
                      style={{
                        border: "1px solid rgba(0,229,160,0.3)",
                        color: "var(--accent-primary)",
                        background: "rgba(0,229,160,0.06)",
                      }}
                    />
                  </div>
                )}
              </Wrapper>
            </div>
          );
        })}
      </Section>

      {/* Timer */}
      <Section title="Timer">
        <Row>
          <div className="flex items-center gap-3">
            <div
              className="grid size-8 place-items-center rounded-xl"
              style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}
            >
              <Clock className="size-4" style={{ color: "#3b82f6" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Time per question
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {config.timePerQuestion ? `${config.timePerQuestion} seconds` : "No time limit"}
              </p>
            </div>
          </div>
          <Toggle
            checked={config.timePerQuestion !== null}
            onChange={(on) => update({ timePerQuestion: on ? 30 : null })}
          />
        </Row>

        {config.timePerQuestion !== null && (
          <LastRow>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Seconds per question
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={120}
                step={5}
                value={config.timePerQuestion}
                onChange={(e) => update({ timePerQuestion: Number(e.target.value) })}
                className="w-28"
                style={{ accentColor: "var(--accent-primary)" }}
              />
              <span
                className="w-12 text-right text-sm font-bold"
                style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}
              >
                {config.timePerQuestion}s
              </span>
            </div>
          </LastRow>
        )}
      </Section>

      {/* Options */}
      <Section title="Options">
        {[
          {
            icon: Shuffle,
            color: "#a855f7",
            label: "Shuffle question order",
            sub: "Questions appear in random order",
            key: "shuffleQuestions" as const,
          },
          {
            icon: ArrowRightLeft,
            color: "#3b82f6",
            label: "Shuffle answer options",
            sub: "Answer choices appear in random order",
            key: "shuffleAnswers" as const,
          },
          {
            icon: CheckSquare,
            color: "var(--accent-primary)",
            label: "Show answer after submit",
            sub: "Highlight correct answer when you answer",
            key: "showAnswerOnSubmit" as const,
          },
        ].map(({ icon: Icon, color, label, sub, key }, i) => {
          const isLast = i === 2;
          const Wrapper = isLast ? LastRow : Row;
          return (
            <Wrapper key={key}>
              <div className="flex items-center gap-3">
                <div
                  className="grid size-8 place-items-center rounded-xl"
                  style={{ background: `${color}18`, border: `1px solid ${color}28` }}
                >
                  <Icon className="size-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {label}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {sub}
                  </p>
                </div>
              </div>
              <Toggle
                checked={config[key] as boolean}
                onChange={(v) => update({ [key]: v })}
              />
            </Wrapper>
          );
        })}
      </Section>

      {/* Summary + CTA */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: "rgba(0, 229, 160, 0.04)",
          border: "1px solid rgba(0, 229, 160, 0.15)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <List className="size-4" style={{ color: "var(--accent-primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Ready to start
            </span>
          </div>
          <span
            className="text-2xl font-bold"
            style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}
          >
            {questionCount}
          </span>
        </div>

        <p className="mb-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          {questionCount} question{questionCount !== 1 ? "s" : ""} ·{" "}
          {config.shuffleQuestions ? "shuffled" : "in order"} ·{" "}
          {config.timePerQuestion ? `${config.timePerQuestion}s per question` : "no time limit"}
        </p>

        {questionCount === 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl p-3"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <AlertTriangle className="size-4 shrink-0" style={{ color: "#f59e0b" }} />
            <p className="text-xs" style={{ color: "#f59e0b" }}>
              No questions match your selection. Please adjust your settings.
            </p>
          </div>
        )}

        <motion.button
          onClick={onStart}
          disabled={questionCount === 0}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold disabled:opacity-40"
          style={{
            background: "var(--accent-primary)",
            color: "#07090e",
            boxShadow: questionCount > 0 ? "0 0 24px rgba(0,229,160,0.25)" : "none",
          }}
        >
          <Play className="size-5" />
          Start Quiz
        </motion.button>
      </div>
    </motion.div>
  );
}
