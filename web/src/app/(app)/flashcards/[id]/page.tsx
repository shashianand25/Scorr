"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes } from "@/lib/api";
import type { Quiz, Flashcard } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`;
const flipFront = `@keyframes flipFront { from{transform:rotateY(0)} to{transform:rotateY(-180deg)} }`;
const flipBack = `@keyframes flipBack { from{transform:rotateY(180deg)} to{transform:rotateY(0)} }`;
const slideIn = `@keyframes slideIn { from{opacity:0;transform:translateX(30px)} to{opacity:1;transform:translateX(0)} }`;

function Spinner() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{spin}</style>
      <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#9ca3af", fontSize: 14 }}>Loading flashcards…</span>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardsPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideKey, setSlideKey] = useState(0);

  useEffect(() => {
    if (!user?.uid) return;
    fetchQuizzes(user.uid).then(({ quizzes }) => {
      const found = quizzes.find(q => q.id === id) ?? null;
      setQuiz(found);
      if (found?.flashcards?.length) setCards(found.flashcards);
      setLoading(false);
    });
  }, [user?.uid, id]);

  const handleFlip = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setIsFlipped(prev => !prev);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const goTo = (newIdx: number) => {
    if (newIdx < 0 || newIdx >= cards.length) return;
    setCurrentIdx(newIdx);
    setIsFlipped(false);
    setSlideKey(prev => prev + 1);
  };

  const handleShuffle = () => {
    setCards(shuffle(cards));
    setCurrentIdx(0);
    setIsFlipped(false);
    setSlideKey(prev => prev + 1);
  };

  if (loading) return (
    <div style={{ padding: "36px 40px", maxWidth: 760, margin: "0 auto" }}>
      <Spinner />
    </div>
  );

  if (!quiz || cards.length === 0) return (
    <div style={{ padding: "36px 40px", maxWidth: 760, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>No flashcards found</h2>
        <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20 }}>This quiz doesn't have any flashcards yet.</p>
        <Link href="/flashcards" style={{ color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>← Back to Flashcards</Link>
      </div>
    </div>
  );

  const card = cards[currentIdx];
  const progress = ((currentIdx + 1) / cards.length) * 100;

  return (
    <div style={{ padding: "36px 40px", maxWidth: 760, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}{slideIn}</style>
      <style>{`
        .card-scene { perspective: 1000px; }
        .card-inner { transform-style: preserve-3d; transition: transform 0.45s cubic-bezier(0.4,0,0.2,1); position: relative; }
        .card-inner.flipped { transform: rotateY(180deg); }
        .card-face { position: absolute; top: 0; left: 0; width: 100%; height: 100%; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; box-sizing: border-box; }
        .card-front { background: linear-gradient(135deg, #0f1420 0%, #111827 100%); border: 1px solid #1f2937; }
        .card-back { background: linear-gradient(135deg, #0d1f1a 0%, #0f2318 100%); border: 1px solid #10b98140; transform: rotateY(180deg); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, animation: "fadeIn 0.4s ease" }}>
        <Link href="/flashcards" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#9ca3af", textDecoration: "none", fontSize: 14 }}>← Back</Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#e5e7eb" }}>{quiz.title}</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>🃏 Flashcards</div>
        </div>
        <button onClick={handleShuffle} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #1f2937", background: "#0f1420", color: "#9ca3af", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1"; (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1f2937"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}>
          🔀 Shuffle
        </button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#6b7280" }}>Card {currentIdx + 1} of {cards.length}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6366f1" }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: "#1f2937", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Card */}
      <div key={slideKey} className="card-scene" style={{ height: 340, cursor: "pointer", animation: "slideIn 0.35s ease", marginBottom: 28 }} onClick={handleFlip}>
        <div className={`card-inner${isFlipped ? " flipped" : ""}`} style={{ width: "100%", height: "100%" }}>
          <div className="card-face card-front" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Question</div>
            <p style={{ fontSize: 20, fontWeight: 600, color: "#e5e7eb", textAlign: "center", margin: 0, lineHeight: 1.5 }}>{card.front}</p>
            <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#374151" }}>👆 Click to reveal answer</div>
          </div>
          <div className="card-face card-back" style={{ boxShadow: "0 20px 60px rgba(16,185,129,0.15)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 20 }}>Answer</div>
            <p style={{ fontSize: 19, fontWeight: 600, color: "#6ee7b7", textAlign: "center", margin: 0, lineHeight: 1.5 }}>{card.back}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "center" }}>
        <button
          onClick={() => goTo(currentIdx - 1)}
          disabled={currentIdx === 0}
          style={{ width: 48, height: 48, borderRadius: 14, border: "1px solid #1f2937", background: "#0f1420", color: currentIdx === 0 ? "#374151" : "#e5e7eb", fontSize: 20, cursor: currentIdx === 0 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
        >←</button>

        {/* Dot indicators */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {cards.map((_, i) => (
            <div key={i} onClick={() => goTo(i)} style={{ width: i === currentIdx ? 20 : 8, height: 8, borderRadius: 99, background: i === currentIdx ? "#6366f1" : "#1f2937", cursor: "pointer", transition: "all 0.2s" }} />
          )).slice(Math.max(0, currentIdx - 3), currentIdx + 4)}
        </div>

        <button
          onClick={() => goTo(currentIdx + 1)}
          disabled={currentIdx >= cards.length - 1}
          style={{ width: 48, height: 48, borderRadius: 14, border: "1px solid #1f2937", background: "#0f1420", color: currentIdx >= cards.length - 1 ? "#374151" : "#e5e7eb", fontSize: 20, cursor: currentIdx >= cards.length - 1 ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
        >→</button>
      </div>

      {currentIdx === cards.length - 1 && (
        <div style={{ textAlign: "center", marginTop: 28, padding: "20px", background: "#10b98110", border: "1px solid #10b98130", borderRadius: 16, animation: "fadeIn 0.5s ease" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#6ee7b7", marginBottom: 4 }}>Deck Complete!</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>You've gone through all {cards.length} cards</div>
          <button onClick={() => { setCurrentIdx(0); setIsFlipped(false); setSlideKey(k => k + 1); }} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
            🔄 Start Over
          </button>
        </div>
      )}
    </div>
  );
}
