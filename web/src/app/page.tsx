import Link from "next/link";
import type { Metadata } from "next";
import NavbarClient from "./NavbarClient";

export const metadata: Metadata = {
  title: "Scorr — AI-Powered Quizzes & Flashcards",
  description: "Turn your notes, PDFs, and slides into practice quizzes and flashcards instantly. Study smarter and ace your exams with Scorr.",
};


// ── Hero ──────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      padding: "120px 24px 80px", maxWidth: 1200, margin: "0 auto",
      gap: 60,
    }}>
      {/* Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          fontSize: "clamp(42px, 5vw, 68px)", fontWeight: 900, lineHeight: 1.05,
          color: "#fff", letterSpacing: "-2px", marginBottom: 24,
        }}>
          Study smarter,<br />ace every exam
        </h1>
        <p style={{
          fontSize: 18, color: "#9ca3af", lineHeight: 1.7, marginBottom: 40, maxWidth: 480,
        }}>
          Turn your notes, slides, and PDFs into AI-generated quizzes and flashcards. Challenge friends in real-time battles and track your progress.
        </p>

        {/* Input row — matching QuizGecko style */}
        <div style={{
          display: "flex", alignItems: "center", gap: 0,
          background: "#111827", border: "1px solid #1f2937",
          borderRadius: 14, padding: "6px 6px 6px 16px", marginBottom: 28,
          maxWidth: 480,
        }}>
          <select style={{
            background: "transparent", border: "none", color: "#e5e7eb",
            fontSize: 15, fontWeight: 500, outline: "none", flex: 1, cursor: "pointer",
            appearance: "none",
          }}>
            <option value="pdf">PDF / DOCX / TXT</option>
            <option value="topic">Type a Topic</option>
            <option value="youtube">YouTube Link</option>
          </select>
          <div style={{ width: 1, height: 24, background: "#1f2937", margin: "0 12px" }} />
          <select style={{
            background: "transparent", border: "none", color: "#e5e7eb",
            fontSize: 15, fontWeight: 500, outline: "none", flex: 1, cursor: "pointer",
            appearance: "none",
          }}>
            <option value="quiz">Questions</option>
            <option value="flashcards">Flashcards</option>
          </select>
          <Link href="/login" style={{
            background: "#fff", color: "#0b0f1a", textDecoration: "none",
            fontSize: 15, fontWeight: 700, padding: "10px 22px", borderRadius: 10,
            whiteSpace: "nowrap",
          }}>Get Started</Link>
        </div>

        {/* Social proof */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex" }}>
            {["🟣", "🔵", "🟢", "🟡"].map((c, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `hsl(${i * 60 + 200},60%,50%)`,
                border: "2px solid #0b0f1a",
                marginLeft: i > 0 ? -10 : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>👤</div>
            ))}
          </div>
          <div>
            <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
              {"★★★★★".split("").map((s, i) => (
                <span key={i} style={{ color: "#fbbf24", fontSize: 14 }}>{s}</span>
              ))}
            </div>
            <span style={{ color: "#6b7280", fontSize: 13 }}>
              Loved by students worldwide · 4.9/5
            </span>
          </div>
        </div>
      </div>

      {/* Right — App mockup */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative", minHeight: 500 }}>
        {/* Glow */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Browser mockup */}
        <div style={{
          width: 360, background: "#1a1f2e", borderRadius: 16,
          border: "1px solid #2d3748", overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
          position: "relative", zIndex: 2,
        }}>
          {/* Browser bar */}
          <div style={{
            background: "#111827", padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid #1f2937",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{
              flex: 1, background: "#1f2937", borderRadius: 6,
              padding: "3px 10px", fontSize: 11, color: "#6b7280", textAlign: "center",
            }}>scorrapp.com/library</div>
          </div>

          {/* App content */}
          <div style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 12 }}>Welcome back!</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Your Library</div>

            {[
              { title: "Human Anatomy - Chapter 5", q: 182, pct: 99, color: "#10b981" },
              { title: "Pharmacology GIT Module", q: 91, pct: 21, color: "#f59e0b" },
              { title: "Pathophysiology Digestive", q: 90, pct: 8, color: "#f59e0b" },
            ].map((quiz, i) => (
              <div key={i} style={{
                background: "#111827", borderRadius: 12, padding: "12px 14px",
                marginBottom: 10, borderLeft: `3px solid ${quiz.color}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e5e7eb", marginBottom: 6 }}>{quiz.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: quiz.color, fontWeight: 700, minWidth: 32 }}>{quiz.pct}%</span>
                  <div style={{ flex: 1, height: 4, background: "#1f2937", borderRadius: 2 }}>
                    <div style={{ width: `${quiz.pct}%`, height: "100%", background: quiz.color, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#6b7280" }}>{quiz.q}q</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating phone mockup */}
        <div style={{
          position: "absolute", right: -20, bottom: 40, zIndex: 3,
          width: 180, background: "#111827", borderRadius: 24,
          border: "1px solid #2d3748", padding: 12,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
        }}>
          <div style={{
            background: "#0b0f1a", borderRadius: 6, padding: "8px 10px",
            marginBottom: 8, fontSize: 11, color: "#9ca3af",
          }}>Quick Start</div>
          {["Marathon Mode", "Pop Quiz (10q)", "Mistakes Only"].map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 0", borderBottom: i < 2 ? "1px solid #1f2937" : "none",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: ["rgba(99,102,241,0.2)", "rgba(239,68,68,0.2)", "rgba(249,115,22,0.2)"][i],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>{["🏃", "⚡", "❌"][i]}</div>
              <span style={{ fontSize: 11, color: "#e5e7eb", fontWeight: 500 }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Trusted by ────────────────────────────────────────────────────
function TrustedBy() {
  const logos = ["📚 Medical Schools", "🏛 Universities", "🎓 Students", "👩‍⚕️ Nursing Boards", "💊 Pharmacy Exams", "📖 Bar Prep", "🔬 Sciences", "📚 Medical Schools"];
  return (
    <div style={{
      borderTop: "1px solid #1f2937", borderBottom: "1px solid #1f2937",
      padding: "32px 0", overflow: "hidden",
    }}>
      <p style={{
        textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: "2px",
        color: "#4b5563", textTransform: "uppercase", marginBottom: 24,
      }}>TRUSTED BY STUDENTS EVERYWHERE</p>
      <div style={{ display: "flex", overflow: "hidden" }}>
        <div className="animate-marquee" style={{ display: "flex", gap: 48, whiteSpace: "nowrap", paddingRight: 48 }}>
          {[...logos, ...logos].map((logo, i) => (
            <span key={i} style={{ fontSize: 14, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{logo}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────
function StepCard({
  step, title, desc, flip, children
}: {
  step: number; title: string; desc: string; flip?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#0f1420", border: "1px solid #1f2937",
      borderRadius: 20, padding: "48px", display: "flex",
      flexDirection: flip ? "row-reverse" : "row",
      alignItems: "center", gap: 48, marginBottom: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: "inline-block", background: "#a3e635", color: "#0b0f1a",
          fontSize: 12, fontWeight: 800, padding: "4px 12px", borderRadius: 20,
          marginBottom: 20, letterSpacing: "0.5px",
        }}>Step {step}</div>
        <h3 style={{
          fontSize: 32, fontWeight: 800, color: "#fff",
          marginBottom: 16, lineHeight: 1.2, letterSpacing: "-0.5px",
        }}>{title}</h3>
        <p style={{ fontSize: 16, color: "#9ca3af", lineHeight: 1.7, marginBottom: 28, maxWidth: 400 }}>{desc}</p>
        <Link href="/login" style={{
          display: "inline-block", background: "#fff", color: "#0b0f1a",
          textDecoration: "none", fontSize: 15, fontWeight: 700,
          padding: "10px 24px", borderRadius: 10,
        }}>Get Started</Link>
      </div>
      <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section id="how-it-works" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
      <h2 style={{
        fontSize: 40, fontWeight: 800, color: "#fff", textAlign: "center",
        marginBottom: 56, letterSpacing: "-1px",
      }}>AI-powered learning made easy</h2>

      <StepCard
        step={1}
        title="Upload Your Study Materials"
        desc="Stop wasting hours manually creating questions. Upload PDFs, lecture slides, Word docs, or just type a topic. Scorr's AI processes your content instantly."
        flip={false}
      >
        {/* File upload visual */}
        <div style={{ position: "relative", width: 280, height: 280 }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "1px dashed #2d3748",
          }} />
          <div style={{
            position: "absolute", inset: 20, borderRadius: "50%",
            border: "1px dashed #374151",
          }} />
          <div style={{
            position: "absolute", inset: "50%", transform: "translate(-50%, -50%)",
            width: 56, height: 56, background: "#6366f1",
            borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>📤</div>
          {/* Floating file icons */}
          {[
            { icon: "📄", top: "8%", left: "50%", label: "PDF" },
            { icon: "📊", top: "30%", right: "5%", label: "PPTX" },
            { icon: "📝", bottom: "10%", left: "48%", label: "TXT" },
            { icon: "📃", top: "30%", left: "5%", label: "DOCX" },
          ].map((f, i) => (
            <div key={i} style={{
              position: "absolute", ...f as any,
              background: "#1a1f2e", border: "1px solid #2d3748",
              borderRadius: 12, padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 20 }}>{f.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#e5e7eb" }}>{f.label}</span>
            </div>
          ))}
        </div>
      </StepCard>

      <StepCard
        step={2}
        title="AI Generates Your Quiz"
        desc="Our AI transforms your content into interactive MCQ quizzes and smart flashcards. Set difficulty levels and customize the number of questions to match your needs."
        flip={true}
      >
        {/* Flashcard visual */}
        <div style={{ position: "relative", width: 300, height: 200 }}>
          {[15, 8, 0].map((offset, i) => (
            <div key={i} style={{
              position: "absolute",
              top: offset, left: offset,
              width: 280, height: 160,
              background: i === 0 ? "#1a1f2e" : i === 1 ? "#1e2535" : "#232c42",
              border: "1px solid #2d3748",
              borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}>
              {i === 0 && (
                <p style={{ color: "#e5e7eb", fontSize: 15, textAlign: "center", lineHeight: 1.5 }}>
                  The sinoatrial node sets the heart's natural rhythm at approximately how many beats per minute?
                </p>
              )}
            </div>
          ))}
        </div>
      </StepCard>

      <StepCard
        step={3}
        title="Track Progress & Ace Exams"
        desc="Identify your knowledge gaps with real-time grading and performance analytics. Keep your study streak alive and use data-driven insights to focus on what matters."
        flip={false}
      >
        {/* Progress visual */}
        <div style={{ width: 300 }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#a3e635" }}>80%</div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>40 out of 50 correct</div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { emoji: "✅", label: "4 Correct", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", color: "#10b981" },
              { emoji: "❌", label: "1 Incorrect", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", color: "#ef4444" },
              { emoji: "🔥", label: "5 Day Streak!", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)", color: "#f97316" },
            ].map((s, i) => (
              <div key={i} style={{
                flex: 1, minWidth: 120, background: s.bg, border: `1px solid ${s.border}`,
                borderRadius: 12, padding: "12px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 20 }}>{s.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </StepCard>

      <StepCard
        step={4}
        title="Study Smarter, Anywhere"
        desc="Start on your laptop and continue on your phone. Battle friends in real-time multiplayer quiz matches. Your progress syncs instantly across all devices."
        flip={true}
      >
        {/* Phone mockup */}
        <div style={{
          width: 180, background: "#111827",
          borderRadius: 28, border: "1px solid #2d3748",
          padding: "16px 12px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}>
          <div style={{ width: 60, height: 6, background: "#1f2937", borderRadius: 3, margin: "0 auto 16px" }} />
          <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>Welcome back!</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Your Library</div>
          {["Anatomy Ch.5", "Pharmacology", "Pathophysiology"].map((title, i) => (
            <div key={i} style={{
              background: "#0b0f1a", borderRadius: 8, padding: "8px 10px", marginBottom: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#e5e7eb", marginBottom: 4 }}>{title}</div>
              <div style={{ height: 3, background: "#1f2937", borderRadius: 2 }}>
                <div style={{
                  width: ["99%", "21%", "8%"][i], height: "100%", borderRadius: 2,
                  background: ["#10b981", "#f59e0b", "#f59e0b"][i],
                }} />
              </div>
            </div>
          ))}
          {/* Download badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
            <a href="#" style={{ display: "block", opacity: 0.5, cursor: "not-allowed" }} title="App Store — Coming Soon">
              <svg height="34" viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M130.198 40H4.729C2.122 40 0 37.872 0 35.267V4.726C0 2.12 2.122 0 4.729 0h125.469C132.878 0 135 2.12 135 4.726v30.541C135 37.872 132.878 40 130.198 40z" fill="#000"/>
                <path d="M134.032 35.268a3.83 3.83 0 0 1-3.834 3.834H4.729a3.835 3.835 0 0 1-3.839-3.834V4.725A3.835 3.835 0 0 1 4.729.89h125.468a3.83 3.83 0 0 1 3.834 3.835l.001 30.543z" fill="#000"/>
                <path d="M30.128 19.784a4.947 4.947 0 0 1 2.355-4.147 5.066 5.066 0 0 0-3.99-2.158c-1.68-.175-3.306 1.005-4.163 1.005-.872 0-2.19-.988-3.607-.958a5.315 5.315 0 0 0-4.473 2.728c-1.934 3.348-.491 8.269 1.361 10.976.927 1.325 2.01 2.805 3.43 2.752 1.387-.058 1.905-.885 3.58-.885 1.658 0 2.144.885 3.59.852 1.489-.025 2.426-1.33 3.32-2.67a10.962 10.962 0 0 0 1.52-3.092 4.782 4.782 0 0 1-2.923-4.403zM27.356 11.67a4.873 4.873 0 0 0 1.114-3.49 4.957 4.957 0 0 0-3.208 1.66 4.636 4.636 0 0 0-1.144 3.36 4.1 4.1 0 0 0 3.238-1.53z" fill="#fff"/>
                <path d="M53.645 28.104h-1.756l-.96-3.012h-3.34l-.913 3.012h-1.71l3.304-10.266h2.047l3.328 10.266zm-2.996-4.261l-.867-2.685a12.279 12.279 0 0 1-.315-1.29h-.037a9.526 9.526 0 0 1-.307 1.29l-.857 2.685h2.383zM62.494 24.44c0 1.19-.322 2.13-.965 2.822-.576.614-1.292.92-2.145.92-.922 0-1.586-.33-1.99-.99h-.029v3.671h-1.654V23.35c0-.813-.021-1.646-.063-2.5h1.455l.092 1.205h.03c.52-.907 1.311-1.36 2.372-1.36.825 0 1.512.326 2.063.977.552.652.834 1.507.834 2.568zm-1.684.063c0-.664-.15-1.21-.449-1.64-.328-.447-.767-.67-1.317-.67-.373 0-.712.124-.999.371a1.722 1.722 0 0 0-.584 1.01 1.962 1.962 0 0 0-.067.468v1.155c0 .496.152.916.457 1.26.305.344.701.516 1.186.516.568 0 1.011-.22 1.327-.657.317-.437.446-1.014.446-1.813zM71.369 24.44c0 1.19-.321 2.13-.965 2.822-.576.614-1.292.92-2.145.92-.922 0-1.586-.33-1.99-.99h-.03v3.671H64.585V23.35c0-.813-.021-1.646-.062-2.5h1.454l.092 1.205h.03c.519-.907 1.31-1.36 2.372-1.36.824 0 1.511.326 2.063.977.551.652.835 1.507.835 2.568zm-1.684.063c0-.664-.15-1.21-.45-1.64-.327-.447-.765-.67-1.316-.67-.373 0-.713.124-1 .371a1.722 1.722 0 0 0-.583 1.01 2.033 2.033 0 0 0-.067.468v1.155c0 .496.152.916.456 1.26.304.344.701.516 1.185.516.568 0 1.012-.22 1.328-.657.316-.437.447-1.014.447-1.813zM80.958 25.289c0 .824-.286 1.495-.858 2.011-.631.564-1.507.846-2.637.846-1.044 0-1.88-.2-2.511-.601l.36-1.38a4.415 4.415 0 0 0 2.243.61c.567 0 1.011-.128 1.327-.383.317-.256.475-.598.475-1.024 0-.38-.13-.7-.392-.96-.26-.26-.693-.502-1.302-.727-1.653-.614-2.479-1.514-2.479-2.697 0-.798.298-1.452.895-1.963.596-.511 1.39-.767 2.384-.767.882 0 1.616.154 2.199.46l-.39 1.35a3.86 3.86 0 0 0-1.858-.447c-.533 0-.95.13-1.25.389a1.12 1.12 0 0 0-.374.857c0 .37.143.676.432.916.253.222.707.463 1.365.727.811.325 1.408.706 1.795 1.141.384.435.576.978.576 1.642zM86.445 21.893H84.63v3.613c0 .918.32 1.376.96 1.376.295 0 .54-.025.733-.076l.046 1.254c-.324.12-.75.182-1.276.182-.648 0-1.154-.198-1.521-.593-.366-.396-.55-1.06-.55-1.992v-3.764h-1.08v-1.24h1.08v-1.363l1.621-.49v1.853h1.814l-.012 1.24zM94.826 24.465c0 1.075-.307 1.957-.921 2.644-.643.708-1.497 1.062-2.565 1.062-1.028 0-1.848-.34-2.461-1.02-.613-.68-.92-1.539-.92-2.576 0-1.083.313-1.971.94-2.658.628-.687 1.476-1.03 2.551-1.03 1.028 0 1.855.34 2.484 1.02.599.66.892 1.514.892 2.558zm-1.717.053c0-.645-.138-1.197-.416-1.658-.327-.557-.795-.836-1.4-.836-.627 0-1.106.279-1.434.836-.278.461-.416 1.022-.416 1.688 0 .645.138 1.198.416 1.659.337.557.808.836 1.418.836.594 0 1.062-.284 1.4-.853.287-.47.432-1.028.432-1.672zM100.857 22.1a2.963 2.963 0 0 0-.535-.046c-.535 0-.949.202-1.24.605-.252.357-.378.808-.378 1.35v3.594h-1.654l.016-4.695c0-.866-.02-1.654-.061-2.366h1.44l.06 1.44h.047c.16-.495.413-.892.762-1.19a1.84 1.84 0 0 1 1.1-.36c.157 0 .3.011.443.031V22.1zM108.516 24.175a4.57 4.57 0 0 1-.069.843h-4.963c.02.735.26 1.296.724 1.683.42.348.964.521 1.632.521.74 0 1.416-.118 2.026-.355l.26 1.147c-.712.31-1.553.465-2.524.465-1.168 0-2.086-.343-2.755-1.03-.667-.687-1.001-1.609-1.001-2.766 0-1.135.311-2.081.936-2.837.652-.807 1.532-1.21 2.639-1.21 1.086 0 1.909.403 2.466 1.21.447.644.629 1.437.629 2.329zm-1.579-.43a2.58 2.58 0 0 0-.367-1.424c-.267-.477-.677-.715-1.229-.715-.504 0-.916.232-1.232.697a2.791 2.791 0 0 0-.468 1.442h3.296zM51.816 9.808a3.56 3.56 0 0 1-1.074 2.797c-.736.693-1.759 1.04-3.065 1.04-.6 0-1.114-.025-1.544-.075V6.65a10.47 10.47 0 0 1 1.763-.135c1.244 0 2.18.317 2.811.952.701.713 1.109 1.71 1.109 3.341zm-1.741.047c0-1.067-.276-1.879-.827-2.44-.55-.56-1.352-.84-2.402-.84a6.22 6.22 0 0 0-.874.055v6.738c.139.023.39.034.755.034 1.082 0 1.916-.308 2.502-.923.585-.615.846-1.516.846-2.624zM60.1 10.674c0 .84-.24 1.53-.72 2.07-.502.554-1.17.83-2.004.83-.803 0-1.444-.266-1.924-.798-.48-.531-.72-1.203-.72-2.013 0-.847.245-1.54.735-2.078.49-.537 1.153-.806 1.991-.806.803 0 1.449.266 1.942.798.468.517.7 1.184.7 1.997zm-1.342.042c0-.504-.108-.936-.325-1.296-.256-.435-.622-.653-1.094-.653-.49 0-.864.218-1.12.653-.217.36-.325.8-.325 1.319 0 .504.108.936.325 1.296.264.435.633.653 1.108.653.464 0 .83-.222 1.094-.66.224-.367.337-.803.337-1.312zM70.702 7.977l-2.207 7.073h-1.38l-.914-3.065a23.11 23.11 0 0 1-.456-1.918h-.025c-.09.65-.245 1.28-.456 1.918l-.97 3.065h-1.394L61.22 7.977h1.433l.802 3.316c.194.803.355 1.56.485 2.267h.025c.11-.567.27-1.318.482-1.918l1.002-3.665h1.228l.96 3.591c.232.875.42 1.652.563 2.334h.037c.112-.663.273-1.44.485-2.334l.865-3.591h1.12zM78.698 15.05h-1.55v-3.745c0-1.152-.437-1.728-1.313-1.728-.429 0-.775.157-1.04.472-.264.315-.398.688-.398 1.116v3.885H72.85V9.738c0-.608-.02-1.267-.058-1.981h1.36l.072 1.084h.037a2.29 2.29 0 0 1 .828-.854c.408-.248.863-.374 1.36-.374.629 0 1.153.203 1.57.61.52.494.779 1.234.779 2.22v4.607zM82.615 15.05h-1.549V5.46h1.549V15.05zM91.48 10.674c0 .84-.24 1.53-.72 2.07-.503.554-1.17.83-2.006.83-.8 0-1.443-.266-1.922-.798-.48-.531-.72-1.203-.72-2.013 0-.847.244-1.54.735-2.078.49-.537 1.152-.806 1.99-.806.803 0 1.45.266 1.942.798.468.517.7 1.184.7 1.997zm-1.342.042c0-.504-.108-.936-.325-1.296-.256-.435-.622-.653-1.094-.653-.49 0-.864.218-1.12.653-.217.36-.325.8-.325 1.319 0 .504.108.936.325 1.296.264.435.633.653 1.107.653.465 0 .831-.222 1.094-.66.226-.367.338-.803.338-1.312zM99.393 15.05h-1.392l-.115-.797h-.037c-.472.638-1.15.957-2.03.957-.656 0-1.186-.211-1.586-.632a2.056 2.056 0 0 1-.539-1.437c0-.862.359-1.52 1.08-1.971.72-.452 1.73-.674 3.03-.666v-.133c0-.938-.493-1.407-1.48-1.407-.68 0-1.281.172-1.8.514l-.313-1.015c.641-.396 1.437-.594 2.383-.594 1.815 0 2.725.957 2.725 2.87v2.575c0 .696.033 1.252.074 1.736zm-1.56-2.524v-1.07c-1.726-.03-2.588.456-2.588 1.46 0 .376.102.658.308.845.205.187.467.281.78.281.351 0 .677-.11.973-.332.296-.222.468-.506.515-.852a1.33 1.33 0 0 0 .012-.332zM107.845 15.05h-1.36l-.072-1.12h-.037c-.448.86-1.17 1.29-2.157 1.29-.808 0-1.479-.32-2.008-.961-.53-.64-.795-1.501-.795-2.58 0-1.147.287-2.075.863-2.783.559-.661 1.247-.991 2.063-.991.882 0 1.497.297 1.846.89h.028V5.46h1.552v7.793c0 .636.017 1.22.077 1.797zm-1.629-3.123v-1.158c0-.195-.013-.353-.038-.472a1.663 1.663 0 0 0-.535-.96 1.51 1.51 0 0 0-1.011-.37c-.533 0-.952.211-1.258.634-.307.423-.46.97-.46 1.643 0 .645.148 1.17.443 1.572.314.43.734.644 1.258.644.497 0 .896-.187 1.198-.56.296-.348.403-.783.403-1.373zM117.476 10.674c0 .84-.24 1.53-.72 2.07-.502.554-1.17.83-2.004.83-.804 0-1.445-.266-1.924-.798-.48-.531-.72-1.203-.72-2.013 0-.847.244-1.54.735-2.078.49-.537 1.153-.806 1.99-.806.804 0 1.45.266 1.943.798.468.517.7 1.184.7 1.997zm-1.341.042c0-.504-.108-.936-.325-1.296-.256-.435-.622-.653-1.094-.653-.49 0-.864.218-1.12.653-.217.36-.325.8-.325 1.319 0 .504.108.936.325 1.296.264.435.633.653 1.107.653.465 0 .831-.222 1.094-.66.225-.367.338-.803.338-1.312zM123.987 15.05h-1.549v-3.745c0-1.152-.437-1.728-1.313-1.728-.429 0-.775.157-1.04.472-.264.315-.397.688-.397 1.116v3.885h-1.55V9.738c0-.608-.019-1.267-.058-1.981h1.36l.072 1.084h.037c.23-.376.558-.687.828-.854.408-.248.863-.374 1.36-.374.629 0 1.152.203 1.57.61.52.494.78 1.234.78 2.22v4.607z" fill="#fff"/>
              </svg>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge" target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
              <svg height="34" viewBox="0 0 135 40" xmlns="http://www.w3.org/2000/svg">
                <path d="M130.198 40H4.729C2.122 40 0 37.872 0 35.267V4.726C0 2.12 2.122 0 4.729 0h125.469C132.878 0 135 2.12 135 4.726v30.541C135 37.872 132.878 40 130.198 40z" fill="#000"/>
                <path d="M134.032 35.268a3.83 3.83 0 0 1-3.834 3.834H4.729a3.835 3.835 0 0 1-3.839-3.834V4.725A3.835 3.835 0 0 1 4.729.89h125.468a3.83 3.83 0 0 1 3.834 3.835l.001 30.543z" fill="#000"/>
                <path d="M68.135 21.524l-8.129 8.53a2.142 2.142 0 0 0 .632 1.553c.37.36.872.52 1.4.44l.08-.018 9.103-5.258-3.086-5.247zM75.43 17.807l-3.917-2.263-3.463 3.085 3.48 3.48 3.904-2.255a1.63 1.63 0 0 0 .863-1.524 1.634 1.634 0 0 0-.866-1.523zM59.35 10.99l8.083 8.483 3.11-3.11-9.07-5.24a2.17 2.17 0 0 0-1.09-.31c-.46 0-.9.14-1.032.177z" fill="url(#a)"/>
                <path d="M59.35 10.99c-.462.324-.768.855-.768 1.583v16.854c0 .702.293 1.225.741 1.56l.087.065 9.44-9.44v-.224L59.35 10.99z" fill="url(#b)"/>
                <path d="M68.135 21.524l3.086 3.087 3.2-1.847.704-.405a1.634 1.634 0 0 0 .866-1.524 1.633 1.633 0 0 0-.866-1.522l-.704-.406-3.204-1.849-3.082 3.466z" fill="url(#c)"/>
                <defs>
                  <linearGradient id="a" x1="73.079" y1="21.612" x2="57.918" y2="6.451" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#00A0FF"/><stop offset=".007" stopColor="#00A1FF"/><stop offset=".26" stopColor="#00BEFF"/><stop offset=".512" stopColor="#00D2FF"/><stop offset=".76" stopColor="#00DFFF"/><stop offset="1" stopColor="#00E3FF"/>
                  </linearGradient>
                  <linearGradient id="b" x1="85.738" y1="21.524" x2="58.897" y2="21.524" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FFE000"/><stop offset=".409" stopColor="#FFBD00"/><stop offset=".775" stopColor="orange"/><stop offset="1" stopColor="#FF9C00"/>
                  </linearGradient>
                  <linearGradient id="c" x1="76.016" y1="24.297" x2="56.501" y2="4.781" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF3A44"/><stop offset="1" stopColor="#C31162"/>
                  </linearGradient>
                </defs>
                <text x="88" y="15" fontSize="7" fill="#fff" opacity=".7">GET IT ON</text>
                <text x="86" y="27" fontSize="12" fontWeight="bold" fill="#fff">Google Play</text>
              </svg>
            </a>
          </div>
        </div>
      </StepCard>
    </section>
  );
}

// ── Subjects ──────────────────────────────────────────────────────
function Subjects() {
  const subjects = [
    { icon: "🩺", name: "Medicine", desc: "Clinical reasoning, USMLE-style revision, anatomy, physiology, and high-yield recall from your own material.", badge: "POPULAR" },
    { icon: "💉", name: "Nursing", desc: "NCLEX-style practice, clinical judgement, patient safety, prioritisation, and care planning.", badge: "POPULAR" },
    { icon: "💊", name: "Pharmacy", desc: "Therapeutics, drug mechanisms, interactions, contraindications, and exam prep.", badge: "POPULAR" },
    { icon: "⚖️", name: "Law", desc: "Case-based recall, statute memorisation, and exam technique practice.", badge: null },
    { icon: "📐", name: "Engineering", desc: "Problem sets, concept recall, formula mastery, and technical vocabulary.", badge: null },
    { icon: "💰", name: "Business", desc: "Financial concepts, management theory, and case study preparation.", badge: null },
  ];

  return (
    <section id="subjects" style={{ maxWidth: 1200, margin: "0 auto", padding: "80px 24px" }}>
      <h2 style={{
        fontSize: 40, fontWeight: 800, color: "#fff", textAlign: "center",
        marginBottom: 16, letterSpacing: "-1px",
      }}>Built for your subject</h2>
      <p style={{
        fontSize: 17, color: "#9ca3af", textAlign: "center", marginBottom: 56, maxWidth: 560, margin: "0 auto 56px",
      }}>
        Scorr is especially useful for memory-heavy subjects and high-stakes exams. Upload your own material and turn it into active recall practice.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {subjects.map((s) => (
          <div key={s.name} style={{
            background: "#0f1420", border: "1px solid #1f2937",
            borderRadius: 16, padding: "28px 24px",
            transition: "border-color 0.2s",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, background: "#1a1f2e",
                borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>{s.icon}</div>
              {s.badge && (
                <span style={{
                  background: "#a3e635", color: "#0b0f1a",
                  fontSize: 10, fontWeight: 800, padding: "3px 8px",
                  borderRadius: 20, letterSpacing: "0.5px",
                }}>{s.badge}</span>
              )}
            </div>
            <h4 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{s.name}</h4>
            <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.6, marginBottom: 20 }}>{s.desc}</p>
            <Link href="/login" style={{
              color: "#a3e635", textDecoration: "none", fontSize: 14, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
            }}>Get started →</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{
      maxWidth: 1200, margin: "0 auto", padding: "80px 24px",
      textAlign: "center",
    }}>
      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0f1420 100%)",
        border: "1px solid #1f2937", borderRadius: 24, padding: "64px 48px",
      }}>
        <h2 style={{
          fontSize: 44, fontWeight: 900, color: "#fff", marginBottom: 16,
          letterSpacing: "-1px",
        }}>Start studying smarter today</h2>
        <p style={{ fontSize: 18, color: "#9ca3af", marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
          Join thousands of students who use Scorr to generate quizzes and ace their exams.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href="/login" style={{
            background: "#fff", color: "#0b0f1a", textDecoration: "none",
            fontSize: 16, fontWeight: 700, padding: "14px 32px", borderRadius: 12,
          }}>Get Started — It's Free</Link>
          <a href="https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <img
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Get it on Google Play"
              style={{ height: 56 }}
            />
          </a>
          <a href="#" style={{ textDecoration: "none", opacity: 0.5, cursor: "not-allowed" }} title="App Store — Coming Soon">
            <img
              src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg"
              alt="Download on the App Store"
              style={{ height: 40, marginTop: 8 }}
            />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid #1f2937", padding: "40px 24px",
    }}>
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "#fff", fontWeight: 900, fontSize: 16 }}>S</span>
          </div>
          <span style={{ fontWeight: 800, color: "#fff", fontSize: 16 }}>SCORR</span>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {[
            { label: "Privacy Policy", href: "/privacy-policy" },
            { label: "Terms of Service", href: "/terms-of-service" },
            { label: "Delete Account", href: "/delete-account" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{
              color: "#6b7280", textDecoration: "none", fontSize: 14,
              transition: "color 0.2s",
            }}>{l.label}</Link>
          ))}
        </div>

        <p style={{ color: "#4b5563", fontSize: 14 }}>
          © {new Date().getFullYear()} Scorr. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function Home() {
  return (
    <div style={{ background: "#0b0f1a", minHeight: "100vh" }}>
      <NavbarClient />
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <Subjects />
      <CTA />
      <Footer />
    </div>
  );
}
