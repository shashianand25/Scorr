"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes, fetchBattleHistory, BattleHistoryEvent } from "@/lib/api";
import { createBattleRoom, joinBattleRoom } from "@/lib/multiplayer";
import { getLocalItem, SAMPLE_QUIZ } from "@/lib/storage";
import { useTranslation } from "@/lib/i18n";
import type { QuizRecord } from "@/lib/quizDeduplication";

export default function BattleLobbyPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<QuizRecord[]>([]);
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isHosting, setIsHosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const local = getLocalItem<QuizRecord[]>("quizzes", [SAMPLE_QUIZ]);
    const withQuestions = local.filter((q) => Array.isArray(q.questionsList) && q.questionsList.length > 0);

    if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes: cloudQuizzes }) => {
        const combined = [...withQuestions];
        for (const cq of cloudQuizzes || []) {
          if (cq.questionsList && cq.questionsList.length > 0 && !combined.some((l) => l.id === cq.id)) {
            combined.push(cq as any);
          }
        }
        setQuizzes(combined);
        if (combined.length > 0) setSelectedQuizId(combined[0].id);
        setLoading(false);
      });

      fetchBattleHistory(user.uid).then(({ history }) => {
        setBattleHistory(history || []);
      });
    } else {
      setQuizzes(withQuestions);
      if (withQuestions.length > 0) setSelectedQuizId(withQuestions[0].id);
      setLoading(false);
    }
  }, [user]);

  // ── Host Room ──────────────────────────────────────────────────────────
  const handleHost = async () => {
    if (!selectedQuizId) {
      setError("Please select a quiz to battle with.");
      return;
    }

    const quiz = quizzes.find((q) => q.id === selectedQuizId);
    if (!quiz || !quiz.questionsList || quiz.questionsList.length === 0) {
      setError("Selected quiz has no questions.");
      return;
    }

    setIsHosting(true);
    setError("");

    const hostUid = user?.uid || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const hostDisplayName = user?.displayName || guestName.trim() || "Host";

    try {
      const roomCode = await createBattleRoom(
        quiz.id,
        quiz.title,
        quiz.questionsList.length,
        quiz.questionsList,
        hostUid,
        hostDisplayName,
        null
      );
      router.push(`/battle/${roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to create room");
      setIsHosting(false);
    }
  };

  // ── Join Room ──────────────────────────────────────────────────────────
  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Please enter a room code.");
      return;
    }

    setIsJoining(true);
    setError("");

    const guestUid = user?.uid || `guest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const guestDisplayName = user?.displayName || guestName.trim() || "Challenger";

    try {
      const res = await joinBattleRoom(code, guestUid, guestDisplayName);
      if (res.success) {
        router.push(`/battle/${code}`);
      } else {
        setError(res.error || "Failed to join room");
        setIsJoining(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to join room");
      setIsJoining(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px 16px 80px",
        maxWidth: 960,
        margin: "0 auto",
        fontFamily: "'Inter', sans-serif",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #f43f5e, #e11d48)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              boxShadow: "0 8px 24px rgba(244, 63, 94, 0.35)",
              flexShrink: 0,
            }}
          >
            ⚔️
          </div>
          <div>
            <h1 style={{ fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", margin: 0 }}>
              {t("battle.title") || "Battle Arena"}
            </h1>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "3px 0 0" }}>
              {t("battle.subtitle") || "Challenge friends to real-time 1v1 quiz clashes"}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 14,
            padding: "14px 18px",
            color: "#f87171",
            fontSize: 14,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Guest Name Input (if not logged in) */}
      {!user && (
        <div
          style={{
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 18,
            padding: "18px 24px",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#a5b4fc" }}>Your Player Tag:</span>
          <input
            type="text"
            placeholder="e.g. MasterQuizzer"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            style={{
              flex: 1,
              minWidth: 180,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              padding: "8px 14px",
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      )}

      {/* Dual Column Arena: Host vs Join */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, marginBottom: 40 }}>
        {/* HOST MATCH */}
        <div
          style={{
            background: "#0d111d",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            borderRadius: 24,
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>👑</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                {t("battle.host_battle") || "Host a Battle"}
              </h2>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 20px 0", lineHeight: 1.5 }}>
              {t("battle.host_desc") || "Pick a quiz from your library to generate a 5-character battle room code."}
            </p>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", marginBottom: 8 }}>
              Select Quiz
            </label>
            {loading ? (
              <div style={{ color: "#6b7280", fontSize: 14 }}>Loading library...</div>
            ) : quizzes.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>No quizzes in library. Create one first!</div>
            ) : (
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  color: "#ffffff",
                  fontSize: 14,
                  outline: "none",
                  marginBottom: 24,
                  cursor: "pointer",
                }}
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id} style={{ background: "#111827" }}>
                    {q.title} ({q.questionsList?.length || q.questions} questions)
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleHost}
            disabled={isHosting || quizzes.length === 0}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              border: "none",
              borderRadius: 14,
              padding: "16px",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              cursor: isHosting || quizzes.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            }}
          >
            {isHosting ? "Creating Room..." : "⚔️ Create Battle Room"}
          </button>
        </div>

        {/* JOIN MATCH */}
        <div
          style={{
            background: "#0d111d",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            borderRadius: 24,
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 24 }}>🎯</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                {t("battle.join_battle") || "Join a Battle"}
              </h2>
            </div>
            <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 20px 0", lineHeight: 1.5 }}>
              {t("battle.join_desc") || "Enter your opponent's 5-character room code to join their live match."}
            </p>

            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#f87171", textTransform: "uppercase", marginBottom: 8 }}>
              Room Code
            </label>
            <input
              type="text"
              placeholder="e.g. 7K4PX"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 14,
                padding: "14px 18px",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "4px",
                textAlign: "center",
                outline: "none",
                marginBottom: 24,
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={isJoining || !joinCode}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #f43f5e, #e11d48)",
              border: "none",
              borderRadius: 14,
              padding: "16px",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              cursor: isJoining || !joinCode ? "not-allowed" : "pointer",
              boxShadow: "0 8px 24px rgba(244, 63, 94, 0.35)",
            }}
          >
            {isJoining ? "Joining Room..." : "⚡ Enter Arena"}
          </button>
        </div>
      </div>

      {/* Battle Match History */}
      {battleHistory.length > 0 && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ffffff", marginBottom: 16 }}>
            📜 Recent Battle Clashes
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {battleHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#0d111d",
                  border: `1px solid ${item.won ? "rgba(52, 211, 153, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                  borderRadius: 16,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                    {item.quiz_title}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: 13 }}>
                    vs <span style={{ color: "#e5e7eb", fontWeight: 600 }}>{item.opponent_name}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: item.won ? "#34d399" : "#f87171" }}>
                      {item.won ? "🏆 Victory" : "💀 Defeat"}
                    </div>
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>
                      {item.my_score} - {item.opponent_score} pts
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
