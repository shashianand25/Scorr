import { getBattleRoom, startBattle, joinBattle } from "../lib/api";

/**
 * Battle handlers — host, start, join battle.
 * Extracted from HomeScreen god-file.
 */
// Raw handler implementations (verbatim from index.tsx):
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
