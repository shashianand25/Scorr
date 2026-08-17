"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error: err } = await signInWithEmail(email, password);
        if (err) setError(err);
      } else {
        const { error: err } = await signUpWithEmail(email, password, name);
        if (err) setError(err);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b0f1a",
        display: "flex",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      <style>{`
        @media (max-width: 900px) {
          .login-left-panel { display: none !important; }
          .login-right-panel {
            width: 100% !important;
            padding: 36px 20px !important;
            min-height: 100vh !important;
            justify-content: flex-start !important;
          }
          .login-mobile-logo { display: flex !important; margin-bottom: 32px !important; }
        }
        @media (min-width: 901px) {
          .login-mobile-logo { display: none !important; }
        }
      `}</style>

      {/* ── Left panel — branding (Desktop) ── */}
      <div
        className="login-left-panel"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 56px",
          background: "linear-gradient(135deg, #0f1420 0%, #0b0f1a 100%)",
          borderRight: "1px solid #1f2937",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Logo — pinned top-left */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, position: "absolute", top: 48, left: 56 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Scorr Logo"
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }}
          />
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>SCORR</span>
        </Link>

        {/* Center quote */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 500, width: "100%" }}>
          <div style={{ fontSize: 13, color: "#6366f1", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>
            AI-Powered Learning
          </div>
          <h2 style={{
            fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1.1,
            letterSpacing: "-1.5px", marginBottom: 20,
          }}>
            Turn your notes<br />into knowledge
          </h2>
          <p style={{ fontSize: 17, color: "#6b7280", lineHeight: 1.7, maxWidth: 380 }}>
            Upload PDFs, slides, or type a topic — Scorr generates quizzes and flashcards instantly.
          </p>
        </div>

        <p style={{ fontSize: 13, color: "#374151", position: "absolute", bottom: 32, left: 56 }}>
          © {new Date().getFullYear()} Scorr App. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div
        className="login-right-panel"
        style={{
          width: 480,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 56px",
          background: "#0b0f1a",
          boxSizing: "border-box",
        }}
      >
        {/* Mobile Header Logo */}
        <div className="login-mobile-logo" style={{ alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Scorr Logo"
              style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover" }}
            />
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-0.5px" }}>SCORR</span>
          </Link>
        </div>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 8, letterSpacing: "-0.5px" }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280" }}>
            {isLogin ? "Sign in to continue your learning journey" : "Start generating quizzes in seconds"}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 20,
              fontSize: 14,
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={isLoading}
          style={{
            width: "100%",
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: "13px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "#e5e7eb",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
          <span style={{ color: "#4b5563", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {!isLogin && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                style={{
                  width: "100%",
                  background: "#111827",
                  border: "1px solid #1f2937",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: "#fff",
                  fontSize: 15,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@university.edu"
              style={{
                width: "100%",
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "14px",
              fontSize: 15,
              fontWeight: 700,
              cursor: isLoading ? "not-allowed" : "pointer",
              marginTop: 8,
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.35)",
            }}
          >
            {isLoading ? "Processing…" : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "#6b7280" }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{
              background: "none",
              border: "none",
              color: "#818cf8",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
