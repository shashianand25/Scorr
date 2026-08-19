/**
 * SM-2 Spaced Repetition & Battle Handlers
 * handleSM2Rating, handleHostBattle, handleStartBattle, handleJoinBattle
 * 
 * These handlers are defined inside HomeScreen() and close over its state.
 * They are passed to child components via the p prop object.
 */
// --- Handler implementations (verbatim from index.tsx) ---

  const handleSM2Rating = (rating: "again" | "hard" | "good" | "easy" | "perfect") => {
    if (!studyingDeck || studyQueue.length === 0 || selectedRating !== null) return;
    
    // Convert "easy" to "perfect" for our tracking
    const trackingRating = rating === "easy" ? "perfect" : rating;
    setSessionRatings(prev => ({ ...prev, [trackingRating]: prev[trackingRating] + 1 }));
    
    setSelectedRating(rating);
    Animated.timing(swipeX, {
      toValue: -Dimensions.get("window").width,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      const cardId = studyQueue[0];
      const currentCard = studyingDeck.cards.find((c: any) => c.id === cardId);
      if (!currentCard) {
        swipeX.setValue(0);
        setSelectedRating(null);
        return;
      }

      let newQueue = [...studyQueue.slice(1)];
      
      const updatedCard = Scheduler.schedule(currentCard, rating);
      if (rating === "again") {
        // Don't show the card immediately — push it back at least 5 cards
        // so the user gets a break before seeing it again in the same session.
        const insertAt = Math.min(5, newQueue.length);
        newQueue.splice(insertAt, 0, cardId);
      }
      
      const updatedDeck = {
        ...studyingDeck,
        cards: studyingDeck.cards.map((c: any) => c.id === cardId ? updatedCard : c)
      };
      setStudyingDeck(updatedDeck);
      setFlashcardDecks((prev: any[]) => prev.map(d => d.id === studyingDeck.id ? updatedDeck : d));
      
      if (firebaseUser && updatedDeck.neonId) {
        updateFlashcardDeck({ userId: firebaseUser.uid, deckId: updatedDeck.neonId, cards: updatedDeck.cards })
          .catch(err => console.error("Failed to sync SM-2 progress", err));
      }

      setStudyQueue(newQueue);
      setStudyFlipped(false);
      flipAnim.setValue(0);
      setStudyTypedAnswer("");
      setStudyChecked(false);
      setSelectedRating(null);

      if (newQueue.length > 0) {
        swipeX.setValue(Dimensions.get("window").width);
        Animated.timing(swipeX, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }).start();
      } else {
        swipeX.setValue(0);
      }
    });
  };

  /** Opens battle options sheet – does NOT create room yet */
  const handleHostBattle = (quizId: string, source: "lobby" | "insights" = "lobby") => {
    let q = quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q) => q.id === quizId);
    if (!q && viewingInsightsQuiz?.id === quizId) {
      q = viewingInsightsQuiz;
    }
    if (!q) {
      Alert.alert("Error", "Quiz not found. Please try again.");
      return;
    }
    setBattleOptionsSource(source);
    setBattleOptionsQuiz(q);
    setBattleSelectionMode("all");
    setBattleRandomCount(Math.min(10, (q.questionsList?.length || q.questions || 10)));
    setBattleRangeStart(1);
    setBattleRangeEnd(Math.min(5, (q.questionsList?.length || q.questions || 5)));
    setBattleShuffleQ(false);
    setBattleShuffleA(false);
    setBattleTimePerQuestion(null);
    setBattleCreating(false);
    setShowBattleQuizSelector(false);
    setShowBattleOptions(true);
  };

  /** Actually creates the room after options are confirmed */
  const handleStartBattle = async () => {
    if (!isConnected) {
      setOfflineModalParams({
        title: "Can't Create Battle",
        message: "An internet connection is required to create a battle."
      });
      return;
    }
    const q = battleOptionsQuiz;
    if (!q) return;

    setBattleError("");
    setBattleConnError("");
    setBattleCreating(true); // show loading inside modal
    try {
      let qsList: any[] = q.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (q.questionsList || []);
      if (!qsList || qsList.length === 0) {
        qsList = generateMockQuestionsForQuiz(q.title, q.questions || 1);
      }
      // Apply selection mode
      if (battleSelectionMode === "random") {
        qsList = [...qsList].sort(() => Math.random() - 0.5).slice(0, battleRandomCount);
      } else if (battleSelectionMode === "range") {
        qsList = qsList.slice(battleRangeStart - 1, battleRangeEnd);
      }
      if (battleShuffleQ) {
        qsList = [...qsList].sort(() => Math.random() - 0.5);
      }
      if (battleShuffleA) {
        qsList = qsList.map((q: any) => ({ ...q, answers: [...q.answers].sort(() => Math.random() - 0.5) }));
      }
      
      // ── Emergency kill-switch: disableBattles flag ───────────────────
      if (appConfig?.featureFlags?.disableBattles) {
        Alert.alert(
          "Battles Temporarily Unavailable",
          "Battle Arena is currently disabled while we perform maintenance. Please try again shortly."
        );
        setBattleCreating(false);
        return;
      }

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout. Please check your internet connection.")), 8000));
      const code = await Promise.race([
        createBattleRoom(q.id, q.title, qsList.length, qsList, firebaseUser?.uid || "guest", firebaseUser?.displayName || "Player", battleTimePerQuestion),
        timeoutPromise
      ]) as string;

      setBattleRoomCode(code);
      setIsHost(true);
      battleStartedRef.current = false;
      setBattleCreating(false);
      setShowBattleOptions(false); // close AFTER room created so user sees loading
      setActiveTab("battle" as any); // transition to Battle Lobby
      if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
      battleUnsubscribeRef.current = listenToBattleRoom(code, (data) => {
        setBattleRoomState(data);
        if (data.status === "playing" && !battleStartedRef.current) {
          battleStartedRef.current = true;
          setBattleCountdown(3);
          let c = 3;
          const iv = setInterval(() => {
            c--;
            if (c > 0) setBattleCountdown(c);
            else { clearInterval(iv); setBattleCountdown(null); startBattleSession(data, true); }
          }, 1000);
        }
      });
    } catch (e: any) {
      setBattleCreating(false);
      setBattleError(e.message || "Failed to create room. Check your connection and try again.");
    }
  };

  const handleJoinBattle = async () => {
    if (!isConnected) {
      setOfflineModalParams({
        title: "Can't Join Battle",
        message: "You're offline. Connect to the internet and try again."
      });
      return;
    }
    if (!joinCodeInput.trim()) return;

    setBattleError("");
    setBattleCreating(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout. Please check your internet connection.")), 8000));
      const res = await Promise.race([
        joinBattleRoom(joinCodeInput, firebaseUser?.uid || "guest2", firebaseUser?.displayName || "Player 2"),
        timeoutPromise
      ]) as { success: boolean; error?: string; quizId?: string };
      setBattleCreating(false);
      if (res.success) {
        setBattleRoomCode(joinCodeInput.toUpperCase().trim());
        setIsHost(false);
        battleStartedRef.current = false;
        if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
        battleUnsubscribeRef.current = listenToBattleRoom(joinCodeInput.toUpperCase().trim(), (data) => {
          setBattleRoomState(data);
          if (data.status === "playing" && !battleStartedRef.current) {
            battleStartedRef.current = true;
            setBattleCountdown(3);
            let c = 3;
            const iv = setInterval(() => {
              c--;
              if (c > 0) setBattleCountdown(c);
              else { clearInterval(iv); setBattleCountdown(null); startBattleSession(data, false); }
            }, 1000);
          }
        });
        setJoinCodeInput("");
      } else {
        setBattleError(res.error || "Room not found. Check the code and try again.");
      }
    } catch (e: any) {
      setBattleCreating(false);
      setBattleError(e.message || "Connection error. Please try again.");
    }
  };

  const startBattleSession = (data: BattleRoom, isHostFlag: boolean) => {
    let qsList = data.questions;
    if (!qsList || qsList.length === 0) {
      const quiz = quizzesRef.current.find((q: any) => q.id === data.quizId);
      if (quiz && quiz.questionsList && quiz.questionsList.length > 0) {
        qsList = [...quiz.questionsList];
      } else {
        setBattleError("Could not load questions for this match.");
        return;
      }
    }

    // Read timePerQuestion from Firestore room so both host & guest are in sync
    const tpq: number | null = (data as any).timePerQuestion ?? null;
    setBattleTimePerQuestion(tpq);
    if (tpq != null) setBattleQuestionTimeLeft(tpq);

    setActiveSession({
       quizId: data.quizId,
       quizTitle: data.quizTitle,
       questions: qsList,
       currentIndex: 0,
       answers: {},
       correctCount: 0,
       wrongCount: 0,
       startTime: Date.now(),
       isBattle: true,
       battleRoomCode: data.id,
       isHost: isHostFlag,
       attemptSaved: false,
       showAnswerOnSubmit: true,
       // no quizTimeLimit — battle uses per-question timer
    });
    trackBattleStarted({
      questionCount: qsList.length,
      hasTimePerQuestion: tpq != null,
      isHost: isHostFlag,
    });
  };

  const renderBattleLobbyView = () => <BattleLobbyScreen p={p} />;

  const renderFlashcardsView = () => <FlashcardsScreen p={p} />;

  // Render Sub-Views based on activeTab
  const renderContent = (overrideTab?: string) => <MainContentScreen p={p} overrideTab={overrideTab} />;




  // ── Auth view: "landing" | "email" ──────────────────────────────
  const [authView, setAuthView] = useState<"landing" | "email">("landing");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [signupStep, setSignupStep] = useState<"details" | "otp">("details");
  const [otpCode, setOtpCode] = useState("");
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);
  const authViewAnim = useRef(new Animated.Value(0)).current; // 0=landing, 1=email

  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCountdown]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const switchAuthView = (view: "landing" | "email") => {
    const toValue = view === "email" ? 1 : 0;
    Animated.timing(authViewAnim, {
      toValue,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setAuthView(view));
    setAuthView(view);
  };

  const openAuthScreen = () => {
    setAuthView("landing");
    authViewAnim.setValue(0);
    setAuthError(null);
    setSignupStep("details");
    setOtpCode("");
    setShowAuthScreen(true);
  };

  // Auth handlers (handleSendSignupOtp, handleVerifyAndSignup, etc.) → src/handlers/authHandlers.ts
  // renderAuthScreen → src/screens/AuthScreen.tsx





  if (showAuthScreen) {
