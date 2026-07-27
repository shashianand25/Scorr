"use client";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { listenToBattleRoom, updateBattleScore, markPlayerFinished, finishBattle, BattleRoom } from "@/lib/multiplayer";
import { saveBattleHistory } from "@/lib/api";

export default function BattleGame() {
  const { id } = useParams() as { id: string };
  const { user } = useAuthStore();
  const router = useRouter();

  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [error, setError] = useState("");
  
  // Game state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [hasFinished, setHasFinished] = useState(false);
  const [hasSavedHistory, setHasSavedHistory] = useState(false);

  const isHost = useMemo(() => user?.uid === room?.hostId, [user, room]);
  const isGuest = useMemo(() => user?.uid === room?.guestId, [user, room]);
  
  const myName = isHost ? room?.hostName : room?.guestName;
  const oppName = isHost ? room?.guestName : room?.hostName;
  const myScore = isHost ? room?.hostScore : room?.guestScore;
  const oppScore = isHost ? room?.guestScore : room?.hostScore;
  const myFinished = isHost ? room?.hostFinished : room?.guestFinished;
  const oppFinished = isHost ? room?.guestFinished : room?.hostFinished;

  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = listenToBattleRoom(id, (data) => {
      setRoom(data);
    });
    return () => unsubscribe();
  }, [id, user]);

  // Start time tracking
  useEffect(() => {
    if (room?.status === "playing" && startTime === 0) {
      setStartTime(Date.now());
    }
  }, [room?.status, startTime]);

  // Handle both finishing -> finish match (Host does it)
  useEffect(() => {
    if (isHost && room?.hostFinished && room?.guestFinished && room?.status === "playing") {
      finishBattle(id);
    }
  }, [isHost, room?.hostFinished, room?.guestFinished, room?.status, id]);

  // Save history when finished
  useEffect(() => {
    if (room?.status === "finished" && !hasSavedHistory && user) {
      setHasSavedHistory(true);
      const won = (myScore ?? 0) > (oppScore ?? 0);
      saveBattleHistory({
        userId: user.uid,
        roomCode: id,
        quizTitle: room.quizTitle,
        myScore: myScore ?? 0,
        opponentScore: oppScore ?? 0,
        opponentName: oppName || "Unknown",
        won
      }).catch(err => console.error("Failed to save history", err));
    }
  }, [room?.status, hasSavedHistory, user, id, room, myScore, oppScore, oppName]);

  if (!room) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "#9ca3af" }}>Loading match...</div>;
  }

  if (room.status === "waiting") {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>Waiting for Challenger</h1>
        <p style={{ color: "#9ca3af", marginBottom: 32 }}>Share this code with your friend to let them join.</p>
        
        <div style={{ background: "#111827", padding: "48px 32px", borderRadius: 24, border: "2px solid #374151" }}>
          <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 8, color: "#6366f1" }}>{id}</div>
        </div>

        <button onClick={() => router.push("/battle")} style={{ marginTop: 32, padding: "12px 24px", background: "transparent", color: "#9ca3af", border: "1px solid #374151", borderRadius: 12, cursor: "pointer" }}>
          Cancel Match
        </button>
      </div>
    );
  }

  const question = room.questions[currentIndex];

  const handleAnswer = (answerId: string, isCorrect: boolean) => {
    if (selectedAnswer || hasFinished) return;
    setSelectedAnswer(answerId);
    
    let newScore = score;
    if (isCorrect) {
      newScore += 1;
      setScore(newScore);
      updateBattleScore(id, isHost, newScore);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentIndex + 1 < room.questions.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setHasFinished(true);
        const timeTaken = Date.now() - startTime;
        markPlayerFinished(id, isHost, timeTaken);
      }
    }, 1000);
  };

  if (room.status === "finished" || (myFinished && oppFinished)) {
    const iWon = (myScore ?? 0) > (oppScore ?? 0);
    const draw = myScore === oppScore;
    
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 48, fontWeight: 900, marginBottom: 16, color: draw ? "#f59e0b" : iWon ? "#10b981" : "#ef4444" }}>
          {draw ? "IT'S A DRAW!" : iWon ? "YOU WON! 🎉" : "YOU LOST 😢"}
        </h1>
        
        <div style={{ background: "#111827", padding: 32, borderRadius: 24, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, border: "1px solid #1f2937" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 16, color: "#9ca3af", marginBottom: 8 }}>{myName} (You)</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#fff" }}>{myScore}</div>
          </div>
          <div style={{ fontSize: 24, color: "#4b5563", fontWeight: 900 }}>VS</div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 16, color: "#9ca3af", marginBottom: 8 }}>{oppName}</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: "#fff" }}>{oppScore}</div>
          </div>
        </div>

        <button onClick={() => router.push("/battle")} style={{ padding: "16px 32px", background: "#6366f1", color: "#fff", border: "none", borderRadius: 12, fontSize: 18, fontWeight: 700, cursor: "pointer" }}>
          Back to Arena
        </button>
      </div>
    );
  }

  if (hasFinished && !oppFinished) {
    return (
      <div style={{ padding: 32, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16 }}>You finished!</h1>
        <p style={{ color: "#9ca3af", marginBottom: 32 }}>Waiting for {oppName} to finish...</p>
        <div style={{ fontSize: 48, fontWeight: 900, color: "#6366f1" }}>{score} / {room.questionCount}</div>
      </div>
    );
  }

  if (!question) return null;

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: "0 auto" }}>
      {/* SCOREBOARD */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111827", padding: 16, borderRadius: 16, marginBottom: 32, border: "1px solid #1f2937" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
            {myName?.[0]?.toUpperCase() || "Y"}
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{myName} (You)</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{myScore}</div>
          </div>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: "#6b7280", background: "#1f2937", padding: "4px 12px", borderRadius: 16 }}>
          VS
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{oppName}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{oppScore}</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
            {oppName?.[0]?.toUpperCase() || "O"}
          </div>
        </div>
      </div>

      {/* PROGRESS */}
      <div style={{ marginBottom: 24, fontSize: 14, color: "#9ca3af", fontWeight: 600 }}>
        Question {currentIndex + 1} of {room.questionCount}
      </div>

      {/* QUESTION */}
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 32, lineHeight: 1.4 }}>
        {question.prompt}
      </h2>

      {/* ANSWERS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {question.answers.map((ans: any) => {
          let bgColor = "#1f2937";
          let borderColor = "#374151";
          
          if (selectedAnswer) {
            if (ans.isCorrect) {
              bgColor = "rgba(16, 185, 129, 0.2)";
              borderColor = "#10b981";
            } else if (selectedAnswer === ans.id && !ans.isCorrect) {
              bgColor = "rgba(239, 68, 68, 0.2)";
              borderColor = "#ef4444";
            }
          }

          return (
            <button
              key={ans.id}
              disabled={!!selectedAnswer}
              onClick={() => handleAnswer(ans.id, ans.isCorrect)}
              style={{
                width: "100%", textAlign: "left", padding: 20, borderRadius: 16,
                background: bgColor, border: `2px solid ${borderColor}`, color: "#fff",
                fontSize: 16, cursor: selectedAnswer ? "default" : "pointer",
                transition: "all 0.2s"
              }}
            >
              {ans.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
