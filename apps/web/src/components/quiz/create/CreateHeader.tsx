"use client";
import React from "react";
import type { CreateTab } from "../../../app/(app)/quiz/create/page";
import { tabContainerStyle, getTabButtonStyle } from "../../../styles/sharedStyles";

/** CreateHeader — page title and AI/Manual/Import tab chooser. */
export function CreateHeader({
  activeTab,
  setActiveTab,
  setErrorMsg,
  t,
}: {
  activeTab: CreateTab;
  setActiveTab: (t: CreateTab) => void;
  setErrorMsg: (m: string | null) => void;
  t: (k: string) => string;
}) {
  return (
    <header style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
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
      <div style={tabContainerStyle}>
        <button
          onClick={() => {
            setActiveTab("ai");
            setErrorMsg(null);
          }}
          style={getTabButtonStyle(activeTab === "ai")}
        >
          <span>✨</span>
          <span>AI Generator</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("manual");
            setErrorMsg(null);
          }}
          style={getTabButtonStyle(activeTab === "manual")}
        >
          <span>✍️</span>
          <span>Create Manually</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("import");
            setErrorMsg(null);
          }}
          style={getTabButtonStyle(activeTab === "import")}
        >
          <span>📁</span>
          <span>Import File</span>
        </button>
      </div>
    </header>
  );
}
