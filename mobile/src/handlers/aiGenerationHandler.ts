import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchAppConfig,
  fetchGeminiKey,
  checkAiDailyLimit,
  checkMasterQuizCache,
  saveMasterQuiz,
  parsePdfFromBackend,
  parsePptFromBackend,
} from "../lib/api";
import { parseQstText, questionsToSourceText } from "../utils/quizParser";
import { logger } from "../lib/logger";

/**
 * handleGenerateWithAI — AI quiz generation pipeline.
 * Extracted from HomeScreen god-file.
 * Receives all dependencies via the `ctx` context object.
 */
export function createAIGenerationHandler(ctx: {
  setAiGenPhase: (v: any) => void;
  setAiGenConnectionLost: (v: boolean) => void;
  aiGenAbortControllerRef: React.MutableRefObject<AbortController | null>;
  aiGenCancelledRef: React.MutableRefObject<boolean>;
  appConfig: any;
  firebaseUser: any;
  showBottomPillToast: (msg: string, opts?: any) => void;
  setQuizzes: (fn: any) => void;
  quizzesRef: React.MutableRefObject<any[]>;
  storageKey: (key: string) => string;
  setShowQuizCreatedModal: (v: any) => void;
  setAiGenCharCount: (v: number) => void;
  pendingDeleteIdsRef: React.MutableRefObject<Set<string>>;
  t: (key: string, opts?: any) => string;
  [key: string]: any;
}) {
  return async function handleGenerateWithAI(text: string, options?: any) {
    const {
      setAiGenPhase, setAiGenConnectionLost, aiGenAbortControllerRef,
      aiGenCancelledRef, appConfig, firebaseUser, showBottomPillToast,
      setQuizzes, quizzesRef, storageKey, setShowQuizCreatedModal,
      setAiGenCharCount, pendingDeleteIdsRef, t,
    } = ctx;

    // ── Reset cancellation and initialize master abort controller ───────────
    aiGenCancelledRef.current = false;
    const abortController = new AbortController();
    aiGenAbortControllerRef.current = abortController;

    // ── Require sign-in ────────────────────────────────────────────────────
    if (!firebaseUser) {
      setAiGenPhase(null);
      Alert.alert(
        "Sign In Required",
        "Please sign in to generate quizzes with AI."
      );
      return;
    }

    // ── Pre-flight: try to detect if the uploaded file is already valid .qst format ──
    // If the file itself contains parseable questions with at least one correct answer,
    // skip AI entirely and import it directly — fast, free, and no quota used.
    try {
      const quickParsed = parseQstText(text);
      const hasValidQuestions = quickParsed.questions.length >= 1 &&
        quickParsed.questions.some((q: any) =>
          q.answers && q.answers.length >= 2 && q.answers.some((a: any) => a.isCorrect === true)
        );
      if (hasValidQuestions) {
        console.log(`[AI Generation] Detected valid .qst format with ${quickParsed.questions.length} question(s). Skipping AI — importing directly.`);
        // Dismiss the "generating" spinner that AppModals set, then import directly
        setAiGenPhase(null);
        handleImportQst(text, fileName);
        setCustomToast({
          message: `✨ Imported ${quickParsed.questions.length} question${quickParsed.questions.length !== 1 ? "s" : ""} directly from your file — no AI needed!`,
          icon: "checkmark-circle",
          color: "#10b981",
        });
        setTimeout(() => setCustomToast(null), 4500);
        return;
      }
    } catch {
      // Parsing failed — not a valid .qst file. Fall through to normal AI generation.
    }

    // ── Fast internet check ────────────────────────────────────────────────
    if (!isConnected) {
      setAiGenPhase(null);
      Alert.alert(
        "No Internet Connection",
        "AI quiz generation requires an active internet connection. Please check your network and try again."
      );
      return;
    }

    setAiGenCharCount(text.length);
    setAiGenPhase("generating");
    setAiGenConnectionLost(false);
    const _aiGenStartMs = Date.now();
    const activeLang = (i18n.language || savedAppLanguage || "en").toLowerCase();
    let computedHash: string | null = null;

    // ── Check Master Quiz Cache for Exact Content Match ───────────────────
    if (text && text !== "__VISUAL__") {
      try {
        computedHash = await computeContentHash(text, activeLang);
        if (aiGenCancelledRef.current) return;
        console.log(`[AI Generation] Computed content hash: ${computedHash}`);
        const { hit, masterQuiz } = await checkMasterQuizCache(computedHash, activeLang);
        if (aiGenCancelledRef.current) return;
        if (hit && masterQuiz && masterQuiz.sourceText) {
          console.log(`[AI Generation] ⚡ Cache HIT for master quiz: ${masterQuiz.id}`);
          const parsed = parseQstText(masterQuiz.sourceText);
          if (parsed && (parsed.questions.length > 0 || (parsed.flashcards && parsed.flashcards.length > 0))) {
            const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const title = (masterQuiz.title || fileName).replace(/\.[^.]+$/, "");
            const newQuiz: any = {
              id: localId,
              masterQuizId: masterQuiz.id,
              title,
              questions: parsed.questions.length,
              category: masterQuiz.category || "AI Generated",
              time: "Just now",
              flashcards: parsed.flashcards || [],
              questionsList: parsed.questions.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) })),
              sourceText: masterQuiz.sourceText,
              attempts: [],
              wrongQuestions: [],
              uniqueCorrectIds: [],
            };

            // Check if user already has this identical quiz in their library (by masterQuizId or content fingerprint)
            let existingQuiz = quizzesRef.current.find((q: any) => (
              (q.masterQuizId && q.masterQuizId === masterQuiz.id) ||
              (q.master_quiz_id && q.master_quiz_id === masterQuiz.id)
            ));

            if (!existingQuiz) {
              const newFp = await computeQuizFingerprint(newQuiz);
              if (newFp) {
                for (const q of quizzesRef.current) {
                  const curFp = await computeQuizFingerprint(q);
                  if (curFp && curFp === newFp) {
                    existingQuiz = q;
                    break;
                  }
                }
              }
            }

            let quizToOpen = newQuiz;

            if (existingQuiz) {
              console.log("[AI Cache] Found existing identical quiz in library — updating canonical:", existingQuiz.id);
              const merged = mergeQuizPersonalState(existingQuiz, [newQuiz]);
              quizToOpen = merged;
              setQuizzes((prev: any[]) => {
                const updated = prev.map((q: any) => q.id === existingQuiz.id ? merged : q).filter((q: any) => q.id !== localId);
                AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(updated)).catch(() => {});
                return updated;
              });
            } else {
              setQuizzes((prev: any[]) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
              AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify([newQuiz, ...quizzesRef.current.filter((q: any) => q.id !== newQuiz.id)])).catch(() => {});
              trackQuizCreated({ source: "ai_cache_hit", questionCount: parsed.questions.length, flashcardCount: (parsed.flashcards || []).length });

              if (firebaseUser && neonUserReadyRef.current) {
                createMobileQuiz({
                  id: localId,
                  userId: firebaseUser.uid,
                  masterQuizId: masterQuiz.id,
                  title,
                  category: masterQuiz.category || "AI Generated",
                  questionCount: newQuiz.questions,
                  sourceText: "",
                }).then(({ quiz: saved }) => {
                  if (saved) setQuizzes((prev: any[]) => prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q));
                }).catch(() => {});
              }
            }

            setAiGenPhase(null);
            showBottomPillToast(t('generation.instant_load') || "⚡ Instant load · No AI used", {
              icon: "flash",
              color: "#38bdf8",
              durationMs: 2600
            });
            setTimeout(() => {
              setActiveTab("insights");
              setViewingInsightsQuiz(quizToOpen);
              setViewingInsightsQuizFromTab("home");
            }, 250);
            return;
          }
        }
      } catch (cacheErr) {
        logger.warn("AI Generation",  Cache check warning, falling back to generation:", cacheErr);
      }
    }

    try {
      if (aiGenCancelledRef.current) return;

      // ── Helper: wait for connection to resume (max 25s) ─────────────────
      const waitForConnection = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          let resolved = false;
          let unsubscribe: (() => void) | null = null;

          const cleanup = () => {
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
          };

          const deadline = setTimeout(() => {
            cleanup();
            if (!resolved) {
              resolved = true;
              reject(new Error("Connection lost during generation. Please check your internet and try again."));
            }
          }, 25000);

          unsubscribe = NetInfo.addEventListener(state => {
            const connected = state.isConnected && state.isInternetReachable !== false;
            if (connected && !resolved) {
              resolved = true;
              clearTimeout(deadline);
              cleanup();
              setTimeout(resolve, 800);
            }
          });
        });
      };

      // ── Resilient fetchChunk: auto-pause and retry once on network drop ─
      const fetchChunkWithRetry = async (chunk: string, signal?: AbortSignal, isRetry = false): Promise<string> => {
        try {
          if (aiGenCancelledRef.current || abortController.signal.aborted) {
            throw new Error("GENERATION_CANCELLED");
          }
          return await fetchChunk(chunk, signal);
        } catch (err: any) {
          if (aiGenCancelledRef.current || abortController.signal.aborted || err?.message === "GENERATION_CANCELLED") {
            throw new Error("GENERATION_CANCELLED");
          }
          // Don't retry if this was already a retry attempt
          if (isRetry) throw err;
          const msg = err?.message?.toLowerCase() ?? "";
          const isNetworkErr = (
            msg.includes("network") ||
            msg.includes("failed to fetch") ||
            msg.includes("fetch failed") ||
            msg.includes("econnrefused") ||
            msg.includes("unknownhost") ||
            msg.includes("timeout") ||
            err?.name === "AbortError"
          );
          if (!isNetworkErr) throw err;
          // Show paused state in UI
          setAiGenConnectionLost(true);
          console.log("[AI Generation] Network dropped / timeout — waiting for reconnect…");
          await waitForConnection();
          if (aiGenCancelledRef.current) throw new Error("GENERATION_CANCELLED");
          setAiGenConnectionLost(false);
          console.log("[AI Generation] Reconnected — resuming chunk…");
          return await fetchChunkWithRetry(chunk, undefined, true);
        }
      };

      // Always fetch fresh config so feature flags reflect the live backend value
      const { config: fetchedConfig, error } = await fetchAppConfig();
      if (aiGenCancelledRef.current) return;
      if (error || !fetchedConfig) {
        throw new Error(error || "Could not fetch App configuration from server.");
      }
      const config = fetchedConfig;
      setAppConfig(config);

      // ── Emergency kill-switch: disableAI flag ──────────────────────────
      if (config.featureFlags?.disableAI) {
        setAiGenPhase(null);
        Alert.alert(
          "AI Temporarily Unavailable",
          "Quiz generation is currently disabled while we perform maintenance. Please try again shortly."
        );
        return;
      }

      // ── Daily generation limit ──────────────────────────────────────────
      if (config.aiConfig?.maxDailyGenerations) {
        const { allowed, limit } = await checkAiDailyLimit(firebaseUser.uid);
        if (aiGenCancelledRef.current) return;
        if (!allowed) {
          setAiGenPhase(null);
          Alert.alert(
            "Daily Limit Reached",
            `You've used all ${limit} AI generations for today. Your limit resets at midnight.`
          );
          return;
        }
      }

      const aiConfig = config.aiConfig;
      const GEMINI_URL = `${aiConfig.modelUrl}?key=${aiConfig.geminiKey}`;

      // ── Visual mode: image-based PDF or PPTX — send file directly to Gemini ──
      if (text === "__VISUAL__" && fileUri) {
        if (!aiConfig.promptTemplateVisual) {
          throw new Error("Visual prompt template not available. Please check your network and try again.");
        }
        console.log(`[AI Generation] Visual mode — reading ${fileExt?.toUpperCase() || "file"} as base64 and sending to Gemini`);
        const base64Data = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        if (aiGenCancelledRef.current) return;
        const mimeType = (fileExt === "pptx" || fileExt === "ppt")
          ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
          : "application/pdf";
        const maxOutputTokens = aiConfig.maxOutputTokens || 65536;
        const temperature = aiConfig.temperature ?? 0.2;
        const visualRes = await fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: aiConfig.promptTemplateVisual },
            ]}],
            generationConfig: { maxOutputTokens, temperature },
          }),
          signal: abortController.signal,
        });
        if (aiGenCancelledRef.current) return;
        const visualJson = await visualRes.json();
        if (!visualRes.ok) throw new Error(visualJson?.error?.message || visualRes.statusText);
        const visualRaw = visualJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const parsed = parseQstText(visualRaw);
        if (!parsed || (parsed.questions.length === 0 && (!parsed.flashcards || parsed.flashcards.length === 0))) {
          throw new Error("Gemini couldn't generate questions from this file. The content may be too minimal or unclear.");
        }
        const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const title = (parsed.title || fileName).replace(/\.[^.]+$/, "");
        const newQuiz: any = {
          id: localId, title, questions: parsed.questions.length,
          category: "AI Generated", time: "Just now",
          flashcards: parsed.flashcards || [],
          questionsList: parsed.questions.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) })),
          attempts: [], wrongQuestions: [], uniqueCorrectIds: [],
        };
        AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify([newQuiz, ...quizzesRef.current.filter((q: any) => q.id !== newQuiz.id)])).catch(() => {});
        setQuizzes((prev: any[]) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
        trackQuizCreated({ source: "ai", questionCount: parsed.questions.length, flashcardCount: (parsed.flashcards || []).length });
        if (firebaseUser && neonUserReadyRef.current) {
          createMobileQuiz({ id: localId, userId: firebaseUser.uid, title, category: "AI Generated",
            questionCount: newQuiz.questionsList?.length ?? newQuiz.questions,
            sourceText: "",
          }).then(({ quiz: saved }) => {
            if (saved) setQuizzes((prev: any[]) => prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q));
          }).catch(() => {});
        }
        setAiGenPhase(null);
        setShowQuizCreatedModal({ title, count: newQuiz.questions });
        setActiveTab("home");
        return;
      }

      // ── Build prompt for a single chunk ────────────────────────────────
      const buildPromptForChunk = (chunk: string): string => {
        const docSize = chunk.length;
        if (!aiConfig.generationRanges || aiConfig.generationRanges.length === 0) {
          throw new Error("AI configuration is incomplete (missing generationRanges). Please try again.");
        }
        const ranges = aiConfig.generationRanges;
        const matchingRange = ranges.find((r: any) => docSize < r.max) || ranges[ranges.length - 1];
        const minFlashcards = matchingRange.minF;
        const expectedFlashcards = matchingRange.expF;
        const scaleRangeBy1_3 = (rangeStr: string): string => {
          const parts = rangeStr.split("-").map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return `${Math.round(parts[0] * 1.3)}-${Math.round(parts[1] * 1.3)}`;
          }
          return rangeStr;
        };
        const minMcqs = scaleRangeBy1_3(minFlashcards);
        const expectedMcqs = scaleRangeBy1_3(expectedFlashcards);

        // Detect user's selected language: if Russian or Kazakh, use Russian prompt template
        const activeLang = (i18n.language || savedAppLanguage || "en").toLowerCase();
        const isRuOrKk = activeLang.startsWith("ru") || activeLang.startsWith("kk");
        const templateToUse = (isRuOrKk && aiConfig.promptTemplateRu)
          ? aiConfig.promptTemplateRu
          : aiConfig.promptTemplate;

        if (!templateToUse) {
          throw new Error("AI configuration is incomplete (missing promptTemplate). Please check your network and try again.");
        }
        let prompt = templateToUse.replace("[PASTE YOUR TEXT HERE]", chunk);
        prompt = prompt.replace(/\{\{MIN_FLASHCARDS\}\}/g, minFlashcards);
        prompt = prompt.replace(/\{\{EXPECTED_FLASHCARDS\}\}/g, expectedFlashcards);
        prompt = prompt.replace(/\{\{MIN_MCQS\}\}/g, minMcqs);
        prompt = prompt.replace(/\{\{EXPECTED_MCQS\}\}/g, expectedMcqs);
        return prompt;
      };

      // ── Fetch one chunk from Gemini (with abort control & per-request timeout) ──
      const fetchChunk = (chunk: string, signal?: AbortSignal): Promise<string> => {
        if (aiGenCancelledRef.current || abortController.signal.aborted) {
          throw new Error("GENERATION_CANCELLED");
        }
        const prompt = buildPromptForChunk(chunk);
        const maxOutputTokens = aiConfig.maxOutputTokens || 65536;
        const temperature = aiConfig.temperature ?? 0.2;
        
        const chunkAbortCtrl = new AbortController();
        const chunkTimer = setTimeout(() => {
          try { chunkAbortCtrl.abort(); } catch {}
        }, 45000); // 45s per-chunk timeout ensures request never hangs indefinitely

        const onMasterAbort = () => {
          try { chunkAbortCtrl.abort(); } catch {}
        };
        abortController.signal.addEventListener("abort", onMasterAbort);

        return fetch(GEMINI_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens, temperature } }),
          signal: signal || chunkAbortCtrl.signal,
        }).then(async r => {
          clearTimeout(chunkTimer);
          abortController.signal.removeEventListener("abort", onMasterAbort);
          if (aiGenCancelledRef.current || abortController.signal.aborted) throw new Error("GENERATION_CANCELLED");
          if (!r.ok) throw new Error((await r.json())?.error?.message || r.statusText);
          return (await r.json())?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }).catch(err => {
          clearTimeout(chunkTimer);
          abortController.signal.removeEventListener("abort", onMasterAbort);
          if (aiGenCancelledRef.current || abortController.signal.aborted) {
            throw new Error("GENERATION_CANCELLED");
          }
          throw err;
        });
      };

      const CHUNK_SIZE = aiConfig.chunkSize || 12000;
      let chunks: string[] = [];
      for (let i = 0; i < text.length; i += CHUNK_SIZE) chunks.push(text.slice(i, i + CHUNK_SIZE));
      if (chunks.length > (aiConfig.maxChunks || 10)) chunks = chunks.slice(0, aiConfig.maxChunks || 10);
      const CONCURRENCY = Math.min(chunks.length, Math.min(aiConfig.concurrencyLimit || 10, 2)); // mobile concurrency 2 prevents socket choking
      console.log(`[AI Generation] Document split into ${chunks.length} chunk(s) (Chunk size: ${CHUNK_SIZE} chars | Concurrency: sending ${CONCURRENCY} chunk(s) in parallel)`);
      trackAiGenerationStarted({ charCount: text.length, chunkCount: chunks.length });

      const genStartTime = Date.now();
      const HARD_TIMEOUT_MS = 60000;
      let timedOutEarly = false;
      let nextChunkIndex = 0;
      const results: string[] = [];

      // ── Phase 1: Process initial batch (up to 2 chunks) in foreground ──
      const FOREGROUND_LIMIT = Math.min(chunks.length, 2);
      for (let i = 0; i < FOREGROUND_LIMIT; i += CONCURRENCY) {
        if (Date.now() - genStartTime >= HARD_TIMEOUT_MS || aiGenCancelledRef.current) {
          timedOutEarly = true;
          nextChunkIndex = i;
          break;
        }
        const batch = chunks.slice(i, i + CONCURRENCY);
        console.log(`[AI Generation] Sending foreground batch of ${batch.length} chunk(s) in parallel (chunks ${i + 1}–${i + batch.length} of ${chunks.length})`);
        try {
          const batchResults = await Promise.all(
            batch.map(chunk => fetchChunkWithRetry(chunk))
          );
          if (aiGenCancelledRef.current) return;
          results.push(...batchResults);
          nextChunkIndex = i + batch.length;
        } catch (batchErr) {
          if (aiGenCancelledRef.current) return;
          if (results.length > 0) {
            timedOutEarly = true;
            nextChunkIndex = i;
            break;
          } else {
            throw batchErr;
          }
        }
      }

      if (chunks.length > FOREGROUND_LIMIT && nextChunkIndex < chunks.length) {
        timedOutEarly = true;
      }

      if (aiGenCancelledRef.current) return;

      const raw = results.join("\n");
      const parsed = parseQstText(raw);

      if (!parsed || (parsed.questions.length === 0 && (!parsed.flashcards || parsed.flashcards.length === 0))) {
        throw new Error("We couldn't generate enough questions. Please try again.");
      }

      const localId = `ai_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const title = (parsed.title || fileName).replace(/\.[^.]+$/, "");
      const newQuiz: any = {
        id: localId,
        title,
        questions: parsed.questions.length,
        category: "AI Generated",
        time: "Just now",
        flashcards: parsed.flashcards || [],
        questionsList: parsed.questions.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) })),
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
      };
      setQuizzes((prev: any[]) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
      trackAiGenerationSucceeded({
        questionCount: parsed.questions.length,
        chunkCount: chunks.length,
        durationMs: Date.now() - _aiGenStartMs,
        hadBackgroundPhase: timedOutEarly,
      });
      trackQuizCreated({ source: "ai", questionCount: parsed.questions.length, flashcardCount: (parsed.flashcards || []).length });

      // ── Initial Neon sync & Master Quiz Cache creation ───────────────────
      let initialNeonId: string | null = null;
      const initialSourceText = questionsToSourceText(title, "AI Generated", newQuiz.questionsList, newQuiz.flashcards);

      if (computedHash) {
        saveMasterQuiz({
          contentHash: computedHash,
          language: activeLang,
          title,
          category: "AI Generated",
          questionCount: newQuiz.questions,
          flashcardCount: (newQuiz.flashcards || []).length,
          sourceText: initialSourceText,
          userId: firebaseUser ? firebaseUser.uid : undefined
        }).then(({ masterQuiz }) => {
          if (masterQuiz?.id) {
            newQuiz.masterQuizId = masterQuiz.id;
            setQuizzes((prev: any[]) => prev.map((q) => q.id === localId ? { ...q, masterQuizId: masterQuiz.id } : q));
            if (firebaseUser && neonUserReadyRef.current) {
              updateMobileQuiz({ userId: firebaseUser.uid, quizId: localId, masterQuizId: masterQuiz.id }).catch(() => {});
            }
          }
        }).catch(err => logger.warn("MasterQuiz",  Cache save warning:", err));
      }

      if (firebaseUser && neonUserReadyRef.current) {
        createMobileQuiz({
          id: localId,
          userId: firebaseUser.uid,
          masterQuizId: newQuiz.masterQuizId || null,
          title,
          category: "AI Generated",
          questionCount: newQuiz.questions,
          sourceText: initialSourceText,
        }).then(({ quiz: saved, error }) => {
          if (saved && !error) {
            initialNeonId = saved.id;
            setQuizzes((prev: any[]) => prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q));
          }
        });
      }

      // ── Dismiss generation screen & navigate ───────────────────────────
      setAiGenPhase(null);
      setTimeout(() => {
        setActiveTab("insights");
        setViewingInsightsQuiz(newQuiz);
        setViewingInsightsQuizFromTab("home");
      }, 300);

      // ── Phase 2: Kick off remaining chunks in background ───────────────
      const remainingChunks = chunks.slice(nextChunkIndex);
      if (remainingChunks.length > 0) {
        // Show toast: quiz is ready, more coming
        setCustomToast({
          message: `Created ${parsed.questions.length} questions. More are on the way…`,
          icon: "time-outline",
          color: "#6366f1",
        });
        setTimeout(() => setCustomToast(null), 5000);

        // Detached background Promise — no await, never blocks UI
        (async () => {
          try {
            console.log(`[AI Background] Continuing ${remainingChunks.length} remaining chunk(s) (sending in batches of ${CONCURRENCY})…`);
            const bgResults: string[] = [];
            for (let i = 0; i < remainingChunks.length; i += CONCURRENCY) {
              const batch = remainingChunks.slice(i, i + CONCURRENCY);
              console.log(`[AI Background] Sending background batch of ${batch.length} chunk(s) in parallel`);
              const batchResults = await Promise.all(batch.map(chunk => fetchChunkWithRetry(chunk)));
              bgResults.push(...batchResults);
            }
            const bgParsed = parseQstText(bgResults.join("\n"));
            const extraQuestions = bgParsed?.questions || [];
            if (extraQuestions.length > 0) {
              let updatedQuestionsList: any[] = [];
              let totalQuestionCount = 0;

              setQuizzes(prev => prev.map(q => {
                if (q.id !== localId && q.neonId !== initialNeonId) return q;
                const merged = [
                  ...q.questionsList,
                  ...extraQuestions.map((eq: any) => ({ ...eq, answers: [...eq.answers].sort(() => Math.random() - 0.5) })),
                ];
                updatedQuestionsList = merged;
                totalQuestionCount = merged.length;
                return { ...q, questionsList: merged, questions: merged.length };
              }));

              // Also update currently viewed screens so the user sees the new questions instantly
              setViewingInsightsQuiz((prev: any) => {
                if (!prev || (prev.id !== localId && prev.id !== initialNeonId && prev.neonId !== initialNeonId)) return prev;
                return { ...prev, questionsList: updatedQuestionsList, questions: totalQuestionCount };
              });

              setSelectedQuiz((prev: any) => {
                if (!prev || (prev.id !== localId && prev.id !== initialNeonId && prev.neonId !== initialNeonId)) return prev;
                return { ...prev, questionsList: updatedQuestionsList, questions: totalQuestionCount };
              });

              setActiveSession((prev: any) => {
                if (!prev || (prev.quizId !== localId && prev.quizId !== initialNeonId)) return prev;
                return { ...prev, questions: updatedQuestionsList };
              });

              // Sync updated quiz to Neon using clean questionsToSourceText format
              if (firebaseUser && neonUserReadyRef.current) {
                const cleanSourceText = questionsToSourceText(title, "AI Generated", updatedQuestionsList, newQuiz.flashcards);
                const targetNeonId = initialNeonId;
                if (targetNeonId) {
                  updateMobileQuiz({
                    userId: firebaseUser.uid,
                    quizId: targetNeonId,
                    questionCount: totalQuestionCount,
                    sourceText: cleanSourceText,
                  }).catch(err => logger.warn("App", "[NeonSync-BGUpdate] failed:", err));
                } else {
                  createMobileQuiz({
                    id: localId,
                    userId: firebaseUser.uid,
                    title,
                    category: "AI Generated",
                    questionCount: totalQuestionCount,
                    sourceText: cleanSourceText
                  }).then(({ quiz: saved, error }) => {
                    if (saved && !error) setQuizzes(prev => prev.map(q => q.id === localId ? { ...q, neonId: saved.id } : q));
                  });
                }
              }

              setCustomToast({
                message: `✨ ${extraQuestions.length} more question${extraQuestions.length !== 1 ? "s" : ""} added to your quiz!`,
                icon: "add-circle",
                color: "#10b981",
              });
              setTimeout(() => setCustomToast(null), 4500);
              console.log(`[AI Background] Appended ${extraQuestions.length} extra question(s) to quiz ${localId}`);
            }
          } catch (bgErr) {
            logger.error("App", "[AI Background] Background chunk generation failed:", bgErr);
          }
        })();
      }

    } catch (err: any) {
      if (aiGenCancelledRef.current || err?.message === "GENERATION_CANCELLED" || err?.name === "AbortError") {
        console.log("[AI Generation] Cancelled by user — cleaning up silently.");
        setAiGenPhase(null);
        setAiGenConnectionLost(false);
        return;
      }
      setAiGenPhase(null);
      setAiGenConnectionLost(false);
      let errMsg = err?.message || "Unknown error";
      // Classify for analytics — no raw message (could contain user content)
      const _analyticsErrType: "network" | "limit_reached" | "no_questions" | "disabled" | "unknown" =
        errMsg.includes("Daily Limit") ? "limit_reached" :
        errMsg.includes("couldn't generate") ? "no_questions" :
        errMsg.includes("Temporarily Unavailable") ? "disabled" :
        (errMsg.includes("generativelanguage") || errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("fetch")) ? "network" :
        "unknown";
      trackAiGenerationFailed({ errorType: _analyticsErrType, chunkCount: 0 });
      if (errMsg.includes("couldn't generate enough questions")) {
        errMsg = "We couldn't generate enough questions. Please try again.";
      } else if (errMsg.includes("generativelanguage.googleapis.com") || errMsg.includes("UnknownHostException") || errMsg.includes("Network request failed") || errMsg.toLowerCase().includes("failed to fetch") || errMsg.includes("Failed to connect to server") || errMsg.toLowerCase().includes("network error") || errMsg.toLowerCase().includes("timeout")) {
        errMsg = t('generation.taking_too_long') || "Generation timed out or connection was interrupted. Please check your connection and try again.";
      }
      const displayMsg = typeof __DEV__ !== 'undefined' && __DEV__ ? errMsg : getUserErrorMessage(errMsg);
      if (Platform.OS === "web") {
        if (confirm(`AI generation failed: ${displayMsg}\n\nWould you like to try again?`)) {
          handleGenerateWithAI(text, fileName);
        }
      } else {
        Alert.alert(
          "Generation Failed",
          displayMsg,
          [
            { text: t('actions.cancel') || "Cancel", style: "cancel" },
            {
              text: "Try Again",
              onPress: () => {
                setTimeout(() => handleGenerateWithAI(text, fileName), 200);
              }
            }
          ]
        );
      }
    }
  };
  };
}
