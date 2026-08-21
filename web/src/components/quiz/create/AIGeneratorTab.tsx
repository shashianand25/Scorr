"use client";
import React from "react";

/** AI generator tab — source text input, file upload, settings, and generate button. */
export function AIGeneratorTab(s: { [key: string]: any }) {
  const {
    sourceText = "",
    setSourceText = () => {},
    selectedFile = null,
    setSelectedFile = () => {},
    fileBase64 = null,
    setFileBase64 = () => {},
    title = "",
    setTitle = () => {},
    category = "General",
    setCategory = () => {},
    questionCount = 10,
    setQuestionCount = () => {},
    useCustomCount = false,
    setUseCustomCount = () => {},
    customCount = "10",
    setCustomCount = () => {},
    includeFlashcards = true,
    setIncludeFlashcards = () => {},
    activeLang = "en",
    setActiveLang = () => {},
    isGenerating = false,
    charCount = 0,
    setCharCount = () => {},
    errorMsg = null,
    appConfig = null,
    handleGenerate = () => {},
    handleFileChange = () => {},
    t = (k: string) => k,
  } = s;

  return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* File Upload / Paste Card */}
          <div
            style={{
              background: "#0d111d",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "24px 20px",
              boxSizing: "border-box",
            }}
          >
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", marginBottom: 10 }}>
              1. Document Upload or Notes Paste
            </label>

            {/* Document Dropzone */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "28px 16px",
                border: "2px dashed rgba(99, 102, 241, 0.3)",
                borderRadius: 16,
                background: "rgba(99, 102, 241, 0.03)",
                cursor: "pointer",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt,.ppt,.pptx,image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
                {selectedFile ? `Selected: ${selectedFile.name}` : "Upload PDF, Slides, DOCX, or Images"}
              </div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>
                Click to browse files (Max 50MB)
              </div>
            </label>

            <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280", margin: "8px 0 12px" }}>
              — OR PASTE NOTES DIRECTLY —
            </div>

            <textarea
              placeholder="Paste lecture notes, study guide, or topic summary here..."
              value={sourceText.startsWith("[Document:") ? "" : sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
                setCharCount(e.target.value.length);
                setSelectedFile(null);
                setFileBase64(null);
              }}
              rows={5}
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "12px 16px",
                color: "#ffffff",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* AI Settings Card */}
          <div
            style={{
              background: "#0d111d",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              boxSizing: "border-box",
            }}
          >
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase" }}>
              2. Quiz Options & Language
            </label>

            <div>
              <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Quiz Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cellular Respiration & ATP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: "11px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Question Count Pills */}
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Question Count</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[5, 10, 15, 20, 25].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => { setQuestionCount(cnt); setUseCustomCount(false); }}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "none",
                      background: !useCustomCount && questionCount === cnt ? "#6366f1" : "rgba(255, 255, 255, 0.04)",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>

            {/* Flashcard Toggle */}
            <div
              onClick={() => setIncludeFlashcards(!includeFlashcards)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: 12,
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ color: "#ffffff", fontWeight: 600, fontSize: 14 }}>🃏 Include Flashcards</div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>Auto-generate spaced repetition flashcard deck</div>
              </div>
              <input
                type="checkbox"
                checked={includeFlashcards}
                onChange={() => {}}
                style={{ accentColor: "#6366f1", width: 18, height: 18 }}
              />
            </div>

            {/* Language Selector */}
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>Generation Language</label>
              <select
                value={activeLang}
                onChange={(e) => setActiveLang(e.target.value as any)}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 12,
                  padding: "11px 14px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="en" style={{ background: "#111827" }}>English</option>
                <option value="ru" style={{ background: "#111827" }}>Русский (Russian)</option>
                <option value="kk" style={{ background: "#111827" }}>Қазақша (Kazakh)</option>
                <option value="es" style={{ background: "#111827" }}>Español (Spanish)</option>
                <option value="fr" style={{ background: "#111827" }}>Français (French)</option>
                <option value="hi" style={{ background: "#111827" }}>हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!sourceText.trim() && !selectedFile)}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              border: "none",
              borderRadius: 14,
              padding: "16px",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              cursor: isGenerating || (!sourceText.trim() && !selectedFile) ? "not-allowed" : "pointer",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            }}
          >
            {isGenerating ? "Generating Quiz..." : "✨ Generate with AI"}
          </button>
        </div>
  );
}
