/**
 * Quiz Creation & Sharing Handlers
 * handleOpenQuizOptions, handleShareQuiz, handleProceedToDrafting,
 * handleSaveDraftedQuiz, handleDraftBack
 * 
 * These handlers are defined inside HomeScreen() and close over its state.
 * They are passed to child components via the p prop object.
 */
// --- Handler implementations (verbatim from index.tsx) ---

  const handleOpenQuizOptions = (quiz: any) => {
    setSelectedQuiz(quiz);
    setSelectionMode("all");
    setRandomCount(Math.min(5, quiz.questions));
    setRangeStart(1);
    setRangeEnd(quiz.questions);
    setQuizTimeLimit(null);
    setShowTimeLimitDropdown(false);
  };

  const handleShareQuiz = async (quiz: any) => {
    try {
      if (Platform.OS === "web") {
        Alert.alert("Not Available", "Sharing is not available on web.");
        return;
      }
      
      const shareBase = appConfig?.appLinks?.shareBaseUrl || "https://scorrapp.com/share/quiz/";
      let targetId = quiz.masterQuizId || quiz.master_quiz_id || quiz.neonId;
      if (!targetId) {
        targetId = 'uq_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36).substring(4);
        quiz.masterQuizId = targetId;
        setQuizzes((prev: any[]) => prev.map((q: any) => q.id === quiz.id ? { ...q, masterQuizId: targetId } : q));
      }

      const shareUrl = `${shareBase}${targetId}`;
      const message = `Check out this quiz on Scorr: ${quiz.title}\n\nTap this link to open it in the app:\n${shareUrl}`;
      
      // ── Open native share sheet IMMEDIATELY without waiting for network ──
      Share.share({
        message,
        url: shareUrl,
        title: `Share ${quiz.title}`,
      }).catch((err) => console.warn("[Share] Sheet error:", err));

      trackShareLinkTapped({
        questionCount: quiz.questions || quiz.questionCount || 0,
        isAiGenerated: quiz.category === "AI Generated",
      });

      // ── Concurrently ensure server-side master quiz record exists in the background ──
      (async () => {
        try {
          const sourceText = quiz.sourceText || questionsToSourceText(quiz.title, quiz.category || "General", quiz.questionsList || [], quiz.flashcards || []);
          if (sourceText) {
            const contentHash = await computeContentHash(sourceText, i18n.language || "en");
            const { masterQuiz } = await saveMasterQuiz({
              id: targetId,
              contentHash,
              language: (i18n.language || "en").toLowerCase(),
              title: quiz.title,
              category: quiz.category || "General",
              questionCount: quiz.questionsList?.length ?? quiz.questions ?? 0,
              flashcardCount: quiz.flashcards?.length ?? 0,
              sourceText,
              userId: firebaseUser ? firebaseUser.uid : "guest_shared"
            });
            if (masterQuiz?.id && masterQuiz.id !== targetId) {
              quiz.masterQuizId = masterQuiz.id;
              setQuizzes((prev: any[]) => prev.map((q: any) => q.id === quiz.id ? { ...q, masterQuizId: masterQuiz.id } : q));
            }
            if (firebaseUser && neonUserReadyRef.current) {
              updateMobileQuiz({ userId: firebaseUser.uid, quizId: quiz.id, masterQuizId: masterQuiz?.id || targetId }).catch(() => {});
            }
          }
        } catch (syncErr) {
          console.warn("[ShareSync] Background master quiz sync warning:", syncErr);
        }
      })();
      
    } catch (err: any) {
      console.warn("Share error:", err);
      Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : getUserErrorMessage(err));
    }
  };

  const handleProceedToDrafting = () => {
    if (!newTitle.trim()) {
      if (Platform.OS === "web") {
        alert("Please enter a quiz title.");
      } else {
        Alert.alert("Error", "Please enter a quiz title.");
      }
      return;
    }

    const count = parseInt(newQuestionsCount);
    if (isNaN(count) || count <= 0 || count > 50) {
      if (Platform.OS === "web") {
        alert("Please enter a valid question count between 1 and 50.");
      } else {
        Alert.alert("Error", "Please enter a valid question count between 1 and 50.");
      }
      return;
    }

    // Initialize blank draft questions
    const initialDrafts = [];
    for (let i = 0; i < count; i++) {
      initialDrafts.push({
        prompt: "",
        answers: [
          { id: `o-1-${Date.now()}-${Math.random()}`, text: "", isCorrect: true },
          { id: `o-2-${Date.now()}-${Math.random()}`, text: "", isCorrect: false },
          { id: `o-3-${Date.now()}-${Math.random()}`, text: "", isCorrect: false },
          { id: `o-4-${Date.now()}-${Math.random()}`, text: "", isCorrect: false }
        ]
      });
    }

    setDraftQuestions(initialDrafts);
    setDraftCurrentIndex(0);
    setCreationStep("setup"); // We'll set creationStep to "drafting" next
    setCreationStep("drafting");
  };

  const handleSaveDraftedQuiz = () => {
    // Validation
    const invalidQuestionIdx = draftQuestions.findIndex(q => !q.prompt.trim());
    if (invalidQuestionIdx !== -1) {
      const errMsg = `Please enter a prompt for Question ${invalidQuestionIdx + 1}.`;
      if (Platform.OS === "web") alert(errMsg);
      else Alert.alert("Validation Error", errMsg);
      setDraftCurrentIndex(invalidQuestionIdx);
      return;
    }

    // Validate that each question has at least 2 options filled, and one is correct
    for (let i = 0; i < draftQuestions.length; i++) {
      const q = draftQuestions[i];
      const filledOptions = q.answers.filter((a: any) => a.text.trim());
      if (filledOptions.length < 2) {
        const errMsg = `Question ${i + 1} must have at least 2 non-empty options.`;
        if (Platform.OS === "web") alert(errMsg);
        else Alert.alert("Validation Error", errMsg);
        setDraftCurrentIndex(i);
        return;
      }
      
      const correctFilled = filledOptions.find((a: any) => a.isCorrect);
      if (!correctFilled) {
        const errMsg = `Please select a correct answer amongst the non-empty options for Question ${i + 1}.`;
        if (Platform.OS === "web") alert(errMsg);
        else Alert.alert("Validation Error", errMsg);
        setDraftCurrentIndex(i);
        return;
      }
    }

    // Build the final quiz object
    const finalQuestions = draftQuestions.map((q, qIdx) => {
      const filledOptions = q.answers.filter((a: any) => a.text.trim());
      return {
        id: `q-${Date.now()}-${qIdx}`,
        prompt: q.prompt.trim(),
        answers: filledOptions.map((a: any, aIdx: number) => ({
          id: a.id || `o-${Date.now()}-${qIdx}-${aIdx}`,
          text: a.text.trim(),
          isCorrect: a.isCorrect
        })),
        type: filledOptions.filter((a: any) => a.isCorrect).length > 1 ? ("multiple_choice" as const) : ("single_choice" as const)
      };
    });

    const generatedSourceText = `@title: ${newTitle.trim()}\n@category: ${newCategory.trim() || "General"}\n@language: ${newQuizLanguage}\n\n` + 
      finalQuestions.map(q => `? ${q.prompt}\n` + q.answers.map((a: any) => `${a.isCorrect ? '+' : '-'} ${a.text}`).join('\n')).join('\n\n');

    const localId = String(Date.now());
    const newQuiz = {
      id: localId,
      title: newTitle.trim(),
      category: newCategory.trim() || "General",
      questions: finalQuestions.length,
      time: "Just now",
      questionsList: finalQuestions,
      attempts: [],
      wrongQuestions: [],
      uniqueCorrectIds: []
    };

    setQuizzes((prev) => [newQuiz, ...prev.filter((q: any) => q.id !== newQuiz.id)]);
    setNewTitle("");
    setNewCategory("");
    setNewQuestionsCount("");
    setCreationStep("setup");
    
    setShowQuizCreatedModal({ title: newQuiz.title, count: newQuiz.questions });
    trackQuizCreated({ source: "manual", questionCount: newQuiz.questions });
    setActiveTab("home");

    console.log("[NeonSync-Manual] Saving manually created quiz:", newQuiz.title);
    console.log("[NeonSync-Manual] firebaseUser exists:", !!firebaseUser, firebaseUser ? firebaseUser.email : null);
    console.log("[NeonSync-Manual] neonUserReadyRef.current status:", neonUserReadyRef.current);

    if (firebaseUser && neonUserReadyRef.current) {
      if (!isConnected) {
        setSyncToastMessage("Offline. Changes will sync automatically.");
        setTimeout(() => setSyncToastMessage(null), 3000);
      }
      console.log("[NeonSync-Manual] Calling POST /api/mobile-quizzes...");
      createMobileQuiz({
        id: localId,
        userId: firebaseUser.uid,
        title: newQuiz.title,
        category: newQuiz.category,
        questionCount: newQuiz.questionsList?.length ?? newQuiz.questions,
        sourceText: generatedSourceText,
      }).then(({ quiz: saved, error }) => {
        if (saved && !error) {
          console.log("[NeonSync-Manual] POST request succeeded! Quiz uploaded with DB ID:", saved.id);
          setQuizzes((prev: any[]) =>
            prev.map((q) => q.id === localId ? { ...q, neonId: saved.id } : q)
          );
        } else {
          console.error("[NeonSync-Manual] POST request failed! Error message from server:", error);
        }
      }).catch((err) => {
        console.error("[NeonSync-Manual] POST request failed with network error:", err);
      });
    } else {
      console.warn("[NeonSync-Manual] Upload skipped because user is not logged in OR backend registration is not ready.");
    }
  };

  // handleGenerateWithAI — defined in src/handlers/aiGenerationHandler.ts, bound below
  const handleGenerateWithAI = aiGenerationHandler;



  const updateDraftPrompt = (text: string) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      next[draftCurrentIndex].prompt = text;
      setDraftQuestions(next);
    }
  };

  const updateDraftOptionText = (optIdx: number, text: string) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex] && next[draftCurrentIndex].answers[optIdx]) {
      next[draftCurrentIndex].answers[optIdx].text = text;
      setDraftQuestions(next);
    }
  };

  const selectDraftOptionCorrect = (optIdx: number) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      next[draftCurrentIndex].answers = next[draftCurrentIndex].answers.map((a: any, idx: number) => ({
        ...a,
        isCorrect: idx === optIdx
      }));
      setDraftQuestions(next);
    }
  };

  const addDraftOption = () => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      const newOptId = `o-add-${Date.now()}-${Math.random()}`;
      next[draftCurrentIndex].answers.push({
        id: newOptId,
        text: "",
        isCorrect: false
      });
      setDraftQuestions(next);
    }
  };

  const deleteDraftOption = (optIdx: number) => {
    const next = [...draftQuestions];
    if (next[draftCurrentIndex]) {
      const answers = next[draftCurrentIndex].answers;
      if (answers.length <= 2) return; // Keep at least 2 options
      
      const removedWasCorrect = answers[optIdx].isCorrect;
      answers.splice(optIdx, 1);
      
      // If the removed option was correct, make the first remaining one correct
      if (removedWasCorrect && answers.length > 0) {
        answers[0].isCorrect = true;
      }
      
      setDraftQuestions(next);
    }
  };

  const handleDraftBack = () => {
    if (draftCurrentIndex > 0) {
      setDraftCurrentIndex(draftCurrentIndex - 1);
    } else {
      setCreationStep("setup");
    }
  };

  const renderActiveSessionView = () => <ActiveSessionScreen p={p} />;

  const renderResultsView = () => <ResultsScreen p={p} />;

  // ── SM-2 Spaced Repetition Logic ──
  const startStudy = (deck: any, custom: boolean = false) => {
    setCustomStudyMode(custom);

    // Use the current in-state version of the deck so we never lose saved SM2 ratings.
    // Fall back to the passed deck only if it's not in state yet (e.g. brand new deck).
    const stateDeck = flashcardDecks.find((d: any) => d.id === deck.id) || deck;

    const updatedDeck = {
      ...stateDeck,
      cards: (stateDeck.cards || []).map((c: any) => ({
        ...c,
        id: c.id || Date.now().toString() + Math.random().toString(),
        sm2_interval: c.sm2_interval ?? 0,
        sm2_repetition: c.sm2_repetition ?? 0,
        sm2_easeFactor: c.sm2_easeFactor ?? 2.5,
        sm2_state: c.sm2_state ?? CardState.NEW,
      }))
    };
    
    const nowWithBuffer = Date.now() + 5000;
    const due = custom 
      ? updatedDeck.cards 
      : updatedDeck.cards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= nowWithBuffer);
    
    setStudyQueue(due.map((c: any) => c.id));
    setStudyQueueTotal(due.length);
    setStudyingDeck(updatedDeck);
    setStudyFlipped(false);
    flipAnim.setValue(0);
    swipeX.setValue(0);
    setStudyTypedAnswer("");
    setStudyChecked(false);
    setIsPreviewMode(false);
    setNoDueAtStart(false); // real session — always show "Next steps" on completion
    setSessionRatings({ perfect: 0, good: 0, hard: 0, again: 0 });
  };



