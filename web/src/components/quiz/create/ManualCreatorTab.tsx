"use client";
import React from "react";

/** Props passed from CreateQuizPage — all state needed by the manual tab. */
export interface ManualTabProps {
  [key: string]: any;
}

/** Manual quiz creator tab — step-by-step question drafting. */
export function ManualCreatorTab(s: ManualTabProps) {
  return (
    <div>
          {manualStep === "setup" ? (
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
          ) : (
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
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                    {t("create.draft_title") || "Draft Questions"}
                  </h3>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}>
                    Question {draftIndex + 1} of {draftQuestions.length}
                  </span>
                </div>

                <div style={{ height: 5, background: "rgba(255, 255, 255, 0.08)", borderRadius: 99, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${((draftIndex + 1) / draftQuestions.length) * 100}%`,
                      background: "#34d399",
                      borderRadius: 99,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>

              {/* Question Prompt */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>
                  {t("create.question_prompt") || "Question Prompt"}
                </label>
                <textarea
                  placeholder={t("create.question_placeholder") || "Enter your question prompt here..."}
                  value={draftQuestions[draftIndex]?.prompt || ""}
                  onChange={(e) => updateDraftPrompt(e.target.value)}
                  rows={3}
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
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Options */}
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 4 }}>
                  {t("create.options") || "Options / Choices"}
                </label>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 12px 0" }}>
                  Type answer texts below and select the radio button for the correct answer.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {(draftQuestions[draftIndex]?.answers || []).map((ans, optIdx) => (
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

                      {draftQuestions[draftIndex]?.answers.length > 2 && (
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

                {draftQuestions[draftIndex]?.answers.length < 6 && (
                  <button
                    type="button"
                    onClick={addDraftOption}
                    style={{
                      marginTop: 12,
                      background: "transparent",
                      border: "1px solid rgba(52, 211, 153, 0.3)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      color: "#34d399",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + {t("create.add_option") || "Add Option"}
                  </button>
                )}
              </div>

              {/* Navigation Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (draftIndex === 0) setManualStep("setup");
                    else setDraftIndex(draftIndex - 1);
                  }}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    padding: "14px",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {draftIndex === 0 ? "← Back to Setup" : "← Previous Q"}
                </button>

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
                      cursor: "pointer",
                    }}
                  >
                    Save & Create Quiz ✓
                  </button>
                )}
              </div>
            </div>
          )}
    </div>
  );
}
