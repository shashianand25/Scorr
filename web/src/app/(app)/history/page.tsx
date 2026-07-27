"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { fetchQuizHistory, fetchBattleHistory } from "@/lib/api";
import type { QuizHistoryEvent, BattleHistoryEvent } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`;

function Spinner() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{spin}</style>
      <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#9ca3af", fontSize: 14 }}>Loading history…</span>
    </div>
  );
}

function StatCard({ label, value, icon, color, delay = 0 }: { label: string; value: string | number; icon: string; color: string; delay?: number }) {
  return (
    <div style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 18, padding: "22px 24px", display: "flex", alignItems: "center", gap: 16, animation: `fadeIn 0.5s ease ${delay}ms both` }}>
      <div style={{ width: 50, height: 50, borderRadius: 13, background: `${color}20`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-1px" }}>{value}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, padding: "0 4px" }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const color = d.value >= 80 ? "#10b981" : d.value >= 60 ? "#f59e0b" : "#6366f1";
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: "#6b7280", fontWeight: 600 }}>{d.value}%</div>
            <div style={{ width: "100%", background: `${color}30`, borderRadius: "4px 4px 0 0", position: "relative", height: 70, display: "flex", alignItems: "flex-end" }}>
              <div style={{ width: "100%", height: `${pct}%`, background: color, borderRadius: "4px 4px 0 0", minHeight: 4, transition: "height 0.6s ease" }} />
            </div>
            <div style={{ fontSize: 9, color: "#4b5563", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(str: string) {
  const d = new Date(str);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HistoryPage() {
  const { user } = useAuthStore();
  const [quizHistory, setQuizHistory] = useState<QuizHistoryEvent[]>([]);
  const [battleHistory, setBattleHistory] = useState<BattleHistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"quiz" | "battle">("quiz");

  useEffect(() => {
    if (!user?.uid) return;
    Promise.all([
      fetchQuizHistory(user.uid),
      fetchBattleHistory(user.uid),
    ]).then(([qh, bh]) => {
      setQuizHistory(qh.history ?? []);
      setBattleHistory(bh.history ?? []);
      setLoading(false);
    });
  }, [user?.uid]);

  const totalTaken = quizHistory.length;
  const allScores = quizHistory.map(h => h.metadata.score);
  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const bestScore = allScores.length ? Math.max(...allScores) : 0;
  const totalQAnswered = quizHistory.reduce((s, h) => s + h.metadata.totalQuestions, 0);

  const chartData = quizHistory.slice(0, 14).reverse().map((h, i) => ({
    label: `#${i + 1}`,
    value: h.metadata.score,
  }));

  const wins = battleHistory.filter(b => b.won).length;
  const losses = battleHistory.length - wins;

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}</style>

      <div style={{ marginBottom: 36, animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>📊 Stats & History</h1>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Track your learning progress over time</p>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 36 }}>
            <StatCard label="Quizzes Taken" value={totalTaken} icon="🎯" color="#6366f1" delay={0} />
            <StatCard label="Avg Score" value={allScores.length ? `${avgScore}%` : "—"} icon="📈" color="#10b981" delay={60} />
            <StatCard label="Best Score" value={allScores.length ? `${bestScore}%` : "—"} icon="🏆" color="#f59e0b" delay={120} />
            <StatCard label="Questions Answered" value={totalQAnswered} icon="❓" color="#8b5cf6" delay={180} />
          </div>

          {/* Score Chart */}
          {chartData.length > 0 && (
            <div style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 20, padding: "24px 28px", marginBottom: 32, animation: "fadeIn 0.5s ease 0.2s both" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e5e7eb", margin: "0 0 20px" }}>📉 Score Trend (Last {chartData.length} Attempts)</h2>
              <MiniBarChart data={chartData} />
              <div style={{ display: "flex", gap: 16, marginTop: 12, justifyContent: "center" }}>
                {[{ color: "#10b981", label: "80%+" }, { color: "#f59e0b", label: "60–79%" }, { color: "#6366f1", label: "< 60%" }].map(l => (
                  <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                    <span style={{ fontSize: 12, color: "#6b7280" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "#0f1420", border: "1px solid #1f2937", borderRadius: 12, padding: 4, width: "fit-content", marginBottom: 20 }}>
            {(["quiz", "battle"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "8px 20px", borderRadius: 9, border: "none", cursor: "pointer", background: activeTab === tab ? "#6366f1" : "transparent", color: activeTab === tab ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 600, transition: "all 0.15s", fontFamily: "'Inter', sans-serif" }}>
                {tab === "quiz" ? "🎯 Quiz History" : "⚔️ Battle History"}
              </button>
            ))}
          </div>

          {/* Quiz History Table */}
          {activeTab === "quiz" && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              {quizHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "#0f1420", border: "1px dashed #1f2937", borderRadius: 16 }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
                  <p style={{ color: "#9ca3af", fontSize: 15, margin: 0 }}>No quiz history yet. Take a quiz to see your stats!</p>
                </div>
              ) : (
                <div style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 20, overflow: "hidden" }}>
                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: "1px solid #1f2937", background: "#111827" }}>
                    {["Quiz", "Score", "Correct", "Wrong", "Date"].map(h => (
                      <div key={h} style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                    ))}
                  </div>

                  {/* Table rows */}
                  {quizHistory.map((h, i) => {
                    const scoreColor = h.metadata.score >= 80 ? "#10b981" : h.metadata.score >= 60 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={h.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: i < quizHistory.length - 1 ? "1px solid #111827" : "none", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#12193a")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ fontSize: 14, color: "#e5e7eb", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{h.metadata.quizTitle}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor }}>{h.metadata.score}%</div>
                        <div style={{ fontSize: 14, color: "#10b981", fontWeight: 600 }}>✓ {h.metadata.correct}</div>
                        <div style={{ fontSize: 14, color: "#ef4444", fontWeight: 600 }}>✗ {h.metadata.wrong}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{formatDate(h.createdAt)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Battle History */}
          {activeTab === "battle" && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              {/* Battle stats */}
              {battleHistory.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Total Battles", value: battleHistory.length, color: "#6366f1", icon: "⚔️" },
                    { label: "Wins", value: wins, color: "#10b981", icon: "🏆" },
                    { label: "Losses", value: losses, color: "#ef4444", icon: "😤" },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 14, padding: "18px", textAlign: "center" }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {battleHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "#0f1420", border: "1px dashed #1f2937", borderRadius: 16 }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>⚔️</div>
                  <p style={{ color: "#9ca3af", fontSize: 15, margin: 0 }}>No battles yet. Challenge a friend to get started!</p>
                </div>
              ) : (
                <div style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 20, overflow: "hidden" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: "1px solid #1f2937", background: "#111827" }}>
                    {["Quiz", "Result", "My Score", "Opponent", "Date"].map(h => (
                      <div key={h} style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                    ))}
                  </div>
                  {battleHistory.map((b, i) => (
                    <div key={b.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 20px", borderBottom: i < battleHistory.length - 1 ? "1px solid #111827" : "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#12193a")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ fontSize: 14, color: "#e5e7eb", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>{b.quiz_title}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: b.won ? "#10b981" : "#ef4444" }}>{b.won ? "🏆 WIN" : "😤 LOSS"}</div>
                      <div style={{ fontSize: 14, color: "#e5e7eb", fontWeight: 600 }}>{b.my_score}%</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{b.opponent_name}: {b.opponent_score}%</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{formatDate(b.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
