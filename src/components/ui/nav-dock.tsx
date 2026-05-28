"use client";

import { motion } from "framer-motion";
import { FileText, Play, Wifi, BarChart3 } from "lucide-react";

type Tab = "editor" | "player" | "live" | "analytics";

const navItems = [
  { value: "editor" as Tab, icon: FileText, label: "Editor" },
  { value: "player" as Tab, icon: Play, label: "Player" },
  { value: "live" as Tab, icon: Wifi, label: "Live" },
  { value: "analytics" as Tab, icon: BarChart3, label: "Analytics" },
];

interface NavDockProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function NavDock({ activeTab, onTabChange }: NavDockProps) {
  return (
    <>
      {/* Desktop floating dock — bottom center */}
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 z-50 hidden -translate-x-1/2 md:block"
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className="flex items-center gap-1 rounded-full px-2 py-2"
          style={{
            background: "rgba(10, 14, 22, 0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {navItems.map(({ value, icon: Icon, label }) => {
            const isActive = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => onTabChange(value)}
                className="relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? "#07090e" : "var(--text-secondary)",
                  minWidth: isActive ? "auto" : undefined,
                }}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--accent-primary)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="size-4" />
                  <span className="hidden sm:block">{label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </motion.nav>

      {/* Mobile bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        role="navigation"
        aria-label="Main navigation"
        style={{
          background: "rgba(7, 9, 14, 0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="grid grid-cols-4">
          {navItems.map(({ value, icon: Icon, label }) => {
            const isActive = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => onTabChange(value)}
                className="flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
                style={{
                  color: isActive ? "var(--accent-primary)" : "var(--text-tertiary)",
                }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-5" />
                {label}
                {isActive && (
                  <div
                    className="absolute bottom-0 h-0.5 w-8 rounded-t-full"
                    style={{ background: "var(--accent-primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export type { Tab };
