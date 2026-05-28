"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Brain, LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      if (mode === "signup") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          toast.error(payload?.error ?? "Could not create account");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(mode === "signup" ? "Account created, but sign in failed." : "Invalid email or password");
        return;
      }

      toast.success(mode === "signup" ? "Account created. Cloud sync is on." : "Signed in. Cloud sync is on.");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#07090e] px-4">
      <section
        className="w-full max-w-md rounded-3xl p-6"
        style={{
          background: "rgba(255,255,255,0.035)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div
            className="grid size-11 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--accent-primary), #7dd3fc)",
              boxShadow: "0 0 24px rgba(0,229,160,0.25)",
            }}
          >
            <Brain className="size-6" style={{ color: "#07090e" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {mode === "signup" ? "Create your account" : "Sign in to QuizForge"}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {mode === "signup" ? "Save quizzes and attempts in Neon." : "Use cloud sync for your quiz data."}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-2xl p-1" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["signin", "signup"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className="rounded-xl py-2 text-sm font-semibold"
              style={{
                background: mode === value ? "var(--accent-primary)" : "transparent",
                color: mode === value ? "#07090e" : "var(--text-secondary)",
              }}
            >
              {value === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form className="space-y-3" onSubmit={submit}>
          {mode === "signup" && (
            <input
              className="h-12 w-full rounded-2xl bg-transparent px-4 text-sm outline-none"
              style={{ border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
              type="text"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
          <input
            className="h-12 w-full rounded-2xl bg-transparent px-4 text-sm outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="h-12 w-full rounded-2xl bg-transparent px-4 text-sm outline-none"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-primary)" }}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          <button
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold disabled:opacity-60"
            style={{ background: "var(--accent-primary)", color: "#07090e" }}
          >
            {mode === "signup" ? <UserPlus className="size-4" /> : <LogIn className="size-4" />}
            {isPending ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <a href="/" className="mt-5 block text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
          Continue with local fallback
        </a>
      </section>
    </main>
  );
}
