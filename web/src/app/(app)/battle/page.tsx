"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes, Quiz } from "@/lib/api";
import { createBattleRoom, joinBattleRoom } from "@/lib/multiplayer";

export default function BattleLobby() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isHosting, setIsHosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.uid) {
      fetchQuizzes(user.uid).then(({ quizzes }) => {
        setQuizzes(quizzes);
        setLoading(false);
      });
    }
  }, [user]);

  const handleHost = async () => {
    if (!selectedQuizId || !user) return;
    const quiz = quizzes.find(q => q.id === selectedQuizId);
    if (!quiz) return;

    setIsHosting(true);
    setError("");
    try {
      const roomCode = await createBattleRoom(
        quiz.id,
        quiz.title,
        quiz.questionsList.length,
        quiz.questionsList,
        user.uid,
        user.displayName || "Host",
        null
      );
      router.push(`/battle/${roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to create room");
      setIsHosting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode || !user) return;
    setIsJoining(true);
    setError("");
    try {
      const res = await joinBattleRoom(joinCode, user.uid, user.displayName || "Guest");
      if (res.success) {
        router.push(`/battle/${joinCode.toUpperCase().trim()}`);
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
    <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, background: "linear-gradient(to right, #6366f1, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Battle Arena ⚔️
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: 32 }}>Challenge your friends to real-time multiplayer quiz battles.</p>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: 16, borderRadius: 12, marginBottom: 24, border: "1px solid rgba(239, 68, 68, 0.3)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
        
        {/* HOST A MATCH */}
        <div style={{ background: "#111827", padding: 32, borderRadius: 24, border: "1px solid #1f2937", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>👑</span> Host a Match
          </h2>
          <p style={{ color: "#9ca3af", marginBottom: 24, fontSize: 14 }}>Select a quiz from your library to start a room and invite a friend.</p>
          
          <div style={{ flex: 1 }}>
            {loading ? (
              <div style={{ color: "#6b7280" }}>Loading library...</div>
            ) : quizzes.length === 0 ? (
              <div style={{ color: "#9ca3af", fontStyle: "italic", fontSize: 14 }}>You don't have any quizzes yet. Go to Create Quiz first.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <select
                  value={selectedQuizId}
                  onChange={(e) => setSelectedQuizId(e.target.value)}
                  style={{
                    width: "100%", padding: 16, borderRadius: 12, background: "#0f1420", color: "#fff", border: "1px solid #374151", fontSize: 16, outline: "none"
                  }}
                >
                  <option value="">Select a Quiz...</option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>{q.title} ({q.questionsList.length} Qs)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={handleHost}
            disabled={!selectedQuizId || isHosting}
            style={{
              marginTop: 24, width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: selectedQuizId ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#374151",
              color: selectedQuizId ? "#fff" : "#9ca3af", border: "none", cursor: selectedQuizId && !isHosting ? "pointer" : "not-allowed",
              transition: "transform 0.1s, filter 0.2s"
            }}
            onMouseOver={e => { if (selectedQuizId && !isHosting) e.currentTarget.style.filter = "brightness(1.1)" }}
            onMouseOut={e => e.currentTarget.style.filter = "none"}
            onMouseDown={e => { if (selectedQuizId && !isHosting) e.currentTarget.style.transform = "scale(0.98)" }}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {isHosting ? "Creating Room..." : "Host Room"}
          </button>
        </div>

        {/* JOIN A MATCH */}
        <div style={{ background: "#111827", padding: 32, borderRadius: 24, border: "1px solid #1f2937", display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>🤝</span> Join a Match
          </h2>
          <p style={{ color: "#9ca3af", marginBottom: 24, fontSize: 14 }}>Enter a 5-digit room code from a friend to join their game.</p>
          
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input
              type="text"
              placeholder="e.g. A3F9Z"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={5}
              style={{
                width: "100%", padding: 24, borderRadius: 16, background: "#0f1420", color: "#fff", border: "2px solid #374151",
                fontSize: 32, fontWeight: 800, textAlign: "center", letterSpacing: 4, outline: "none", textTransform: "uppercase",
              }}
              onFocus={e => e.currentTarget.style.borderColor = "#8b5cf6"}
              onBlur={e => e.currentTarget.style.borderColor = "#374151"}
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={joinCode.length !== 5 || isJoining}
            style={{
              marginTop: 24, width: "100%", padding: "16px 0", borderRadius: 12, fontSize: 16, fontWeight: 700,
              background: joinCode.length === 5 ? "linear-gradient(135deg, #10b981, #059669)" : "#374151",
              color: joinCode.length === 5 ? "#fff" : "#9ca3af", border: "none", cursor: joinCode.length === 5 && !isJoining ? "pointer" : "not-allowed",
              transition: "transform 0.1s, filter 0.2s"
            }}
            onMouseOver={e => { if (joinCode.length === 5 && !isJoining) e.currentTarget.style.filter = "brightness(1.1)" }}
            onMouseOut={e => e.currentTarget.style.filter = "none"}
            onMouseDown={e => { if (joinCode.length === 5 && !isJoining) e.currentTarget.style.transform = "scale(0.98)" }}
            onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
          >
            {isJoining ? "Joining..." : "Join Game"}
          </button>
        </div>

      </div>
    </div>
  );
}
