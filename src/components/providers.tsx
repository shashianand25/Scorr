"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(13, 17, 26, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 229, 160, 0.2)",
            color: "#e2e8f0",
            borderRadius: "12px",
            fontFamily: "var(--font-geist-sans)",
            fontSize: "0.875rem",
          },
          classNames: {
            toast: "quiz-toast",
            title: "font-semibold",
          },
        }}
      />
    </SessionProvider>
  );
}
