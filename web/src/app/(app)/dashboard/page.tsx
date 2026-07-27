"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { fetchQuizzes } from "@/lib/api";
import type { Quiz } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`;

function Spinner() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <style>{spin}</style>
      <div style={{ width: 44, height: 44, border: "3px solid #1f2937", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ color: "#9ca3af", fontSize: 14 }}>Loading dashboard…</span>
    </div>
  );
}

function StatCard({ label, value, icon, color, delay = 0 }: { label: string; value: string | number; icon: string; color: string; delay?: number }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f1420 0%, #111827 100%)",
      border: "1px solid #1f2937", borderRadius: 18, padding: "22px 24px",
      display: "flex", alignItems: "center", gap: 18,
      animation: `fadeIn 0.5s ease ${delay}ms both`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0, width: 80, height: 80,
        background: `radial-gradient(circle at top right, ${color}15, transparent 70%)`,
        borderRadius: "0 18px 0 0",
      }} />
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: `linear-gradient(135deg, ${color}25, ${color}10)`,
        border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-1px" }}>{value}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function ProgressBar({ pct, color = "#6366f1" }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 6, background: "#1f2937", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 99, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    fetchQuizzes(user.uid).then(({ quizzes: q }) => {
      setQuizzes(q ?? []);
      setLoading(false);
    });
  }, [user?.uid]);

  const totalQuestions = quizzes.reduce((s, q) => s + (q.questionsList?.length || 0), 0);
  const totalAttempts = quizzes.reduce((s, q) => s + (q.attempts?.length || 0), 0);
  const allScores = quizzes.flatMap(q => (q.attempts ?? []).map(a => a.score));
  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const recent = [...quizzes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const firstName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || "Quizzer";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ padding: "36px 40px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}</style>

      <header style={{ marginBottom: 40, animation: "fadeIn 0.4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 6 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, boxShadow: "0 8px 24px rgba(99,102,241,0.35)",
          }}>👋</div>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.8px" }}>
              {greeting}, {firstName}!
            </h1>
            <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0", fontWeight: 500 }}>Ready to conquer your next challenge?</p>
          </div>
        </div>
      </header>

      {loading ? <Spinner /> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 44 }}>
            <StatCard label="Total Quizzes" value={quizzes.length} icon="📚" color="#6366f1" delay={0} />
            <StatCard label="Total Questions" value={totalQuestions} icon="❓" color="#8b5cf6" delay={60} />
            <StatCard label="Total Attempts" value={totalAttempts} icon="🎯" color="#10b981" delay={120} />
            <StatCard label="Avg Score" value={allScores.length ? `${avgScore}%` : "—"} icon="⭐" color="#f59e0b" delay={180} />
          </div>

          <section style={{ marginBottom: 44, animation: "fadeIn 0.6s ease 0.2s both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", margin: 0 }}>Recent Quizzes</h2>
              <Link href="/library" style={{ fontSize: 13, color: "#6366f1", textDecoration: "none", fontWeight: 600, padding: "6px 14px", background: "#6366f115", borderRadius: 8, border: "1px solid #6366f130" }}>
                View all →
              </Link>
            </div>

            {recent.length === 0 ? (
              <div style={{ background: "#0f1420", border: "1px dashed #1f2937", borderRadius: 20, padding: "56px 40px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 14 }}>🗂️</div>
                <p style={{ color: "#6b7280", fontSize: 15, margin: "0 0 20px", fontWeight: 500 }}>No quizzes yet. Create your first one to get started!</p>
                <Link href="/quiz/create" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 12, color: "#fff", fontWeight: 600, fontSize: 14, textDecoration: "none", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>✨ Create Quiz</Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recent.map((q, i) => {
                  const total = q.questionsList?.length || 0;
                  const correct = q.uniqueCorrectIds?.length || 0;
                  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                  const lastAttempt = q.attempts?.length ? q.attempts[q.attempts.length - 1] : null;
                  const statusColor = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#6366f1";
                  const emoji = pct >= 80 ? "🏆" : pct >= 50 ? "📖" : "🎯";
                  return (
                    <Link key={q.id} href={`/quiz/${q.id}`} style={{ textDecoration: "none" }}>
                      <div
                        style={{ background: "#0f1420", border: "1px solid #1f2937", borderRadius: 15, padding: "16px 20px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 16, animation: `fadeIn 0.5s ease ${i * 60}ms both` }}
                        onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#6366f1"; el.style.background = "#12193a"; el.style.transform = "translateX(3px)"; }}
                        onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "#1f2937"; el.style.background = "#0f1420"; el.style.transform = "translateX(0)"; }}
                      >
                        <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `${statusColor}20`, border: `1px solid ${statusColor}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{emoji}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                            <span style={{ fontWeight: 700, color: "#e5e7eb", fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{q.title}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: statusColor, flexShrink: 0 }}>{pct}%</span>
                          </div>
                          <ProgressBar pct={pct} color={statusColor} />
                          <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{total} questions</span>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{q.attempts?.length || 0} attempts</span>
                            {lastAttempt && <span style={{ fontSize: 12, color: "#6b7280" }}>Last: {lastAttempt.score}%</span>}
                          </div>
                        </div>
                        <div style={{ color: "#374151", fontSize: 20, flexShrink: 0 }}>›</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          <section style={{ animation: "fadeIn 0.6s ease 0.35s both" }}>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>Quick Actions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { href: "/quiz/create", icon: "✨", label: "Create Quiz", desc: "Generate with AI", color: "#6366f1", gradient: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
                { href: "/library", icon: "📚", label: "My Library", desc: "Browse all quizzes", color: "#10b981", gradient: "linear-gradient(135deg,#10b981,#059669)" },
                { href: "/battle", icon: "⚔️", label: "Battle Arena", desc: "Challenge friends", color: "#ec4899", gradient: "linear-gradient(135deg,#ec4899,#be185d)" },
              ].map((action, i) => (
                <Link key={action.href} href={action.href} style={{ textDecoration: "none" }}>
                  <div
                    style={{ background: "#0f1420", border: `1px solid ${action.color}30`, borderRadius: 18, padding: "22px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden", animation: `fadeIn 0.5s ease ${i * 80}ms both` }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = `${action.color}12`; el.style.borderColor = `${action.color}60`; el.style.transform = "translateY(-3px)"; el.style.boxShadow = `0 12px 32px ${action.color}20`; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = "#0f1420"; el.style.borderColor = `${action.color}30`; el.style.transform = "translateY(0)"; el.style.boxShadow = "none"; }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 12, background: action.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 4px 14px ${action.color}35` }}>{action.icon}</div>
                    <div style={{ fontWeight: 700, color: "#e5e7eb", fontSize: 15, marginBottom: 4 }}>{action.label}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{action.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
