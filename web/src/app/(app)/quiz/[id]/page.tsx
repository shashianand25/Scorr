"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes, saveQuizHistory, updateQuiz } from "@/lib/api";
import type { Quiz, Question, WrongQuestion } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`;
const pop = `@keyframes pop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }`;
const shake = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }`;

type Phase = "options" | "playing" | "results";

function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{spin}</style>
      <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#9ca3af", fontSize: 14 }}>{label}</span>
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

export default function QuizPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("options");

  // Options
  const [shuffleQ, setShuffleQ] = useState(false);
  const [wrongOnly, setWrongOnly] = useState(false);

  // Playing state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [wrongAnswered, setWrongAnswered] = useState<WrongQuestion[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [answerShake, setAnswerShake] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    fetchQuizzes(user.uid).then(({ quizzes }) => {
      const found = quizzes.find(q => q.id === id) ?? null;
      setQuiz(found);
      setLoading(false);
    });
  }, [user?.uid, id]);

  const startQuiz = () => {
    if (!quiz) return;
    let qs = quiz.questionsList ?? [];
    if (wrongOnly) {
      const wrongIds = new Set((quiz.wrongQuestions ?? []).map(w => w.id));
      qs = qs.filter(q => wrongIds.has(q.id));
    }
    if (qs.length === 0) qs = quiz.questionsList ?? [];
    if (shuffleQ) qs = shuffle(qs);
    setQuestions(qs);
    setCurrentIdx(0);
    setSelected(null);
    setAnswered(false);
    setWrongAnswered([]);
    setCorrectCount(0);
    setStartTime(Date.now());
    setPhase("playing");
  };

  const handleAnswer = (answerId: string) => {
    if (answered) return;
    const q = questions[currentIdx];
    const correctAns = q.answers.find(a => a.isCorrect);
    const isCorrect = correctAns?.id === answerId;

    setSelected(answerId);
    setAnswered(true);

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    } else {
      setAnswerShake(true);
      setTimeout(() => setAnswerShake(false), 500);
      const selectedText = q.answers.find(a => a.id === answerId)?.text ?? "";
      setWrongAnswered(prev => [...prev, {
        id: q.id,
        prompt: q.prompt,
        selectedTexts: [selectedText],
        correctTexts: [correctAns?.text ?? ""],
      }]);
    }
  };

  const handleNext = async () => {
    if (currentIdx + 1 >= questions.length) {
      // Finish
      const duration = Math.round((Date.now() - startTime) / 1000);
      const score = Math.round((correctCount / questions.length) * 100);
      const wrong = questions.length - correctCount;

      if (user?.uid && quiz) {
        // Save history
        await saveQuizHistory({
          userId: user.uid,
          quizTitle: quiz.title,
          totalQuestions: questions.length,
          correct: correctCount,
          wrong,
          score,
          durationSec: duration,
          wrongQuestions: wrongAnswered,
        });

        // Update quiz record
        const newAttempt = { date: Date.now(), score, correct: correctCount, total: questions.length, durationSec: duration };
        const prevAttempts = quiz.attempts ?? [];
        const prevUniqueCorrect = new Set(quiz.uniqueCorrectIds ?? []);
        questions.forEach((q, i) => {
          const correct = wrongAnswered.find(w => w.id === q.id) == null;
          if (correct) prevUniqueCorrect.add(q.id);
        });

        await updateQuiz({
          userId: user.uid,
          quizId: quiz.id,
          attempts: [...prevAttempts, newAttempt],
          wrongQuestions: wrongAnswered,
          uniqueCorrectIds: Array.from(prevUniqueCorrect),
        });
      }

      setPhase("results");
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (loading) return (
    <div style={{ padding: "36px 40px", maxWidth: 760, margin: "0 auto" }}>
      <Spinner label="Loading quiz…" />
    </div>
  );

  if (!quiz) return (
    <div style={{ padding: "36px 40px", maxWidth: 760, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Quiz not found</h2>
        <Link href="/library" style={{ color: "#6366f1", textDecoration: "none" }}>← Back to Library</Link>
      </div>
    </div>
  );

  // ── OPTIONS SCREEN ──
  if (phase === "options") {
    const total = quiz.questionsList?.length || 0;
    const wrongCount = quiz.wrongQuestions?.length || 0;
    return (
      <div style={{ padding: "36px 40px", maxWidth: 680, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
        <style>{spin}{fadeIn}{pop}</style>
        <Link href="/library" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#9ca3af", textDecoration: "none", fontSize: 14, marginBottom: 28 }}>← Back to Library</Link>

        <div style={{ background: "linear-gradient(135deg, #6366f115, #8b5cf610)", border: "1px solid #6366f130", borderRadius: 20, padding: 32, marginBottom: 28, animation: "fadeIn 0.4s ease" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.5px" }}>{quiz.title}</h1>
          {quiz.category && <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 99, background: "#6366f115", color: "#a5b4fc", fontSize: 12, fontWeight: 600 }}>{quiz.category}</span>}
          <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{total}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Questions</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{quiz.attempts?.length || 0}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Attempts</div>
            </div>
            {quiz.attempts?.length > 0 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{Math.max(...quiz.attempts.map(a => a.score))}%</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Best Score</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.5s ease 0.1s both" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Options</h2>

          {[
            { label: "🔀 Shuffle Questions", desc: "Randomize question order", value: shuffleQ, set: setShuffleQ },
            { label: "❌ Wrong Questions Only", desc: `Focus on ${wrongCount} questions you got wrong`, value: wrongOnly, set: setWrongOnly, disabled: wrongCount === 0 },
          ].map(opt => (
            <div key={opt.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#0f1420", border: "1px solid #1f2937", borderRadius: 14, opacity: opt.disabled ? 0.5 : 1 }}>
              <div onClick={() => !opt.disabled && opt.set(!opt.value)} style={{ width: 48, height: 28, borderRadius: 99, background: opt.value ? "#6366f1" : "#374151", position: "relative", cursor: opt.disabled ? "default" : "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 3, left: opt.value ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={startQuiz}
          style={{ width: "100%", marginTop: 28, padding: "16px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "all 0.2s", animation: "fadeIn 0.5s ease 0.2s both" }}
          onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 8px 28px rgba(99,102,241,0.5)"; }}
          onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.transform = "translateY(0)"; el.style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)"; }}
        >
          🚀 Start Quiz
        </button>
      </div>
    );
  }

  // ── PLAYING SCREEN ──
  if (phase === "playing") {
    const q = questions[currentIdx];
    const correctAns = q.answers.find(a => a.isCorrect);
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
      <div style={{ padding: "36px 40px", maxWidth: 720, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
        <style>{spin}{fadeIn}{pop}{shake}</style>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button onClick={() => setPhase("options")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 14, fontFamily: "'Inter', sans-serif" }}>✕ Quit</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af" }}>
            {currentIdx + 1} <span style={{ color: "#4b5563" }}>/ {questions.length}</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>✓ {correctCount}</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: "#1f2937", borderRadius: 99, marginBottom: 28, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.4s ease" }} />
        </div>

        {/* Question */}
        <div style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 20, padding: "28px 32px", marginBottom: 20, animation: "fadeIn 0.3s ease" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Question {currentIdx + 1}</div>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#e5e7eb", margin: 0, lineHeight: 1.5 }}>{q.prompt}</p>
        </div>

        {/* Answers */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {q.answers.map(a => {
            const isSelected = selected === a.id;
            const isCorrect = a.isCorrect;
            let bg = "#0f1420";
            let border = "#1f2937";
            let color = "#e5e7eb";
            let glow = "none";

            if (answered) {
              if (isCorrect) { bg = "#10b98115"; border = "#10b981"; color = "#6ee7b7"; glow = "0 0 20px rgba(16,185,129,0.2)"; }
              else if (isSelected && !isCorrect) { bg = "#7f1d1d20"; border = "#ef4444"; color = "#fca5a5"; }
              else { bg = "#0f1420"; border = "#111827"; color = "#4b5563"; }
            }

            return (
              <button
                key={a.id}
                onClick={() => handleAnswer(a.id)}
                disabled={answered}
                style={{
                  width: "100%", padding: "14px 18px", borderRadius: 12, border: `1px solid ${border}`,
                  background: bg, color, fontSize: 15, fontWeight: 500, cursor: answered ? "default" : "pointer",
                  textAlign: "left", fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                  boxShadow: glow,
                  animation: answered && isSelected && !isCorrect ? "shake 0.4s ease" : undefined,
                }}
                onMouseEnter={e => { if (!answered) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#6366f1"; (e.currentTarget as HTMLButtonElement).style.background = "#6366f110"; }}}
                onMouseLeave={e => { if (!answered) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1f2937"; (e.currentTarget as HTMLButtonElement).style.background = "#0f1420"; }}}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {answered && isCorrect && <span>✓</span>}
                  {answered && isSelected && !isCorrect && <span>✗</span>}
                  {a.text}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next button */}
        {answered && (
          <button
            onClick={handleNext}
            style={{ width: "100%", marginTop: 20, padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", animation: "fadeIn 0.3s ease", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}
          >
            {currentIdx + 1 >= questions.length ? "🏁 See Results" : "Next Question →"}
          </button>
        )}
      </div>
    );
  }

  // ── RESULTS SCREEN ──
  const score = Math.round((correctCount / questions.length) * 100);
  const duration = Math.round((Date.now() - startTime) / 1000);
  const wrong = questions.length - correctCount;
  const emoji = score >= 80 ? "🏆" : score >= 60 ? "👍" : score >= 40 ? "📚" : "💪";
  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#6366f1" : "#ef4444";

  return (
    <div style={{ padding: "36px 40px", maxWidth: 720, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}{pop}</style>

      {/* Score card */}
      <div style={{ textAlign: "center", marginBottom: 36, animation: "fadeIn 0.5s ease" }}>
        <div style={{ fontSize: 64, marginBottom: 8, animation: "pop 0.5s ease" }}>{emoji}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
          {score >= 80 ? "Excellent!" : score >= 60 ? "Good Job!" : score >= 40 ? "Keep Practicing!" : "Don't Give Up!"}
        </h1>
        <p style={{ color: "#9ca3af", fontSize: 15, margin: 0 }}>{quiz.title}</p>
      </div>

      {/* Big score */}
      <div style={{ background: "linear-gradient(135deg, #0f1420, #111827)", border: `2px solid ${scoreColor}40`, borderRadius: 24, padding: "32px", textAlign: "center", marginBottom: 24, animation: "fadeIn 0.5s ease 0.1s both" }}>
        <div style={{ fontSize: 72, fontWeight: 900, color: scoreColor, lineHeight: 1, letterSpacing: "-2px" }}>{score}%</div>
        <div style={{ color: "#9ca3af", fontSize: 15, marginTop: 6 }}>Final Score</div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 28, animation: "fadeIn 0.5s ease 0.2s both" }}>
        {[
          { label: "Correct", value: correctCount, color: "#10b981", icon: "✓" },
          { label: "Wrong", value: wrong, color: "#ef4444", icon: "✗" },
          { label: "Time", value: duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`, color: "#6366f1", icon: "⏱" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 16, padding: "18px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Wrong questions breakdown */}
      {wrongAnswered.length > 0 && (
        <div style={{ marginBottom: 28, animation: "fadeIn 0.5s ease 0.3s both" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>❌ Missed Questions ({wrong})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
            {wrongAnswered.map((w, i) => (
              <div key={i} style={{ background: "#0f1420", border: "1px solid #7f1d1d50", borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontSize: 13, color: "#e5e7eb", margin: "0 0 8px", fontWeight: 600 }}>{w.prompt}</p>
                <div style={{ fontSize: 12, color: "#f87171", marginBottom: 4 }}>Your answer: {w.selectedTexts.join(", ")}</div>
                <div style={{ fontSize: 12, color: "#6ee7b7" }}>Correct: {w.correctTexts.join(", ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 12, animation: "fadeIn 0.5s ease 0.4s both" }}>
        <button onClick={startQuiz} style={{ flex: 1, padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}>
          🔄 Try Again
        </button>
        <Link href="/library" style={{ flex: 1, padding: "13px", borderRadius: 12, border: "1px solid #1f2937", background: "#0f1420", color: "#9ca3af", fontSize: 14, fontWeight: 600, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
          📚 Library
        </Link>
      </div>
    </div>
  );
}
