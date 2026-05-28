"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, ChevronRight, CheckCircle, AlertCircle, Sparkles, X } from "lucide-react";
import { parseQst } from "@/lib/qst/parser";
import type { QstParseResult } from "@/lib/qst/types";
import { toast } from "sonner";

interface UploadPanelProps {
  currentFile: { parsed: QstParseResult; fileName: string } | null;
  onLoaded: (parsed: QstParseResult, fileName: string) => void;
  onStart: () => void;
}

const SAMPLE_QST = `@title: Biology Quiz
@time_limit: 30
@category: Science

? Which organelle is the powerhouse of the cell?
+ Mitochondria
- Ribosome
- Golgi apparatus
- Chloroplast

? Select all prime numbers
+ 2
+ 3
- 4
- 9
+ 5

? The human body has how many bones?
- 150
- 250
+ 206
- 300

? DNA stands for?
+ Deoxyribonucleic acid
- Deoxyribose nucleic acid
- Diribonucleic acid
- Double nucleic acid

? Which gas do plants absorb from the atmosphere for photosynthesis?
+ Carbon dioxide
- Oxygen
- Nitrogen
- Hydrogen`;


export function UploadPanel({ currentFile, onLoaded, onStart }: UploadPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function processFile(file: File) {
    const validExt = /\.(txt|qst)$/i.test(file.name) || file.type === "text/plain";
    if (!validExt) {
      toast.error("Please upload a .qst or .txt file");
      return;
    }
    if (file.size > 10_000_000) {
      toast.error("File too large — maximum 10 MB");
      return;
    }
    setIsLoading(true);
    try {
      const text = await file.text();
      const parsed = parseQst(text);
      onLoaded(parsed, file.name);
      toast.success(`${file.name} loaded — ${parsed.data.questions.length} questions`);
    } catch {
      toast.error("Could not read file");
    } finally {
      setIsLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  }

  function loadSample() {
    const parsed = parseQst(SAMPLE_QST);
    onLoaded(parsed, "sample-biology-quiz.qst");
    toast.success("Sample quiz loaded — 5 questions");
  }

  const q = currentFile?.parsed.data.questions.length ?? 0;
  const title = currentFile?.parsed.data.metadata.title;
  const issues = (currentFile?.parsed.issues ?? []).filter(i => i.severity === "error");

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-xl"
      >
        {/* Header */}
        <div className="mb-10 text-center">
          <h1
            className="mb-2 text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.03em" }}
          >
            Start your quiz
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            Upload a QST or TXT quiz file to begin
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!currentFile ? (
            /* ── Empty / drop zone ── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
            >
              <label
                className="relative flex cursor-pointer flex-col items-center justify-center rounded-3xl px-8 py-16 text-center transition-all"
                style={{
                  background: isDragging
                    ? "rgba(0, 229, 160, 0.06)"
                    : "rgba(255,255,255,0.025)",
                  border: isDragging
                    ? "2px dashed rgba(0, 229, 160, 0.5)"
                    : "2px dashed rgba(255,255,255,0.12)",
                  boxShadow: isDragging ? "0 0 30px rgba(0,229,160,0.1)" : "none",
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                <input
                  type="file"
                  accept=".txt,.qst,text/plain"
                  onChange={onInputChange}
                  className="sr-only"
                />

                <motion.div
                  animate={isDragging ? { scale: 1.15 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="mb-5 grid size-16 place-items-center rounded-2xl"
                  style={{
                    background: isDragging
                      ? "rgba(0, 229, 160, 0.15)"
                      : "rgba(255,255,255,0.06)",
                    border: isDragging
                      ? "1px solid rgba(0, 229, 160, 0.3)"
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {isLoading ? (
                    <div
                      className="size-6 animate-spin rounded-full border-2"
                      style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
                    />
                  ) : (
                    <Upload
                      className="size-7"
                      style={{ color: isDragging ? "var(--accent-primary)" : "var(--text-secondary)" }}
                    />
                  )}
                </motion.div>

                <p
                  className="mb-1 text-base font-semibold"
                  style={{ color: isDragging ? "var(--accent-primary)" : "var(--text-primary)" }}
                >
                  {isDragging ? "Drop it here" : "Drop your quiz file here"}
                </p>
                <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                  .qst or .txt · up to 10 MB
                </p>

                <div
                  className="mt-6 rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:opacity-80"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--text-primary)",
                  }}
                >
                  Browse files
                </div>
              </label>

              {/* Try sample */}
              <div className="mt-4 text-center">
                <button
                  onClick={loadSample}
                  className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
                  style={{ color: "var(--accent-primary)" }}
                >
                  <Sparkles className="size-3.5" />
                  Try with sample quiz
                </button>
              </div>
            </motion.div>
          ) : (
            /* ── File loaded state ── */
            <motion.div
              key="loaded"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-4"
            >
              {/* File card */}
              <div
                className="relative overflow-hidden rounded-3xl p-6"
                style={{
                  background: "rgba(0, 229, 160, 0.05)",
                  border: "1px solid rgba(0, 229, 160, 0.2)",
                  boxShadow: "0 0 40px rgba(0,229,160,0.06)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(0,229,160,0.4), transparent)",
                  }}
                />

                <div className="flex items-start gap-4">
                  <div
                    className="grid size-12 shrink-0 place-items-center rounded-2xl"
                    style={{
                      background: "rgba(0, 229, 160, 0.12)",
                      border: "1px solid rgba(0, 229, 160, 0.25)",
                    }}
                  >
                    <FileText className="size-5" style={{ color: "var(--accent-primary)" }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-lg font-bold"
                      style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}
                    >
                      {title ?? currentFile.fileName.replace(/\.[^.]+$/, "")}
                    </p>
                    <p className="mt-0.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {currentFile.fileName}
                    </p>
                  </div>

                  {/* Clear file */}
                  <label
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-xl transition-colors hover:bg-white/5"
                    title="Upload different file"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <X className="size-4" />
                    <input
                      type="file"
                      accept=".txt,.qst,text/plain"
                      onChange={onInputChange}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Stats row */}
                <div className="mt-5 flex flex-wrap gap-3">
                  <div
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: "rgba(0, 229, 160, 0.08)",
                      border: "1px solid rgba(0, 229, 160, 0.15)",
                    }}
                  >
                    <CheckCircle className="size-3.5" style={{ color: "var(--accent-primary)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--accent-primary)" }}>
                      {q} question{q !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {currentFile.parsed.data.metadata.category && (
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {currentFile.parsed.data.metadata.category}
                      </span>
                    </div>
                  )}

                  {issues.length > 0 && (
                    <div
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{
                        background: "rgba(245, 158, 11, 0.08)",
                        border: "1px solid rgba(245, 158, 11, 0.2)",
                      }}
                    >
                      <AlertCircle className="size-3.5" style={{ color: "#f59e0b" }} />
                      <span className="text-sm" style={{ color: "#f59e0b" }}>
                        {issues.length} question{issues.length !== 1 ? "s" : ""} skipped
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <motion.button
                onClick={onStart}
                disabled={q === 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-base font-bold disabled:opacity-40"
                style={{
                  background: "var(--accent-primary)",
                  color: "#07090e",
                  boxShadow: "0 0 30px rgba(0, 229, 160, 0.3)",
                }}
              >
                Configure & start quiz
                <ChevronRight className="size-5" />
              </motion.button>

              {/* Upload different */}
              <div className="text-center">
                <label
                  className="inline-flex cursor-pointer items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Upload className="size-3.5" />
                  Upload a different file
                  <input
                    type="file"
                    accept=".txt,.qst,text/plain"
                    onChange={onInputChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
