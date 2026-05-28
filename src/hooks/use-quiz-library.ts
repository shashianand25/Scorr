"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { parseQst } from "@/lib/qst/parser";
import type { QstParseResult } from "@/lib/qst/types";
import type { SavedQuiz, QuizAttempt } from "@/components/quiz-types";

const STORAGE_KEY = "quizforge-library-v1";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFromStorage(): SavedQuiz[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedQuiz[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(quizzes: SavedQuiz[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
  } catch {
    // Storage full or unavailable
  }
}

export function useQuizLibrary() {
  const { data: session, status } = useSession();
  const [library, setLibrary] = useState<SavedQuiz[]>([]);
  const [ready, setReady] = useState(false);
  const isCloud = status === "authenticated";

  useEffect(() => {
    setLibrary(loadFromStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/me/quizzes")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload: { quizzes: SavedQuiz[] }) => {
        if (cancelled) return;
        setLibrary(payload.quizzes);
        saveToStorage(payload.quizzes);
        setReady(true);
      })
      .catch(() => {
        setLibrary(loadFromStorage());
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const persist = useCallback((next: SavedQuiz[]) => {
    setLibrary(next);
    saveToStorage(next);
  }, []);

  /** Add a new quiz from raw QST source. Returns the saved quiz. */
  const addQuiz = useCallback(
    (parsed: QstParseResult, fileName: string, source: string): SavedQuiz => {
      const quiz: SavedQuiz = {
        id: genId(),
        title: parsed.data.metadata.title ?? fileName.replace(/\.[^.]+$/, ""),
        fileName,
        source,
        questionCount: parsed.data.questions.length,
        category: parsed.data.metadata.category,
        savedAt: Date.now(),
        attempts: [],
      };
      const next = [quiz, ...library];
      setLibrary(next);
      saveToStorage(next);
      if (isCloud) {
        fetch("/api/me/quizzes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source, publish: false }),
        })
          .then((response) => (response.ok ? response.json() : Promise.reject()))
          .then((payload: { quiz: SavedQuiz }) => {
            setLibrary((current) => {
              const synced = current.map((item) => item.id === quiz.id ? { ...payload.quiz, fileName, source } : item);
              saveToStorage(synced);
              return synced;
            });
          })
          .catch(() => {
            // The local copy remains available when the network or auth session is unavailable.
          });
      }
      // Return synchronously with the quiz object
      return quiz;
    },
    [isCloud, library]
  );

  /** Replace an existing quiz's source with a new upload */
  const updateQuiz = useCallback(
    (id: string, parsed: QstParseResult, fileName: string, source: string) => {
      const next = library.map((q) =>
        q.id === id
          ? {
              ...q,
              title: parsed.data.metadata.title ?? fileName.replace(/\.[^.]+$/, ""),
              fileName,
              source,
              questionCount: parsed.data.questions.length,
              category: parsed.data.metadata.category,
            }
          : q
      );
      persist(next);
    },
    [library, persist]
  );

  /** Record a completed quiz attempt */
  const recordAttempt = useCallback(
    (quizId: string, attempt: Omit<QuizAttempt, "id">) => {
      const full: QuizAttempt = { ...attempt, id: genId() };
      const next = library.map((q) =>
        q.id === quizId ? { ...q, attempts: [full, ...q.attempts].slice(0, 50) } : q
      );
      persist(next);
      const quiz = library.find((q) => q.id === quizId);
      const remoteId = quiz?.remoteId ?? quiz?.id;
      if (isCloud && remoteId) {
        fetch(`/api/me/quizzes/${remoteId}/attempts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(full),
        }).catch(() => {
          // Local attempt history is still retained if cloud sync fails.
        });
      }
    },
    [isCloud, library, persist]
  );

  /** Delete a quiz from the library */
  const deleteQuiz = useCallback(
    (id: string) => {
      const quiz = library.find((q) => q.id === id);
      persist(library.filter((q) => q.id !== id));
      const remoteId = quiz?.remoteId ?? quiz?.id;
      if (isCloud && remoteId) {
        fetch(`/api/me/quizzes/${remoteId}`, { method: "DELETE" }).catch(() => {});
      }
    },
    [isCloud, library, persist]
  );

  /** Delete a single attempt from a quiz */
  const deleteAttempt = useCallback(
    (quizId: string, attemptId: string) => {
      const next = library.map((q) =>
        q.id === quizId ? { ...q, attempts: q.attempts.filter((a) => a.id !== attemptId) } : q
      );
      persist(next);
      const quiz = library.find((q) => q.id === quizId);
      const remoteId = quiz?.remoteId ?? quiz?.id;
      if (isCloud && remoteId) {
        fetch(`/api/me/quizzes/${remoteId}/attempts/${attemptId}`, { method: "DELETE" }).catch(() => {});
      }
    },
    [isCloud, library, persist]
  );

  /** Get a quiz and its re-parsed data */
  const getQuiz = useCallback(
    (id: string): { quiz: SavedQuiz; parsed: QstParseResult } | null => {
      const quiz = library.find((q) => q.id === id);
      if (!quiz) return null;
      return { quiz, parsed: parseQst(quiz.source) };
    },
    [library]
  );

  // Computed stats
  const stats = {
    totalQuizzes: library.length,
    totalQuestions: library.reduce((s, q) => s + q.questionCount, 0),
    totalAttempts: library.reduce((s, q) => s + q.attempts.length, 0),
    bestScore: library.reduce((best, q) => {
      const qBest = q.attempts.reduce((b, a) => Math.max(b, a.score), 0);
      return Math.max(best, qBest);
    }, 0),
  };

  const storageMode = isCloud ? "cloud" : "local";

  return { library, ready: ready && status !== "loading", stats, addQuiz, updateQuiz, recordAttempt, deleteQuiz, deleteAttempt, getQuiz, storageMode, user: session?.user } as const;
}
