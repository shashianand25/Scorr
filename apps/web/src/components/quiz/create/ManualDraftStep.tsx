"use client";
import React from "react";

export interface ManualDraftStepProps {
  draftIndex: number;
  draftQuestions: any[];
  setManualStep: (v: "setup" | "draft") => void;
  updateDraftPrompt: (text: string) => void;
  selectDraftOptionCorrect: (idx: number) => void;
  updateDraftOptionText: (idx: number, text: string) => void;
  deleteDraftOption: (idx: number) => void;
  addDraftOption: () => void;
  updateDraftExplanation: (text: string) => void;
  handlePrevDraftQuestion: () => void;
  handleNextDraftQuestion: () => void;
  handleSaveDraftedQuiz: () => void;
  isSaving: boolean;
}

export function ManualDraftStep({
  draftIndex,
  draftQuestions,
  setManualStep,
  updateDraftPrompt,
  selectDraftOptionCorrect,
  updateDraftOptionText,
  deleteDraftOption,
  addDraftOption,
  updateDraftExplanation,
  handlePrevDraftQuestion,
  handleNextDraftQuestion,
  handleSaveDraftedQuiz,
  isSaving,
}: ManualDraftStepProps) {
  const currentQ = draftQuestions[draftIndex];
  if (!currentQ) return null;

  return (
    <div
      style={{
        background: "#0d111d",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: 20,
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxSizing: "border-box",
      }}
    >
      {/* Header Progress */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc" }}>
            Drafting Question {draftIndex + 1} of {draftQuestions.length}
          </span>
          <button
            type="button"
            onClick={() => setManualStep("setup")}
            style={{
              background: "transparent",
              border: "none",
              color: "#9ca3af",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ← Back to Setup
          </button>
        </div>
        <div style={{ height: 4, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${((draftIndex + 1) / draftQuestions.length) * 100}%`,
              background: "#6366f1",
              transition: "width 0.2s ease",
            }}
          />
        </div>
      </div>

      {/* Question Prompt */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>
          Question Prompt
        </label>
        <textarea
          rows={3}
          placeholder="Type your question here..."
          value={currentQ.prompt || ""}
          onChange={(e) => updateDraftPrompt(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "12px 14px",
            color: "#ffffff",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
      </div>

      {/* Options */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>
          Answer Choices (Mark the radio circle for the correct answer)
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(currentQ.answers || []).map((ans: any, optIdx: number) => (
            <div key={ans.id || optIdx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => selectDraftOptionCorrect(optIdx)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: `2px solid ${ans.isCorrect ? "#34d399" : "rgba(255, 255, 255, 0.2)"}`,
                  background: ans.isCorrect ? "rgba(52, 211, 153, 0.2)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {ans.isCorrect && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#34d399" }} />}
              </button>

              <input
                type="text"
                placeholder={`Option ${optIdx + 1}`}
                value={ans.text}
                onChange={(e) => updateDraftOptionText(optIdx, e.target.value)}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#ffffff",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              {currentQ.answers.length > 2 && (
                <button
                  type="button"
                  onClick={() => deleteDraftOption(optIdx)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: "6px",
                  }}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>

        {currentQ.answers.length < 6 && (
          <button
            type="button"
            onClick={addDraftOption}
            style={{
              marginTop: 10,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px dashed rgba(255, 255, 255, 0.2)",
              borderRadius: 10,
              padding: "8px 14px",
              color: "#a5b4fc",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            + Add Another Option
          </button>
        )}
      </div>

      {/* Explanation */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>
          Explanation (Optional)
        </label>
        <input
          type="text"
          placeholder="Why is this answer correct?"
          value={currentQ.explanation || ""}
          onChange={(e) => updateDraftExplanation(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "#ffffff",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Navigation Controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        {draftIndex > 0 && (
          <button
            type="button"
            onClick={handlePrevDraftQuestion}
            style={{
              flex: 1,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              padding: "14px",
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Previous
          </button>
        )}

        {draftIndex < draftQuestions.length - 1 ? (
          <button
            type="button"
            onClick={handleNextDraftQuestion}
            style={{
              flex: 1,
              background: "#34d399",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              color: "#000000",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Next Question →
          </button>
        ) : (
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraftedQuiz}
            style={{
              flex: 1,
              background: "#34d399",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              color: "#000000",
              fontSize: 14,
              fontWeight: 800,
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? "Saving..." : "Save & Create Quiz ✓"}
          </button>
        )}
      </div>
    </div>
  );
}
