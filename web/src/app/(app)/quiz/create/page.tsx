"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { fetchAppConfig, createQuiz } from "@/lib/api";
import type { Question, Flashcard } from "@/lib/api";

const spin = `@keyframes spin { to { transform: rotate(360deg); } }`;
const fadeIn = `@keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`;
const pulse = `@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`;

const FUN_MESSAGES = [
  "Brewing your quiz with AI magic ✨",
  "Reading through your notes carefully…",
  "Crafting clever questions…",
  "Generating flashcards…",
  "Adding a sprinkle of difficulty…",
  "Almost there, polishing up! 🎉",
];

const QUESTION_OPTIONS = [10, 20, 30, 50];

export default function CreateQuizPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [customCount, setCustomCount] = useState("");
  const [includeFlashcards, setIncludeFlashcards] = useState(true);
  const [category, setCategory] = useState("General");
  const [loading, setLoading] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);

  const effectiveCount = useCustom ? (parseInt(customCount) || 10) : questionCount;

  const handleGenerate = async () => {
    if (!user?.uid) return;
    if (!sourceText.trim()) { setError("Please paste some notes or source text."); return; }
    if (!title.trim()) { setError("Please enter a quiz title."); return; }

    setError(null);
    setLoading(true);
    setMsgIdx(0);

    const msgInterval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % FUN_MESSAGES.length);
    }, 2000);

    try {
      // Fetch Gemini config
      const { config, error: cfgErr } = await fetchAppConfig();
      if (cfgErr || !config) throw new Error(cfgErr ?? "Failed to load AI config");

      const { geminiKey, modelUrl, promptTemplate } = config.aiConfig;

      // Build prompt
      const prompt = promptTemplate
        .replace("{sourceText}", sourceText)
        .replace("{questionCount}", String(effectiveCount))
        .replace("{includeFlashcards}", String(includeFlashcards));

      // Call Gemini
      const geminiRes = await fetch(modelUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
        }),
      });

      if (!geminiRes.ok) throw new Error(`Gemini error: ${geminiRes.status}`);
      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

      let parsed: { questions?: Question[]; flashcards?: Flashcard[] } = {};
      try {
        const clean = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error("AI returned invalid JSON. Please try again.");
      }

      const questions: Question[] = parsed.questions ?? [];
      const flashcards: Flashcard[] = includeFlashcards ? (parsed.flashcards ?? []) : [];

      if (questions.length === 0) throw new Error("AI generated no questions. Try with more detailed notes.");

      // Save to API
      const { quiz, error: saveErr } = await createQuiz({
        userId: user.uid,
        title: title.trim(),
        category,
        questionCount: questions.length,
        sourceText,
        questionsList: questions,
        flashcards,
      });

      if (saveErr || !quiz) throw new Error(saveErr ?? "Failed to save quiz");

      clearInterval(msgInterval);
      router.push(`/quiz/${quiz.id}`);
    } catch (err: any) {
      clearInterval(msgInterval);
      setError(err.message ?? "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "36px 40px", maxWidth: 760, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <style>{spin}{fadeIn}{pulse}</style>

      <div style={{ marginBottom: 36, animation: "fadeIn 0.4s ease" }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 6px", letterSpacing: "-0.5px" }}>✨ Create Quiz</h1>
        <p style={{ color: "#9ca3af", fontSize: 14, margin: 0 }}>Paste your notes and let AI generate a quiz for you</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", animation: "fadeIn 0.4s ease" }}>
          <div style={{ width: 64, height: 64, border: "4px solid #1f2937", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto 28px" }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: "#e5e7eb", marginBottom: 8, animation: "pulse 2s ease infinite" }}>
            {FUN_MESSAGES[msgIdx]}
          </div>
          <p style={{ color: "#6b7280", fontSize: 13 }}>This usually takes 10–30 seconds…</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, animation: "fadeIn 0.5s ease" }}>

          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quiz Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Biology Chapter 5 – Cell Division"
              style={{ width: "100%", padding: "13px 16px", background: "#0f1420", border: "1px solid #1f2937", borderRadius: 12, color: "#e5e7eb", fontSize: 15, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => (e.target.style.borderColor = "#6366f1")}
              onBlur={e => (e.target.style.borderColor = "#1f2937")}
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Category</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Biology, History, Math…"
              style={{ width: "100%", padding: "13px 16px", background: "#0f1420", border: "1px solid #1f2937", borderRadius: 12, color: "#e5e7eb", fontSize: 15, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => (e.target.style.borderColor = "#6366f1")}
              onBlur={e => (e.target.style.borderColor = "#1f2937")}
            />
          </div>

          {/* Source Text */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes / Source Text *</label>
            <textarea
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              placeholder="Paste your notes, textbook content, lecture slides, or any source material here. The more detail you provide, the better the questions will be!"
              rows={10}
              style={{ width: "100%", padding: "14px 16px", background: "#0f1420", border: "1px solid #1f2937", borderRadius: 12, color: "#e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", resize: "vertical", lineHeight: 1.6, transition: "border-color 0.2s" }}
              onFocus={e => (e.target.style.borderColor = "#6366f1")}
              onBlur={e => (e.target.style.borderColor = "#1f2937")}
            />
            <div style={{ fontSize: 12, color: "#4b5563", marginTop: 6 }}>{sourceText.length} characters</div>
          </div>

          {/* Question Count */}
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Number of Questions</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {QUESTION_OPTIONS.map(n => (
                <button key={n} onClick={() => { setQuestionCount(n); setUseCustom(false); }} style={{ padding: "10px 22px", borderRadius: 10, border: `1px solid ${!useCustom && questionCount === n ? "#6366f1" : "#1f2937"}`, background: !useCustom && questionCount === n ? "#6366f120" : "#0f1420", color: !useCustom && questionCount === n ? "#a5b4fc" : "#9ca3af", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Inter', sans-serif" }}>
                  {n}
                </button>
              ))}
              <button onClick={() => setUseCustom(true)} style={{ padding: "10px 22px", borderRadius: 10, border: `1px solid ${useCustom ? "#6366f1" : "#1f2937"}`, background: useCustom ? "#6366f120" : "#0f1420", color: useCustom ? "#a5b4fc" : "#9ca3af", fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.15s", fontFamily: "'Inter', sans-serif" }}>
                Custom
              </button>
            </div>
            {useCustom && (
              <input
                type="number"
                value={customCount}
                onChange={e => setCustomCount(e.target.value)}
                placeholder="e.g. 15"
                min={1}
                max={100}
                style={{ marginTop: 10, width: 120, padding: "10px 14px", background: "#0f1420", border: "1px solid #6366f1", borderRadius: 10, color: "#e5e7eb", fontSize: 14, outline: "none", fontFamily: "'Inter', sans-serif", boxSizing: "border-box" }}
              />
            )}
          </div>

          {/* Include Flashcards */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "#0f1420", border: "1px solid #1f2937", borderRadius: 14 }}>
            <div
              onClick={() => setIncludeFlashcards(!includeFlashcards)}
              style={{ width: 48, height: 28, borderRadius: 99, background: includeFlashcards ? "#6366f1" : "#374151", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
            >
              <div style={{ position: "absolute", top: 3, left: includeFlashcards ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e5e7eb" }}>🃏 Include Flashcards</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Also generate flashcard definitions for key concepts</div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ padding: "14px 18px", background: "#7f1d1d20", border: "1px solid #7f1d1d", borderRadius: 12, color: "#fca5a5", fontSize: 14 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ padding: "15px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "all 0.2s", marginTop: 4 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(99,102,241,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)"; }}
          >
            ✨ Generate {effectiveCount} Questions with AI
          </button>
        </div>
      )}
    </div>
  );
}
