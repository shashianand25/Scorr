"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { syncUser, NeonUser } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<NeonUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      syncUser({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      }).then(({ user: neonUser }) => {
        setProfile(neonUser);
        setLoading(false);
      });
    }
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    try {
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
        await signOut();
        router.push("/login");
      }
    } catch (err: any) {
      alert("Failed to delete account. You may need to sign out and sign back in to verify your identity. Error: " + err.message);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: 32, maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32, background: "linear-gradient(to right, #a5b4fc, #c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Your Profile
      </h1>

      <div style={{ background: "#111827", borderRadius: 24, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid #1f2937", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="Avatar" style={{ width: 100, height: 100, borderRadius: "50%", marginBottom: 16, border: "4px solid #1f2937" }} />
        ) : (
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, border: "4px solid #1f2937" }}>
            <span style={{ fontSize: 40, fontWeight: 700, color: "#fff" }}>{(user.displayName || user.email || "U")[0].toUpperCase()}</span>
          </div>
        )}
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{user.displayName || "Anonymous User"}</h2>
        <p style={{ color: "#9ca3af", marginBottom: 24 }}>{user.email}</p>

        {loading ? (
          <div style={{ color: "#6b7280", fontStyle: "italic", marginBottom: 32 }}>Loading stats...</div>
        ) : profile ? (
          <div style={{ display: "flex", gap: 16, width: "100%", marginBottom: 32 }}>
            <div style={{ flex: 1, background: "#0b0f1a", padding: 16, borderRadius: 16, textAlign: "center", border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#6366f1" }}>{profile.level}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Level</div>
            </div>
            <div style={{ flex: 1, background: "#0b0f1a", padding: 16, borderRadius: 16, textAlign: "center", border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#8b5cf6" }}>{profile.xp}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>XP</div>
            </div>
            <div style={{ flex: 1, background: "#0b0f1a", padding: 16, borderRadius: 16, textAlign: "center", border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#f59e0b" }}>{profile.streak} 🔥</div>
              <div style={{ fontSize: 12, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>Streak</div>
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 16, width: "100%" }}>
          <button onClick={signOut} style={{ flex: 1, background: "#1f2937", color: "#fff", border: "none", padding: "12px 0", borderRadius: 12, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#374151"} onMouseOut={e => e.currentTarget.style.background = "#1f2937"}>
            Sign Out
          </button>
          <button onClick={handleDeleteAccount} style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)", padding: "12px 0", borderRadius: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"} onMouseOut={e => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
