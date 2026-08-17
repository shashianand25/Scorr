"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { syncUser, NeonUser } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import { useTranslation, SupportedLanguage } from "@/lib/i18n";
import { useToast } from "@/components/ui/ToastPill";

export default function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<NeonUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      syncUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }).then(({ user: neonUser }) => {
        setProfile(neonUser);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        await signOut();
        showToast("Account deleted successfully");
        router.push("/login");
      }
    } catch (err: any) {
      alert("Failed to delete account. You may need to sign out and back in to verify your identity. Error: " + err.message);
    }
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    showToast(`Language changed to ${newLang.toUpperCase()}`, { icon: "🌐" });
  };

  return (
    <div style={{ padding: "36px 24px 80px", maxWidth: 640, margin: "0 auto", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#ffffff", letterSpacing: "-0.6px", marginBottom: 28 }}>
        👤 {t("tabs.profile") || "Profile & Settings"}
      </h1>

      {/* Account Card */}
      <div
        style={{
          background: "#0d111d",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          marginBottom: 28,
        }}
      >
        {user ? (
          <>
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Avatar"
                style={{ width: 90, height: 90, borderRadius: "50%", marginBottom: 16, border: "4px solid rgba(99, 102, 241, 0.3)" }}
              />
            ) : (
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  border: "4px solid rgba(99, 102, 241, 0.3)",
                }}
              >
                <span style={{ fontSize: 36, fontWeight: 800, color: "#fff" }}>
                  {(user.displayName || user.email || "U")[0].toUpperCase()}
                </span>
              </div>
            )}

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", margin: "0 0 4px 0" }}>
              {user.displayName || "Learner"}
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px 0" }}>{user.email}</p>

            {/* Level / Streak / XP Stats */}
            {profile && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", marginBottom: 28 }}>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 16, padding: "16px 12px", textAlign: "center", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#6366f1" }}>{profile.level || 1}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginTop: 4 }}>Level</div>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 16, padding: "16px 12px", textAlign: "center", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#8b5cf6" }}>{profile.xp || 0}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginTop: 4 }}>XP</div>
                </div>
                <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: 16, padding: "16px 12px", textAlign: "center", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b" }}>{profile.streak || 0} 🔥</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", fontWeight: 700, marginTop: 4 }}>Streak</div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              <button
                onClick={signOut}
                style={{
                  flex: 1,
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 14,
                  padding: "14px",
                  color: "#ffffff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Sign Out
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{
                  flex: 1,
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: 14,
                  padding: "14px",
                  color: "#f87171",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete Account
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>👤</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#ffffff", margin: "0 0 6px 0" }}>
              Guest Mode
            </h2>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 24px 0", lineHeight: 1.5 }}>
              Your quizzes and flashcards are saved locally on this browser. Sign in to sync your study progress across devices.
            </p>
            <Link
              href="/login"
              style={{
                display: "block",
                width: "100%",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                borderRadius: 14,
                padding: "16px",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Sign In or Create Account
            </Link>
          </div>
        )}
      </div>

      {/* Settings Section: Language & App Download */}
      <div
        style={{
          background: "#0d111d",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          padding: "28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
          Preferences
        </h3>

        {/* Language Selector */}
        <div>
          <label style={{ display: "block", fontSize: 13, color: "#a5b4fc", fontWeight: 600, marginBottom: 8 }}>
            🌐 App Language
          </label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 12,
              padding: "12px 16px",
              color: "#ffffff",
              fontSize: 14,
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="en" style={{ background: "#111827" }}>English (US / UK)</option>
            <option value="ru" style={{ background: "#111827" }}>Русский (Russian)</option>
            <option value="kk" style={{ background: "#111827" }}>Қазақша (Kazakh)</option>
            <option value="es" style={{ background: "#111827" }}>Español (Spanish)</option>
            <option value="fr" style={{ background: "#111827" }}>Français (French)</option>
            <option value="hi" style={{ background: "#111827" }}>हिन्दी (Hindi)</option>
          </select>
        </div>

        {/* Mobile App Download Card */}
        <div
          style={{
            marginTop: 8,
            padding: "18px",
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
              Get Scorr for Mobile
            </div>
            <div style={{ color: "#9ca3af", fontSize: 12 }}>
              Study on iOS and Android on the go
            </div>
          </div>

          <Link
            href="/download"
            style={{
              background: "#6366f1",
              borderRadius: 10,
              padding: "8px 18px",
              color: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Download App
          </Link>
        </div>
      </div>
    </div>
  );
}
