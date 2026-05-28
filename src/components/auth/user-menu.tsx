"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="size-4 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:bg-white/10"
        style={{ color: "var(--text-primary)" }}
      >
        <User className="size-4" />
        Sign In
      </Link>
    );
  }

  const { user } = session;
  const initials = user.name
    ? user.name.substring(0, 2).toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() ?? "U";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl py-1.5 pl-2 pr-3 transition-colors hover:bg-white/5"
      >
        <div
          className="grid size-8 place-items-center rounded-lg text-xs font-bold"
          style={{ background: "var(--accent-primary)", color: "#07090e" }}
        >
          {initials}
        </div>
        <span className="max-w-[120px] truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {user.name || user.email}
        </span>
        <ChevronDown className="size-3.5" style={{ color: "var(--text-tertiary)" }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl p-1"
              style={{
                background: "rgba(10, 14, 22, 0.98)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              }}
            >
              <div className="px-3 py-2.5 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-zinc-400">{user.email}</p>
              </div>

              <button
                onClick={async () => {
                  setIsOpen(false);
                  await signOut({ redirect: false });
                  router.push("/");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
