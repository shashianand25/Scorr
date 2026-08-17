"use client";

import React, { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";

interface AIGenerationModalProps {
  isOpen: boolean;
  documentCharCount?: number;
  onCancel: () => void;
}

const STATUS_MESSAGES = [
  "Reading through your document carefully…",
  "Extracting core concepts & formulas…",
  "Crafting high-yield multiple-choice questions…",
  "Building memory flashcards…",
  "Adding detailed explanations…",
  "Polishing study deck for maximum retention…",
];

export default function AIGenerationModal({
  isOpen,
  documentCharCount = 0,
  onCancel,
}: AIGenerationModalProps) {
  const { t } = useTranslation();
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(12);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(12);
      setMsgIndex(0);
      setShowCancelConfirm(false);
      return;
    }

    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2800);

    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        const increment = Math.max(1, Math.floor((92 - prev) * 0.12));
        return Math.min(92, prev + increment);
      });
    }, 800);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(11, 15, 26, 0.96)",
        backdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
        @keyframes pulseAura {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      {/* Background Radial Glow */}
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.25), transparent 70%)",
          animation: "pulseAura 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          maxWidth: "440px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Animated Card Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "24px",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.25))",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 16px 40px rgba(99, 102, 241, 0.35)",
            animation: "floatCard 4s ease-in-out infinite",
            marginBottom: "28px",
          }}
        >
          <span style={{ fontSize: "36px" }}>⚡</span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "24px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.5px",
            margin: "0 0 10px 0",
          }}
        >
          {t("home.generating_title")}
        </h2>

        {/* Dynamic Status Message */}
        <p
          style={{
            fontSize: "14px",
            color: "#a5b4fc",
            minHeight: "22px",
            margin: "0 0 24px 0",
            fontWeight: 500,
            transition: "all 0.3s ease",
          }}
        >
          {STATUS_MESSAGES[msgIndex]}
        </p>

        {/* Progress Bar Container */}
        <div
          style={{
            width: "100%",
            height: "8px",
            background: "rgba(255, 255, 255, 0.08)",
            borderRadius: "99px",
            overflow: "hidden",
            position: "relative",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "linear-gradient(90deg, #6366f1, #34d399)",
              borderRadius: "99px",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* Document Stats Pill */}
        {documentCharCount > 0 && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "100px",
              padding: "4px 12px",
              fontSize: "12px",
              color: "#9ca3af",
              marginBottom: "32px",
            }}
          >
            <span>📄</span>
            <span>~{documentCharCount.toLocaleString()} characters</span>
          </div>
        )}

        {/* Cancel Button */}
        {!showCancelConfirm ? (
          <button
            onClick={() => setShowCancelConfirm(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              padding: "10px 24px",
              color: "#9ca3af",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.4)";
              e.currentTarget.style.color = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            ✕ {t("common.cancel")}
          </button>
        ) : (
          <div
            style={{
              background: "rgba(17, 24, 39, 0.9)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "18px",
              padding: "20px",
              width: "100%",
              boxShadow: "0 12px 32px rgba(0, 0, 0, 0.5)",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h4
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#ffffff",
                margin: "0 0 6px 0",
              }}
            >
              {t("generation.cancel_title")}
            </h4>
            <p
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                margin: "0 0 16px 0",
                lineHeight: "18px",
              }}
            >
              {t("generation.cancel_desc")}
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowCancelConfirm(false)}
                style={{
                  flex: 1,
                  background: "#6366f1",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("generation.keep_waiting")}
              </button>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "10px",
                  padding: "10px",
                  color: "#ef4444",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("generation.stop_generation")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
