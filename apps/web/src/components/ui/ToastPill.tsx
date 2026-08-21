"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface ToastOptions {
  icon?: string;
  color?: string;
  durationMs?: number;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; options?: ToastOptions; id: number } | null>(null);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = Date.now();
    setToast({ message, options, id });
    const duration = options?.durationMs ?? 2800;
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(17, 24, 39, 0.95)",
            border: `1px solid ${toast.options?.color || "#6366f1"}40`,
            borderRadius: 9999,
            padding: "12px 24px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(16px)",
            animation: "toastSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <style>{`
            @keyframes toastSlideUp {
              from { opacity: 0; transform: translate(-50%, 16px) scale(0.96); }
              to { opacity: 1; transform: translate(-50%, 0) scale(1); }
            }
          `}</style>
          {toast.options?.icon === "flash" ? (
            <span style={{ fontSize: 18, color: toast.options?.color || "#38bdf8" }}>⚡</span>
          ) : toast.options?.icon ? (
            <span style={{ fontSize: 18 }}>{toast.options.icon}</span>
          ) : (
            <span style={{ fontSize: 18, color: "#34d399" }}>✓</span>
          )}
          <span
            style={{
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.2px",
              whiteSpace: "nowrap",
            }}
          >
            {toast.message}
          </span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
