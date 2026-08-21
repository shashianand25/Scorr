"use client";
import React from "react";

export interface ManualSetupStepProps {
  manualTitle: string;
  setManualTitle: (v: string) => void;
  manualCount: string;
  setManualCount: (v: string) => void;
  manualLanguage: string;
  setManualLanguage: (v: string) => void;
  handleProceedToDrafting: () => void;
  t: (k: string) => string;
}

export function ManualSetupStep({
  manualTitle,
  setManualTitle,
  manualCount,
  setManualCount,
  manualLanguage,
  setManualLanguage,
  handleProceedToDrafting,
  t,
}: ManualSetupStepProps) {
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
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: "0 0 4px 0" }}>
          {t("create.title") || "Create Quiz Manually"}
        </h3>
        <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
          {t("create.subtitle") || "Setup your custom MCQ quiz structure"}
        </p>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>
          {t("create.quiz_title") || "Quiz Title"}
        </label>
        <input
          type="text"
          placeholder="e.g. Advanced JavaScript Concepts"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "12px 16px",
            color: "#ffffff",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>
          {t("create.num_questions") || "Questions Count"}
        </label>
        <input
          type="number"
          placeholder="e.g. 5"
          value={manualCount}
          onChange={(e) => setManualCount(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "12px 16px",
            color: "#ffffff",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>
          {t("create.language") || "Language"}
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["English", "Spanish", "French", "Hindi", "Russian", "Kazakh"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setManualLanguage(lang)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: manualLanguage === lang ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.04)",
                color: manualLanguage === lang ? "#818cf8" : "#9ca3af",
                fontWeight: manualLanguage === lang ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleProceedToDrafting}
        style={{
          width: "100%",
          background: "linear-gradient(135deg, #6366f1, #4f46e5)",
          border: "none",
          borderRadius: 12,
          padding: "14px",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          marginTop: 8,
        }}
      >
        {t("create.next_btn") || "Next: Draft Questions →"}
      </button>
    </div>
  );
}
