"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Play,
  Wifi,
  BarChart3,
  Search,
  Command,
  ArrowRight,
  Zap,
  Upload,
  FileJson,
} from "lucide-react";

type CommandItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  category: string;
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  onImport?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onTabChange,
  onImport,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      id: "nav-editor",
      label: "Open Editor",
      description: "QST Parser Studio",
      icon: FileText,
      action: () => { onTabChange("editor"); onClose(); },
      shortcut: "E",
      category: "Navigation",
    },
    {
      id: "nav-player",
      label: "Open Player",
      description: "Quiz player preview",
      icon: Play,
      action: () => { onTabChange("player"); onClose(); },
      shortcut: "P",
      category: "Navigation",
    },
    {
      id: "nav-live",
      label: "Open Live Room",
      description: "Multiplayer session control",
      icon: Wifi,
      action: () => { onTabChange("live"); onClose(); },
      shortcut: "L",
      category: "Navigation",
    },
    {
      id: "nav-analytics",
      label: "Open Analytics",
      description: "Stats and insights",
      icon: BarChart3,
      action: () => { onTabChange("analytics"); onClose(); },
      shortcut: "A",
      category: "Navigation",
    },
    {
      id: "action-import",
      label: "Generate Quiz",
      description: "Import parsed QST to database",
      icon: Zap,
      action: () => { onImport?.(); onClose(); },
      category: "Actions",
    },
    {
      id: "action-upload",
      label: "Upload QST File",
      description: "Load a .txt or .qst file",
      icon: Upload,
      action: () => {
        document.getElementById("file-upload-trigger")?.click();
        onClose();
      },
      category: "Actions",
    },
    {
      id: "action-json",
      label: "Copy JSON Output",
      description: "Copy normalized quiz JSON",
      icon: FileJson,
      action: () => {
        document.getElementById("copy-json-btn")?.click();
        onClose();
      },
      category: "Actions",
    },
  ];

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatFiltered = filtered;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % flatFiltered.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + flatFiltered.length) % flatFiltered.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        flatFiltered[selectedIndex]?.action();
      }
    },
    [isOpen, flatFiltered, selectedIndex, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60"
            style={{ backdropFilter: "blur(8px)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Palette panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-x-0 top-[15vh] z-[101] mx-auto w-full max-w-xl px-4"
            role="dialog"
            aria-label="Command palette"
          >
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                background: "rgba(10, 14, 22, 0.96)",
                border: "1px solid rgba(0, 229, 160, 0.2)",
                boxShadow: "0 0 80px rgba(0, 229, 160, 0.08), 0 32px 64px rgba(0,0,0,0.5)",
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
                <Search className="size-4 shrink-0" style={{ color: "var(--accent-primary)" }} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands, navigate, actions..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-tertiary)]"
                  style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
                />
                <kbd
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "var(--text-secondary)",
                  }}
                >
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto quiz-scrollbar py-2">
                {Object.entries(grouped).length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      No commands match &ldquo;{query}&rdquo;
                    </p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => {
                    return (
                      <div key={category}>
                        <p
                          className="text-label px-4 py-2"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {category}
                        </p>
                        {items.map((item) => {
                          const globalIdx = flatFiltered.indexOf(item);
                          const isSelected = globalIdx === selectedIndex;
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={item.action}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                              style={{
                                background: isSelected
                                  ? "rgba(0, 229, 160, 0.08)"
                                  : "transparent",
                                borderLeft: isSelected
                                  ? "2px solid var(--accent-primary)"
                                  : "2px solid transparent",
                              }}
                            >
                              <div
                                className="grid size-8 shrink-0 place-items-center rounded-lg"
                                style={{
                                  background: isSelected
                                    ? "rgba(0, 229, 160, 0.15)"
                                    : "rgba(255,255,255,0.05)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                }}
                              >
                                <Icon
                                  className="size-3.5"
                                  style={{
                                    color: isSelected
                                      ? "var(--accent-primary)"
                                      : "var(--text-secondary)",
                                  }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="text-sm font-medium"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  {item.label}
                                </p>
                                {item.description && (
                                  <p
                                    className="text-xs"
                                    style={{ color: "var(--text-tertiary)" }}
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {item.shortcut && (
                                  <kbd
                                    className="rounded px-1.5 py-0.5 text-xs"
                                    style={{
                                      background: "rgba(255,255,255,0.05)",
                                      border: "1px solid rgba(255,255,255,0.1)",
                                      color: "var(--text-secondary)",
                                    }}
                                  >
                                    {item.shortcut}
                                  </kbd>
                                )}
                                {isSelected && (
                                  <ArrowRight
                                    className="size-3.5"
                                    style={{ color: "var(--accent-primary)" }}
                                  />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-4 border-t px-4 py-2.5"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-1.5">
                  <Command className="size-3" style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    K to open
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    ↑↓ navigate · ↵ select
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
