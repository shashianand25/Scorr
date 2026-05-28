"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Import,
  FileJson,
  FileText,
  Play,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import type { QstParseResult } from "@/lib/qst/types";
import { MarkdownRenderer } from "../markdown-renderer";

interface EditorPanelProps {
  source: string;
  setSource: (value: string) => void;
  parsed: QstParseResult;
  normalized: unknown;
  onImport: () => void;
  isPending: boolean;
  generatedQuiz: { id: string; slug: string; title: string } | null;
  onPlayGenerated: () => void;
}

export function EditorPanel({
  source,
  setSource,
  parsed,
  normalized,
  onImport,
  isPending,
  generatedQuiz,
  onPlayGenerated,
}: EditorPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineCount = source.split("\n").length;

  async function handleFileUpload(file: File) {
    const isTextFile =
      file.type === "text/plain" ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".qst");

    if (!isTextFile) {
      toast.error("Upload a .txt or .qst file");
      return;
    }
    if (file.size > 250_000) {
      toast.error("File is too large for this importer");
      return;
    }
    const text = await file.text();
    setSource(text);
    toast.success(`${file.name} loaded into the parser`);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFileUpload(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function copyJson() {
    navigator.clipboard.writeText(JSON.stringify(normalized, null, 2));
    setCopied(true);
    toast.success("Normalized JSON copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  const questionCount = parsed.data.questions.length;
  const issueCount = parsed.issues.length;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
      {/* === LEFT: Code Editor === */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col overflow-hidden rounded-2xl"
        style={{
          background: "rgba(7, 9, 14, 0.8)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Editor header */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex gap-1.5">
              <div className="size-3 rounded-full bg-red-500/60" />
              <div className="size-3 rounded-full bg-yellow-500/60" />
              <div className="size-3 rounded-full bg-green-500/60" />
            </div>
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                QST Parser Studio
              </h2>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {lineCount} lines · {questionCount} question{questionCount !== 1 ? "s" : ""} · regex parser
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload button */}
            <label
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all hover:scale-[1.02]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-secondary)",
              }}
            >
              <Upload className="size-3.5" />
              Upload
              <input
                id="file-upload-trigger"
                type="file"
                accept=".txt,.qst,text/plain"
                onChange={onFileChange}
                className="sr-only"
              />
            </label>

            {/* Copy JSON */}
            <button
              id="copy-json-btn"
              onClick={copyJson}
              className="grid size-8 place-items-center rounded-xl transition-all hover:scale-[1.05]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-secondary)",
              }}
              aria-label="Copy JSON"
            >
              {copied ? (
                <Check className="size-3.5" style={{ color: "var(--accent-primary)" }} />
              ) : (
                <FileJson className="size-3.5" />
              )}
            </button>

            {/* Generate button */}
            <motion.button
              onClick={onImport}
              disabled={isPending || questionCount === 0}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-40"
              style={{
                background: "var(--accent-primary)",
                color: "#07090e",
                boxShadow: isPending ? "none" : "0 0 20px rgba(0, 229, 160, 0.3)",
              }}
            >
              {isPending ? (
                <>
                  <div
                    className="size-3 animate-spin rounded-full border-2"
                    style={{
                      borderColor: "#07090e",
                      borderTopColor: "transparent",
                    }}
                  />
                  Generating...
                </>
              ) : (
                <>
                  <Import className="size-3.5" />
                  Generate Quiz
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Editor body with line numbers + textarea */}
        <div
          className="relative flex-1"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          {/* Drag overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-b-2xl"
                style={{
                  background: "rgba(0, 229, 160, 0.08)",
                  border: "2px dashed rgba(0, 229, 160, 0.4)",
                }}
              >
                <Upload className="mb-3 size-10" style={{ color: "var(--accent-primary)" }} />
                <p className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
                  Drop your .qst or .txt file here
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Line numbers + editor */}
          <div className="flex h-full min-h-[560px]">
            {/* Line numbers */}
            <div
              className="quiz-scrollbar select-none overflow-y-hidden pt-4 pb-4 text-right font-mono text-xs leading-6"
              style={{
                color: "var(--text-tertiary)",
                minWidth: "3.5rem",
                paddingRight: "0.75rem",
                paddingLeft: "0.75rem",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i + 1} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
              className="quiz-scrollbar flex-1 resize-none bg-transparent px-4 py-4 font-mono text-sm leading-6 outline-none"
              style={{ color: "var(--text-primary)" }}
              placeholder={"@title: My Quiz\n@time_limit: 30\n\n? Question text here\n+ Correct answer\n- Wrong answer\n- Wrong answer"}
            />
          </div>
        </div>
      </motion.div>

      {/* === RIGHT: Validation + Output === */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="space-y-4"
      >
        {/* Generated quiz success banner */}
        <AnimatePresence>
          {generatedQuiz && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative overflow-hidden rounded-2xl p-4"
              style={{
                background: "rgba(0, 229, 160, 0.07)",
                border: "1px solid rgba(0, 229, 160, 0.25)",
                boxShadow: "0 0 30px rgba(0, 229, 160, 0.08)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(0,229,160,0.5), transparent)",
                }}
              />
              <div className="mb-3 flex items-start gap-3">
                <div
                  className="grid size-9 shrink-0 place-items-center rounded-xl"
                  style={{
                    background: "rgba(0, 229, 160, 0.15)",
                    border: "1px solid rgba(0, 229, 160, 0.3)",
                  }}
                >
                  <CheckCircle className="size-4" style={{ color: "var(--accent-primary)" }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    Quiz generated successfully
                  </p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                    {generatedQuiz.title}
                  </p>
                </div>
                <code
                  className="shrink-0 rounded-lg px-2 py-1 text-xs"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    color: "var(--accent-primary)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {generatedQuiz.slug}
                </code>
              </div>
              <div className="flex flex-wrap gap-2">
                <motion.button
                  onClick={onPlayGenerated}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                  style={{ background: "var(--accent-primary)", color: "#07090e" }}
                >
                  <Play className="size-3" />
                  Play Preview
                </motion.button>
                <a
                  href={`/api/quizzes/${generatedQuiz.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <FileJson className="size-3" />
                  Open JSON
                  <ExternalLink className="size-3" />
                </a>
                <a
                  href={`/api/quizzes/${generatedQuiz.slug}/export?format=qst`}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <FileText className="size-3" />
                  Export QST
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation panel */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(7, 9, 14, 0.8)",
            border: `1px solid ${parsed.ok ? "rgba(0, 229, 160, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
            boxShadow: parsed.ok
              ? "0 0 20px rgba(0, 229, 160, 0.05)"
              : "0 0 20px rgba(245, 158, 11, 0.05)",
          }}
        >
          {/* Validation header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="grid size-7 place-items-center rounded-lg"
                style={{
                  background: parsed.ok
                    ? "rgba(0, 229, 160, 0.12)"
                    : "rgba(245, 158, 11, 0.12)",
                  border: parsed.ok
                    ? "1px solid rgba(0, 229, 160, 0.25)"
                    : "1px solid rgba(245, 158, 11, 0.25)",
                }}
              >
                {parsed.ok ? (
                  <CheckCircle
                    className="size-3.5"
                    style={{ color: "var(--accent-primary)" }}
                  />
                ) : (
                  <AlertTriangle className="size-3.5" style={{ color: "#f59e0b" }} />
                )}
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Validation Console
              </span>
            </div>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                background: parsed.ok
                  ? "rgba(0, 229, 160, 0.12)"
                  : "rgba(245, 158, 11, 0.12)",
                color: parsed.ok ? "var(--accent-primary)" : "#f59e0b",
              }}
            >
              {parsed.ok ? "✓ Ready" : `${issueCount} issue${issueCount !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Issues list */}
          <div className="max-h-64 overflow-y-auto quiz-scrollbar p-3 font-mono text-xs">
            {parsed.issues.length === 0 ? (
              <div className="flex items-center gap-2 py-3 px-1">
                <Sparkles className="size-3.5" style={{ color: "var(--accent-primary)" }} />
                <span style={{ color: "var(--accent-primary)" }}>
                  No issues detected — {questionCount} question{questionCount !== 1 ? "s" : ""} parsed
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                {parsed.issues.map((issue, i) => (
                  <motion.div
                    key={`${issue.code}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl p-3"
                    style={{
                      background: "rgba(245, 158, 11, 0.06)",
                      border: "1px solid rgba(245, 158, 11, 0.15)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="font-bold"
                        style={{ color: "#f59e0b" }}
                      >
                        [{issue.code}]
                      </span>
                      <span style={{ color: "var(--text-tertiary)" }}>
                        line {issue.line}
                      </span>
                    </div>
                    <p style={{ color: "var(--text-secondary)" }}>{issue.message}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* JSON Preview — collapsible */}
        <div
          className="overflow-hidden rounded-2xl"
          style={{
            background: "rgba(7, 9, 14, 0.9)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="flex w-full items-center justify-between px-4 py-3"
            style={{ borderBottom: jsonExpanded ? "1px solid rgba(255,255,255,0.07)" : "none" }}
          >
            {/* Clickable toggle area (left + chevron) */}
            <button
              onClick={() => setJsonExpanded(!jsonExpanded)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              aria-expanded={jsonExpanded}
            >
              <FileJson className="size-3.5 shrink-0" style={{ color: "var(--text-secondary)" }} />
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Normalized JSON Preview
              </span>
            </button>

            {/* Actions row — siblings, not nested inside the toggle */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={copyJson}
                className="rounded-lg p-1 transition-colors hover:bg-white/5"
                aria-label="Copy normalized JSON"
              >
                <Copy className="size-3" style={{ color: "var(--text-tertiary)" }} />
              </button>
              <button
                onClick={() => setJsonExpanded(!jsonExpanded)}
                className="rounded-lg p-1 transition-colors hover:bg-white/5"
                aria-label={jsonExpanded ? "Collapse JSON preview" : "Expand JSON preview"}
                aria-expanded={jsonExpanded}
              >
                {jsonExpanded ? (
                  <ChevronDown className="size-3.5" style={{ color: "var(--text-tertiary)" }} />
                ) : (
                  <ChevronRight className="size-3.5" style={{ color: "var(--text-tertiary)" }} />
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {jsonExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <pre
                  className="quiz-scrollbar max-h-72 overflow-auto p-4 text-xs leading-5"
                  style={{
                    color: "#8b949e",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <code>{JSON.stringify(normalized, null, 2)}</code>
                </pre>
              </motion.div>
            )}
          </AnimatePresence>

          {!jsonExpanded && (
            <div className="px-4 py-2">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Click to expand preview
              </p>
            </div>
          )}
        </div>

        {/* Question preview card */}
        {parsed.data.questions[0] && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-label mb-3" style={{ color: "var(--text-tertiary)" }}>
              First Question Preview
            </p>
            <div className="prose-lite">
              <MarkdownRenderer value={parsed.data.questions[0].prompt} />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
