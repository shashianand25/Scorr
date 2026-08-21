"use client";
import React from "react";

/** Import file tab — .qst/.txt file import. */
export function ImportFileTab(s: { [key: string]: any }) {
  const { onImport, handleImportFile = onImport } = s;
  return (
        <div
          style={{
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: "36px 24px",
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>📁</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", margin: "0 0 6px 0" }}>
            Import QST or Text Quiz File
          </h3>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 24px 0", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            Upload any existing .qst or structured text quiz file to import questions and flashcards directly into your library.
          </p>

          <label
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: 12,
              padding: "14px 28px",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <input
              type="file"
              accept=".qst,.txt"
              onChange={handleImportFile}
              style={{ display: "none" }}
            />
            Select .qst / .txt File
          </label>
        </div>
  );
}
