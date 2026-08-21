"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/components/ui/ToastPill";
import {
  listenToBattleRoom,
  updateBattleScore,
  markPlayerFinished,
  finishBattle,
  BattleRoom,
} from "@/lib/multiplayer";
import { saveBattleHistory } from "@/lib/api";
import { renderFormattedText } from "@/lib/qstParser";

export default function BattleGamePage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const router = useRouter();
  const { showToast } = useToast();

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [hasSavedHistory, setHasSavedHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const isHost = useMemo(
    () => Boolean(user?.uid === room?.hostId || (!user && room?.hostId?.startsWith("guest_"))),
    [user, room]
  );

  const myName = isHost ? room?.hostName : room?.guestName;
  const oppName = isHost ? room?.guestName : room?.hostName;
  const myScore = isHost ? room?.hostScore : room?.guestScore;
  const oppScore = isHost ? room?.guestScore : room?.hostScore;
  const myFinished = isHost ? room?.hostFinished : room?.guestFinished;
  const oppFinished = isHost ? room?.guestFinished : room?.hostFinished;

  useEffect(() => {
    if (!id) return;
    const unsubscribe = listenToBattleRoom(id, (data) => {
      setRoom(data);
    });
    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (room?.status === "playing" && startTime === 0) {
      setStartTime(Date.now());
    }
  }, [room?.status, startTime]);

  // Host auto-finishes room when both players finish
  useEffect(() => {
    if (isHost && room?.hostFinished && room?.guestFinished && room?.status === "playing") {
      finishBattle(id);
    }
  }, [isHost, room?.hostFinished, room?.guestFinished, room?.status, id]);

  // Save history on finish
  useEffect(() => {
    if (room?.status === "finished" && !hasSavedHistory && user?.uid) {
      setHasSavedHistory(true);
      const won = (myScore ?? 0) > (oppScore ?? 0);
      saveBattleHistory({
        userId: user.uid,
        roomCode: id,
        quizTitle: room.quizTitle,
        myScore: myScore ?? 0,
        opponentScore: oppScore ?? 0,
        opponentName: oppName || "Opponent",
        won,
      }).catch((err) => console.error("Failed to save battle history:", err));
    }
  }, [room?.status, hasSavedHistory, user?.uid, id, room, myScore, oppScore, oppName]);

  const handleCopyCode = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(id);
      setCopied(true);
      showToast("Room code copied to clipboard!", { icon: "📋" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!room) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
        <div style={{ width: 40, height: 40, border: "3px solid #1f2937", borderTop: "3px solid #f43f5e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  // ── LOBBY WAITING SCREEN ───────────────────────────────────────────────
  if (room.status === "waiting") {
    return (
      <div style={{ padding: "60px 24px", maxWidth: 580, margin: "0 auto", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(244, 63, 94, 0.15)", border: "1px solid rgba(244, 63, 94, 0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>
          ⚔️
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", margin: "0 0 8px 0" }}>
          Waiting for Challenger
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 32px 0" }}>
          Share this 5-character code with your friend to start the clash.
        </p>

        {/* Code Display Card */}
        <div
          style={{
            background: "#0d111d",
            border: "2px dashed rgba(244, 63, 94, 0.4)",
            borderRadius: 24,
            padding: "36px 24px",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: 8, color: "#f43f5e", fontFamily: "monospace" }}>
            {id}
          </div>
          <button
            onClick={handleCopyCode}
            style={{
              marginTop: 16,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 10,
              padding: "8px 18px",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copied ? "✓ Copied!" : "📋 Copy Code"}
          </button>
        </div>

        <button
          onClick={() => router.push("/battle")}
          style={{
            background: "transparent",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: 12,
            padding: "10px 24px",
            color: "#9ca3af",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Cancel Match
        </button>
      </div>
    );
  }

  const question = room.questions[currentIndex];
  const totalQuestions = room.questions.length;

  const handleAnswer = (ansId: string, isCorrect: boolean) => {
    if (selectedAnswerId || hasFinished) return;
    setSelectedAnswerId(ansId);

    let newScore = score;
    if (isCorrect) {
      newScore += 100;
      setScore(newScore);
      updateBattleScore(id, isHost, newScore);
    }

    setTimeout(() => {
      if (currentIndex + 1 < totalQuestions) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswerId(null);
      } else {
        setHasFinished(true);
        const timeTaken = Date.now() - startTime;
        markPlayerFinished(id, isHost, timeTaken);
      }
    }, 600);
  };

  // ── GAME FINISHED SCREEN ───────────────────────────────────────────────
  if (room.status === "finished" || (myFinished && oppFinished)) {
    const isWinner = (myScore ?? 0) > (oppScore ?? 0);
    const isTie = myScore === oppScore;

    return (
      <div style={{ padding: "60px 24px", maxWidth: 620, margin: "0 auto", textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
        <div
          style={{
            background: "#0d111d",
            border: `1px solid ${isWinner ? "rgba(52, 211, 153, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            borderRadius: 28,
            padding: "48px 32px",
            boxShadow: "0 24px 64px rgba(0, 0, 0, 0.6)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {isWinner ? "🏆" : isTie ? "🤝" : "💀"}
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#ffffff", margin: "0 0 8px 0" }}>
            {isWinner ? "Victory!" : isTie ? "Draw Game!" : "Defeat"}
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 15, margin: "0 0 32px 0" }}>
            {isWinner
              ? `You defeated ${oppName || "your challenger"}!`
              : isTie
              ? "Both players matched with equal score."
              : `${oppName || "Challenger"} took the victory this round.`}
          </p>

          {/* Score Comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 18, padding: "20px" }}>
              <div style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 700, marginBottom: 4 }}>YOU</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#ffffff" }}>{myScore ?? 0}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 18, padding: "20px" }}>
              <div style={{ fontSize: 13, color: "#f87171", fontWeight: 700, marginBottom: 4 }}>{oppName || "OPPONENT"}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#ffffff" }}>{oppScore ?? 0}</div>
            </div>
          </div>

          <Link
            href="/battle"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: 14,
              padding: "16px 36px",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            ⚔️ Back to Arena
          </Link>
        </div>
      </div>
    );
  }

  // ── WAITING FOR OPPONENT TO FINISH ─────────────────────────────────────
  if (myFinished && !oppFinished) {
    return (
      <div style={{ padding: "80px 24px", maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #34d399", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 24px" }} />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
          You Finished! ({myScore} pts)
        </h2>
        <p style={{ color: "#9ca3af", fontSize: 14 }}>
          Waiting for {oppName || "opponent"} to answer their remaining questions…
        </p>
      </div>
    );
  }

  // ── ACTIVE BATTLE QUESTION RUNNER ──────────────────────────────────────
  return (
    <div style={{ padding: "36px 20px 80px", maxWidth: 840, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      {/* Dual Scoreboard Header */}
      <div
        style={{
          background: "#0d111d",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 20,
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase" }}>
            {myName || "You"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#34d399" }}>
            {myScore ?? 0} pts
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: "#6b7280" }}>VS</div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", textTransform: "uppercase" }}>
            {oppName || "Opponent"}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f87171" }}>
            {oppScore ?? 0} pts
          </div>
        </div>
      </div>

      {/* Question Card */}
      {question && (
        <div
          style={{
            background: "#0d111d",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 24,
            padding: "32px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 700, marginBottom: 12 }}>
            Question {currentIndex + 1} of {totalQuestions}
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", lineHeight: 1.5, margin: "0 0 24px 0" }}>
            {renderFormattedText(question.prompt || question.question || "")}
          </h2>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(question.answers || []).map((ans: any, idx: number) => {
              const isSelected = selectedAnswerId === (ans.id || `a_${idx}`);
              const isCorrect = ans.isCorrect;

              let cardBg = "rgba(255, 255, 255, 0.03)";
              let borderColor = "rgba(255, 255, 255, 0.08)";

              if (selectedAnswerId) {
                if (isCorrect) {
                  cardBg = "rgba(16, 185, 129, 0.15)";
                  borderColor = "#10b981";
                } else if (isSelected && !isCorrect) {
                  cardBg = "rgba(239, 68, 68, 0.15)";
                  borderColor = "#ef4444";
                }
              }

              return (
                <button
                  key={ans.id || idx}
                  type="button"
                  disabled={Boolean(selectedAnswerId)}
                  onClick={() => handleAnswer(ans.id || `a_${idx}`, isCorrect)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "16px 18px",
                    borderRadius: 16,
                    background: cardBg,
                    border: `1px solid ${borderColor}`,
                    cursor: selectedAnswerId ? "default" : "pointer",
                    textAlign: "left",
                    color: "#ffffff",
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                >
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                    {["A", "B", "C", "D"][idx] || idx + 1}
                  </span>
                  <span>{ans.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
