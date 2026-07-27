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
            <div style={{
              background: "#000", borderRadius: 8, padding: "8px 10px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 16 }}>🍎</span>
              <div>
                <div style={{ fontSize: 7, color: "#9ca3af" }}>Download on the</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>App Store</div>
              </div>
            </div>
            <div style={{
              background: "#000", borderRadius: 8, padding: "8px 10px",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ fontSize: 16 }}>▶</span>
              <div>
                <div style={{ fontSize: 7, color: "#9ca3af" }}>GET IT ON</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>Google Play</div>
              </div>
            </div>
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
          <a href="#" style={{
            background: "transparent", color: "#e5e7eb", textDecoration: "none",
            fontSize: 16, fontWeight: 600, padding: "14px 32px", borderRadius: 12,
            border: "1px solid #374151",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>▶</span> Download the App
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
