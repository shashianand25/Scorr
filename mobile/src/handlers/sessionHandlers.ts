/**
import { logger } from "../lib/logger";
 * Quiz Session Handlers
 * handleCheckAnswer, handleAnswerSelect, handleNavigateSession,
 * handleFinishSession, handleImportQst
 * 
 * These handlers are defined inside HomeScreen() and close over its state.
 * They are passed to child components via the p prop object.
 */
// --- Handler implementations (verbatim from index.tsx) ---

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
            logger.error("App", "[NeonSync-Import] POST request failed! Error message from server:", error);
          }
        }).catch((err) => {
          logger.error("App", "[NeonSync-Import] POST request failed with network error:", err);
        });
      } else {
        logger.warn("App", "[NeonSync-Import] Upload skipped because user is not logged in OR backend registration is not ready.");
      }
    } catch (err: any) {
      setImportErrorDetails({
        title: "Invalid File Format",
        message: "The file you uploaded is not formatted correctly. Would you like to watch our short video tutorial to learn how to format your quiz files?",
        details: err.message
      });
    }
  };

  const totalQuestions = selectedQuiz?.questions ?? 0;
  const wrongCount = selectedQuiz?.wrongQuestions?.length ?? 0;
  const attemptedIds: Set<string> = new Set([
    ...(selectedQuiz?.uniqueCorrectIds || []),
    ...(selectedQuiz?.wrongQuestions || []).map((w: any) => w.id || w)
  ]);
  const unansweredCount = selectedQuiz
    ? (selectedQuiz.questionsList && selectedQuiz.questionsList.length > 0
        ? selectedQuiz.questionsList.filter((q: any) => !attemptedIds.has(q.id)).length
        : Math.max(0, totalQuestions - attemptedIds.size))
    : totalQuestions;

  // Compute how many questions will be used
  const questionCount = (() => {
    switch (selectionMode) {
      case "random":
        return Math.min(randomCount, totalQuestions);
      case "range":
        return Math.max(0, Math.min(rangeEnd, totalQuestions) - Math.max(rangeStart - 1, 0));
      case "unanswered":
        return unansweredCount;
      case "wrong":
        return wrongCount;
      default:
        return totalQuestions;
    }
  })();

  // Add mock quizzes state for dashboard

  // ── Keep refs in sync + auto-save on every change ───────────────────────
  useEffect(() => {
    quizzesRef.current = quizzes;
    if (!dataLoaded) return;
    AsyncStorage.setItem(
      storageKey("quizzes"),
      JSON.stringify(quizzes)
    ).catch(e => logger.warn("Persist",  quiz save failed:", e));

    // Schedule inactivity notifications
    const scheduleNotifications = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        
        if (quizzes.length === 0) {
          if (existingStatus === 'granted') {
            await Notifications.cancelAllScheduledNotificationsAsync();
          }
          return;
        }

        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') return;

        // Cancel existing notifications to reset the inactivity timer
        await Notifications.cancelAllScheduledNotificationsAsync();

        let totalQuestions = 0;
        let masteredQuestions = 0;

        quizzes.forEach((q) => {
          const qsList = q.questionsList && q.questionsList.length > 0 ? q.questionsList : q.questions;
          totalQuestions += (qsList?.length || 0);
          masteredQuestions += (q.uniqueCorrectIds?.length || 0);
        });

        const unresolvedQuestions = Math.max(0, totalQuestions - masteredQuestions);

        if (unresolvedQuestions > 0 && totalQuestions > 0) {
          // 24-hour notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Time to review! 🧠",
              body: `You have ${unresolvedQuestions} questions waiting to be mastered out of ${totalQuestions} total questions.`,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 24 * 60 * 60, // 24 hours
              repeats: false,
            },
          });

          // 7-day notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "It's been a while! 👋",
              body: "Get back to Scorr and practice your quizzes to keep your memory sharp.",
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 7 * 24 * 60 * 60, // 7 days
              repeats: false,
            },
          });
        }
      } catch (err) {
        logger.warn("App", "Failed to schedule inactivity notifications", err);
      }
    };

    scheduleNotifications();
  }, [quizzes, dataLoaded]);


  // ── Persist starred questions ────────────────────────────────────────────
  useEffect(() => {
    if (!dataLoaded || loadedUidRef.current === undefined) return;
    AsyncStorage.setItem(
      `quizforge_starred_${loadedUidRef.current ?? "guest"}`,
      JSON.stringify([...starredQuestions])
    ).catch(e => logger.warn("Persist",  starred save failed:", e));
  }, [starredQuestions, dataLoaded]);

  // ── Persist flashcard decks (SM2 ratings) ────────────────────────────────
  useEffect(() => {
    if (!dataLoaded) return;
    AsyncStorage.setItem(
      `quizforge_flashcard_decks`,
      JSON.stringify(flashcardDecks)
    ).catch(e => logger.warn("Persist",  flashcard decks save failed:", e));
  }, [flashcardDecks, dataLoaded]);

  const totalAttempts = quizzes.reduce((sum, q) => sum + (q.attempts || []).length, 0);
  const bestScore = quizzes.reduce((max, q) => {
    const qMax = (q.attempts || []).reduce((m: number, a: any) => Math.max(m, a.score), 0);
    return Math.max(max, qMax);
  }, 0);


  // Quiz Creator Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newQuestionsCount, setNewQuestionsCount] = useState("");
  const [newQuizLanguage, setNewQuizLanguage] = useState("English");
  const [creationStep, setCreationStep] = useState<"setup" | "drafting">("setup");
  const [creationMode, setCreationMode] = useState<"pick" | "quiz">("pick");
  const [aiGenConnectionLost, setAiGenConnectionLost] = useState(false);
  const [aiGenCharCount, setAiGenCharCount] = useState(0);
  const [pendingAiFile, setPendingAiFile] = useState<{ text: string; fileName: string } | null>(null);

  const [fcTitle, setFcTitle] = useState("");
  const [fcCategory, setFcCategory] = useState("");
  const [fcCards, setFcCards] = useState<{ front: string; back: string }[]>([{ front: "", back: "" }]);
  const [fcCurrentIdx, setFcCurrentIdx] = useState(0);
  const [studyCardIdx, setStudyCardIdx] = useState(0);
  const [studyQueueTotal, setStudyQueueTotal] = useState<number>(0);
  const [customStudyMode, setCustomStudyMode] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [noDueAtStart, setNoDueAtStart] = useState(false); // true when deck had 0 due before the session started
  // ── Study Mode Modal ──
  const [studyModeModalVisible, setStudyModeModalVisible] = useState(false);
  const [selectedStudyMode, setSelectedStudyMode] = useState<"spaced" | "simple">("spaced");
  const [studyCardCount, setStudyCardCount] = useState<"auto" | 10 | 20>("auto");
  const [studyFlipped, setStudyFlipped] = useState(false);
  const [sessionRatings, setSessionRatings] = useState({ perfect: 0, good: 0, hard: 0, again: 0 });
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const insightsFlipAnim = useRef(new Animated.Value(0)).current;
  const insightsSwipeX = useRef(new Animated.Value(0)).current;
  const insightsSwipeY = useRef(new Animated.Value(0)).current;
  const buttonSlideX = useRef(new Animated.Value(0)).current;

  // Stable refs so panResponder callbacks always read latest values
  React.useEffect(() => { fcIndexRef.current = fcIndex; }, [fcIndex]);
  React.useEffect(() => { viewingInsightsQuizRef.current = viewingInsightsQuiz; }, [viewingInsightsQuiz]);

  const insightsPanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 5 || Math.abs(dy) > 5,
    // setValue has no driver concept — avoids native/JS driver clash entirely
    onPanResponderMove: (_, { dx, dy }) => {
      insightsSwipeX.setValue(dx);
      insightsSwipeY.setValue(dy);
    },
    onPanResponderRelease: (_, { dx, vx }) => {
      const cards = (viewingInsightsQuizRef.current?.flashcards) || [];
      const idx = fcIndexRef.current;
      const W = Dimensions.get('window').width;
      const doSwipe = (dir: 'left' | 'right') => {
        if (dir === 'left' && idx === cards.length - 1) {
          Animated.parallel([
            Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
            Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
          ]).start();
          return;
        }
        if (dir === 'right' && idx === 0) {
          Animated.parallel([
            Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
            Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
          ]).start();
          return;
        }

        const outVal = dir === 'right' ? W : -W;
        Animated.parallel([
          Animated.timing(insightsSwipeX, { toValue: outVal, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(insightsSwipeY, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => {
          if (dir === 'left') {
            setFcIndex(idx + 1);
          } else {
            setFcIndex(idx - 1);
          }
          setFcFlipped(false);
          insightsFlipAnim.setValue(0);
          
          insightsSwipeX.setValue(dir === 'left' ? W : -W);
          insightsSwipeY.setValue(0);
          
          setTimeout(() => {
            Animated.timing(insightsSwipeX, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
          }, 16);
        });
      };
      if (dx > 80 || vx > 1.2) doSwipe('right');
      else if (dx < -80 || vx < -1.2) doSwipe('left');
      else Animated.parallel([
        Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start();
    },
    onPanResponderTerminate: () => {
      Animated.parallel([
        Animated.spring(insightsSwipeX, { toValue: 0, useNativeDriver: true, friction: 6 }),
        Animated.spring(insightsSwipeY, { toValue: 0, useNativeDriver: true, friction: 6 }),
      ]).start();
    },
  })).current;
  const [insightsKnown, setInsightsKnown] = useState(0);
  const [insightsUnknown, setInsightsUnknown] = useState(0);
  const swipeX   = useRef(new Animated.Value(0)).current;
  const studyTiltAnim = useRef(new Animated.Value(0)).current;
  const [cardType, setCardType] = useState<"Basic" | "Basic (and reversed card)" | "Basic (optional reversed card)" | "Basic (type in the answer)" | "Cloze" | "Image Occlusion">("Basic");
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeckReport, setShowDeckReport] = useState<{ deck: any, attempt: any } | null>(null);
  const [isFrontFocused, setIsFrontFocused] = useState(false);
  const [isBackFocused, setIsBackFocused] = useState(false);
  const [isFrontCollapsed, setIsFrontCollapsed] = useState(false);
  const [isBackCollapsed, setIsBackCollapsed] = useState(false);
  const [activeInput, setActiveInput] = useState<"front" | "back">("front");
  const [studyTypedAnswer, setStudyTypedAnswer] = useState("");
  const [studyChecked, setStudyChecked] = useState(false);
  const [selectedRating, setSelectedRating] = useState<string | null>(null);
  const [draftCurrentIndex, setDraftCurrentIndex] = useState<number>(0);
  const [draftQuestions, setDraftQuestions] = useState<any[]>([]);

  // Custom Modals for Deck Naming and Ellipsis options
  const [showNameDeckModal, setShowNameDeckModal] = useState(false);
  const [deckNameInput, setDeckNameInput] = useState("");
  const [nameDeckAction, setNameDeckAction] = useState<"create" | "rename">("create");
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);

