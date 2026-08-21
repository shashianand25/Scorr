"use client";
import React from "react";
import type { CreateTab } from "../../../app/(app)/quiz/create/page";

/** CreateHeader — page title and AI/Manual/Import tab chooser. */
export function CreateHeader({
  activeTab, setActiveTab, setErrorMsg, t,
}: { activeTab: CreateTab; setActiveTab: (t: CreateTab) => void; setErrorMsg: (m: string | null) => void; t: (k: string) => string }) {
  return (
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h1
              style={{
                fontSize: "clamp(20px, 5vw, 28px)",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.6px",
              }}
            >
              {t("tabs.create") || "Create & Import"}
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "3px 0 0" }}>
              Generate with AI, write your own questions manually, or import study sets.
            </p>
          </div>
        </div>

        {/* 3 Creation Mode Tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            padding: 4,
            overflowX: "auto",
          }}
        >
          <button
            onClick={() => { setActiveTab("ai"); setErrorMsg(null); }}
            style={{
              flex: 1,
              minWidth: 120,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: activeTab === "ai" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "ai" ? "#ffffff" : "#9ca3af",
              fontWeight: activeTab === "ai" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span>✨</span>
            <span>AI Generator</span>
          </button>

          <button
            onClick={() => { setActiveTab("manual"); setErrorMsg(null); }}
            style={{
              flex: 1,
              minWidth: 120,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: activeTab === "manual" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "manual" ? "#ffffff" : "#9ca3af",
              fontWeight: activeTab === "manual" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span>✍️</span>
            <span>Create Manually</span>
          </button>

          <button
            onClick={() => { setActiveTab("import"); setErrorMsg(null); }}
            style={{
              flex: 1,
              minWidth: 120,
              padding: "10px 14px",
              borderRadius: 10,
              border: "none",
              background: activeTab === "import" ? "rgba(99, 102, 241, 0.2)" : "transparent",
              color: activeTab === "import" ? "#ffffff" : "#9ca3af",
              fontWeight: activeTab === "import" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span>📁</span>
            <span>Import File</span>
          </button>
        </div>
      </header>
  );
}
