import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share } from "react-native";
import { updateMobileQuiz } from "../lib/api";

/**
 * Quiz session handlers — check answers, navigate, finish session, import, share.
 * Extracted from HomeScreen god-file.
 */
export const quizSessionHandlers = {
  // These are defined inline in HomeScreen and passed via the p prop.
  // See src/app/index.tsx for wiring.
};

// Raw handler implementations (verbatim from index.tsx):
  const handleCheckAnswer = (questionId: string) => {
    if (!activeSession) return;
    const submitted = [...(activeSession.submitted || [])];
    if (!submitted.includes(questionId)) {
      submitted.push(questionId);
      
      // Determine correctness to play sound
      let newCorrectCount = activeSession.correctCount || 0;
      let isAllCorrect = false;
      const currentQuestion = activeSession.questions.find((q: any) => q.id === questionId);
      if (currentQuestion) {
        const selected = activeSession.answers[questionId] || [];
        const correctIds = currentQuestion.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        isAllCorrect = selected.length === correctIds.length && selected.every((id: string) => correctIds.includes(id));
        if (isAllCorrect) {
          playCorrectSound();
          newCorrectCount += 1;
          if (activeSession.isBattle && activeSession.battleRoomCode) {
            updateBattleScore(activeSession.battleRoomCode, activeSession.isHost, newCorrectCount);
          }
        } else {
          playWrongSound();
        }
      }

      setActiveSession({
        ...activeSession,
        submitted,
        correctCount: newCorrectCount
      });

      if (activeSession.isBattle) {
        const cIndex = activeSession.currentIndex;
        setTimeout(() => {
          if (cIndex < activeSession.questions.length - 1) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          } else {
            handleFinishSession();
          }
        }, 700);
      } else if (autoSlideEnabled && isAllCorrect && (activeSession.showAnswerOnSubmit || activeSession.isBattle)) {
        const cIndex = activeSession.currentIndex;
        setTimeout(() => {
          if (cIndex < activeSession.questions.length - 1) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          }
        }, 800);
      }
    }
  };

  const handleAnswerSelect = (question: any, answerId: string) => {
    if (!activeSession) return;
    const isSubmitted = activeSession.submitted?.includes(question.id);
    if (activeSession.showAnswerOnSubmit && isSubmitted) return;

    const answers = { ...activeSession.answers };
    let currentAnswers = answers[question.id] || [];

    if (question.type === "multiple_choice") {
      if (currentAnswers.includes(answerId)) {
        currentAnswers = currentAnswers.filter((id: string) => id !== answerId);
      } else {
        currentAnswers = [...currentAnswers, answerId];
      }
      answers[question.id] = currentAnswers;
      setActiveSession({
        ...activeSession,
        answers
      });
    } else {
      currentAnswers = [answerId];
      answers[question.id] = currentAnswers;

      // Auto-submit single choice questions immediately if showAnswerOnSubmit is enabled
      const submitted = [...(activeSession.submitted || [])];
      let newCorrectCount = activeSession.correctCount || 0;
      
      const correctIds = question.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
      const isAllCorrect = currentAnswers.length === correctIds.length && currentAnswers.every((id: string) => correctIds.includes(id));

      if ((activeSession.showAnswerOnSubmit || activeSession.isBattle) && !submitted.includes(question.id)) {
        submitted.push(question.id);
        
        // Play correct/wrong sound
        if (isAllCorrect) {
          playCorrectSound();
          newCorrectCount += 1;
          
          if (activeSession.isBattle && activeSession.battleRoomCode) {
            updateBattleScore(activeSession.battleRoomCode, activeSession.isHost, newCorrectCount);
          }
        } else {
          playWrongSound();
        }
      }

      setActiveSession({
        ...activeSession,
        answers,
        submitted,
        correctCount: newCorrectCount
      });

      if (activeSession.isBattle) {
        const cIndex = activeSession.currentIndex;
        const isLast = cIndex >= activeSession.questions.length - 1;
        setTimeout(() => {
          if (!isLast) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          } else {
            handleFinishSession();
          }
        }, isLast ? 0 : 700);
      } else if (autoSlideEnabled && isAllCorrect && (activeSession.showAnswerOnSubmit || activeSession.isBattle)) {
        const cIndex = activeSession.currentIndex;
        setTimeout(() => {
          if (cIndex < activeSession.questions.length - 1) {
            const nextIdx = cIndex + 1;
            handleNavigateSession(nextIdx);
            quizFlatListRef.current?.scrollToIndex({ index: nextIdx, animated: true });
          }
        }, 800);
      }
    }
  };

  const handleNavigateSession = (idx: number) => {
    const session = activeSessionRef.current || activeSession;
    if (!session) return;
    setActiveSession({
      ...session,
      currentIndex: idx
    });
    quizNumbersScrollRef.current?.scrollTo({ x: Math.max(0, idx * 48 - SCREEN_WIDTH / 2 + 24), animated: true });
  };

  /** Persist a battle result into local history and clear it from pending queue */
  const saveBattleResult = (
    roomCode: string,
    myScore: number,
    opponentScore: number,
    opponentName: string,
    quizTitle: string,
    effectiveWin: boolean,
    myTime?: number,
    opponentTime?: number,
    questions?: any[],
    answers?: Record<string, string[]>
  ) => {
    const entry = {
      date: Date.now(),
      roomCode,
      quizTitle,
      myScore,
      opponentScore,
      opponentName,
      won: effectiveWin,
      myTime,
      opponentTime,
      questions: questions || [],
      answers: answers || {}
    };
    setBattleHistory(prev => {
      const filtered = roomCode ? prev.filter((p: any) => p.roomCode !== roomCode) : prev;
      const next = [...filtered, entry].slice(-50);
      AsyncStorage.setItem("battle_history", JSON.stringify(next));
      return next;
    });
    trackBattleCompleted({
      won: effectiveWin,
      myScore,
      opponentScore,
      questionCount: (questions || []).length,
    });

    if (firebaseUser) {
      saveBattleHistory({
        userId: firebaseUser.uid,
        roomCode,
        quizTitle,
        myScore,
        opponentScore,
        opponentName,
        won: effectiveWin,
        myTime,
        opponentTime,
        questions,
        answers
      }).catch(console.error);
    }

    if (roomCode) {
      AsyncStorage.getItem("pending_battles").then(val => {
        if (val) {
          try {
            const currentPending = JSON.parse(val);
            const newPending = currentPending.filter((p: any) => p.code !== roomCode);
            AsyncStorage.setItem("pending_battles", JSON.stringify(newPending));
          } catch {}
        }
      });
    }
  };

  const onViewReportCard = (attempt: any, quizId: string) => {
    const q = quizzes.find((qz: any) => qz.id === quizId) || (quizId === "sample_quiz" ? sampleQuiz : null);
    if (q) {
      setViewingReportCardData({ attempt, quiz: q });
    }
  };

  const handleFinishSession = () => {
    const session = activeSessionRef.current || activeSession;
    if (!session) return;
    const totalQs = session.questions.length;
    const answeredCount = Object.keys(session.answers).length;
    const unanswered = totalQs - answeredCount;

    const finish = () => {
      playSuccessSound();
      const currentSession = activeSessionRef.current || activeSession;
      const finishedSession = {
        ...currentSession,
        isFinished: true
      };

      if (currentSession.isBattle) {
        const totalTimeMs = Date.now() - (currentSession.startTime || Date.now());
        const roomCode = currentSession.battleRoomCode;
        if (roomCode) {
          const host = currentSession.isHost;
          markPlayerFinished(roomCode, host, totalTimeMs).catch(console.error);
          
          AsyncStorage.getItem("pending_battles").then(val => {
            let pending = [];
            try { if (val) pending = JSON.parse(val); } catch {}
            if (!pending.find((p: any) => p.code === roomCode)) {
              pending.push({
                code: roomCode,
                isHost: host,
                questions: currentSession.questions || [],
                answers: currentSession.answers || {}
              });
              AsyncStorage.setItem("pending_battles", JSON.stringify(pending));
            }
          });
        }
      }
      setActiveSession(finishedSession);
      saveAndExitQuizSession(false, finishedSession);
    };

    if (unanswered > 0) {
      if (Platform.OS === "web") {
        if (confirm(`${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. Finish anyway?`)) {
          finish();
        }
      } else {
        Alert.alert(
          "Finish Quiz",
          `${unanswered} question${unanswered > 1 ? "s" : ""} unanswered. Finish anyway?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Finish", style: "destructive", onPress: finish }
          ]
        );
      }
    } else {
      finish();
    }
  };

  const handleImportQst = (text: string, fileName: string, sourceUri?: string) => {
    try {
      const parsed = parseQstText(text);
      if (parsed.questions.length === 0) {
        throw new Error("No questions found. Scorr format requires questions starting with '?' and answers starting with '+' or '-'.");
      }
      const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      if (sourceUri && Platform.OS !== "web") {
        const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
        const destUri = `${FileSystem.documentDirectory}quiz_file_${localId}_${safeName}`;
        FileSystem.copyAsync({ from: sourceUri, to: destUri })
          .then(() => AsyncStorage.setItem(`quiz_file_${localId}`, destUri))
          .catch(e => console.log("Failed to save file", e));
      }

      const newQuiz: any = {
        id: localId,
        title: parsed.title || fileName.replace(/\.[^.]+$/, ""),
        questions: parsed.questions.length,
        category: parsed.category || "General",
        time: "Just now",
        questionsList: parsed.questions.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) })),
        attempts: [],
        wrongQuestions: [],
        uniqueCorrectIds: [],
      };
      setQuizzes((prev) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
      trackQuizCreated({ source: "import", questionCount: newQuiz.questions });
      setActiveTab("insights");
      setViewingInsightsQuiz(newQuiz);
      setViewingInsightsQuizFromTab("home");
      setCreationMode("pick");

      // Push to Neon if user row exists in DB
      console.log("[NeonSync-Import] Starting upload flow for imported quiz:", newQuiz.title);
      console.log("[NeonSync-Import] firebaseUser exists:", !!firebaseUser, firebaseUser ? firebaseUser.email : null);
      console.log("[NeonSync-Import] neonUserReadyRef.current status:", neonUserReadyRef.current);

      if (firebaseUser && neonUserReadyRef.current) {
        console.log("[NeonSync-Import] Calling POST /api/mobile-quizzes...");
        createMobileQuiz({
          id: localId,
          userId: firebaseUser.uid,
          title: newQuiz.title,
          category: newQuiz.category,
          questionCount: newQuiz.questionsList?.length ?? newQuiz.questions,
          sourceText: text, // store the entire raw TXT file — parseQstText reconstructs questions on login
        }).then(({ quiz: saved, error }) => {
          if (saved && !error) {
            console.log("[NeonSync-Import] POST request succeeded! Quiz uploaded with DB ID:", saved.id);
            // Store neonId so future updates/deletes can reference it
            setQuizzes((prev: any[]) =>
              prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q)
            );
          } else {
            console.error("[NeonSync-Import] POST request failed! Error message from server:", error);
          }
        }).catch((err) => {
          console.error("[NeonSync-Import] POST request failed with network error:", err);
        });
      } else {
        console.warn("[NeonSync-Import] Upload skipped because user is not logged in OR backend registration is not ready.");
      }
    } catch (err: any) {
      setImportErrorDetails({
        title: "Invalid File Format",
        message: "The file you uploaded is not formatted correctly. Would you like to watch our short video tutorial to learn how to format your quiz files?",
        details: err.message
      });
    }
  };
