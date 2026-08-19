/**
 * Quiz Management Handlers
 * handleStartQuiz, handleDeleteAttempt, handleClearHistory, handleDeleteQuiz,
 * renderTrendsChart, renderStudyDirectory, renderBookmarkedQuestionsView
 * 
 * These handlers are defined inside HomeScreen() and close over its state.
 * They are passed to child components via the p prop object.
 */
// --- Handler implementations (verbatim from index.tsx) ---

  const handleStartQuiz = () => {
    if (!selectedQuiz) return;
    
    // Clear any previously paused session for this quiz so the newly configured preset and feedback settings apply
    setSavedSessions(prev => {
      if (!prev[selectedQuiz.id]) return prev;
      const next = { ...prev };
      delete next[selectedQuiz.id];
      return next;
    });

    let qsList = selectedQuiz.questionsList;
    if (!qsList || qsList.length === 0) {
      qsList = generateMockQuestionsForQuiz(selectedQuiz.title, selectedQuiz.questions);
    }

    let filteredQuestions = [...qsList];
    if (selectionMode === "random") {
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, randomCount);
    } else if (selectionMode === "range") {
      filteredQuestions = filteredQuestions.slice(rangeStart - 1, rangeEnd);
    } else if (selectionMode === "wrong") {
      const wrongList = selectedQuiz.wrongQuestions || [];
      if (wrongList.length > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => wrongList.some((w: any) => w.id === q.id));
      }
    } else if (selectionMode === "unanswered") {
      const attemptedIds = new Set<string>([
        ...(selectedQuiz.uniqueCorrectIds || []),
        ...(selectedQuiz.wrongQuestions || []).map((w: any) => w.id || w)
      ]);
      const unansweredQs = filteredQuestions.filter((q: any) => !attemptedIds.has(q.id));
      if (unansweredQs.length > 0) {
        filteredQuestions = unansweredQs;
      }
    }

    if (shuffleQuestions) {
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5);
    }
    if (shuffleAnswers) {
      filteredQuestions = filteredQuestions.map((q: any) => ({
        ...q,
        answers: [...q.answers].sort(() => Math.random() - 0.5)
      }));
    }

    const session = {
      quizId: selectedQuiz.id,
      quizTitle: selectedQuiz.title,
      questions: filteredQuestions,
      selectionMode,
      shuffleQuestions,
      shuffleAnswers,
      showAnswerOnSubmit,
      timePerQuestion: quizPerQuestionTimer,
      quizTimeLimit,
      currentIndex: 0,
      answers: {},
      submitted: [] as string[],
      isFinished: false,
      startedAt: Date.now()
    };

    setSelectedQuiz(null);
    setShowWrongReview(false);
    setActiveSession(session);
    trackQuizStarted({
      mode: selectionMode,
      questionCount: session.questions.length,
      shuffleAnswers: !!shuffleAnswers,
      showAnswerOnSubmit: !!showAnswerOnSubmit,
      hasTimeLimit: !!(quizTimeLimit || quizPerQuestionTimer),
    });
  };

  const saveAndExitQuizSession = (exitSession: boolean = true, sessionToSave: any = activeSessionRef.current || activeSession) => {
    if (!sessionToSave || !sessionToSave.isFinished) {
      if (sessionToSave && !sessionToSave.isFinished && sessionToSave.quizId) {
        setSavedSessions(prev => ({ ...prev, [sessionToSave.quizId]: sessionToSave }));
      }
      if (exitSession) {
        setActiveSession(null);
        setSelectedQuiz(null);
        if (sessionToSave?.quizId) {
          const sq = sessionToSave.quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q: any) => q.id === sessionToSave.quizId);
          if (sq) {
            setViewingInsightsQuiz(sq);
            setActiveTab("insights");
          }
        }
      }
      return;
    }

    if (sessionToSave.attemptSaved) {
      if (exitSession) {
        setActiveSession(null);
        setSelectedQuiz(null);
        if (sessionToSave?.quizId) {
          const sq = sessionToSave.quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q: any) => q.id === sessionToSave.quizId);
          if (sq) {
            setViewingInsightsQuiz(sq);
            setActiveTab("insights");
          }
        }
      }
      return;
    }

    const questions = sessionToSave.questions;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const wrongQsForQuiz: any[] = [];
    const correctIdsInSession: string[] = [];

    questions.forEach((q: any) => {
      const selected = sessionToSave.answers[q.id] || [];
      if (selected.length === 0) {
        skippedCount++;
      } else {
        const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
        const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
        if (isAllCorrect) {
          correctCount++;
          correctIdsInSession.push(q.id);
        } else {
          wrongCount++;
          const selectedText = q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text).join(", ");
          const correctText = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text).join(", ");
          wrongQsForQuiz.push({ id: q.id, prompt: q.prompt, imageUrl: q.imageUrl, selected: selectedText, correct: correctText });
        }
      }
    });

    if (correctCount === 0 && wrongCount === 0) {
      if (exitSession) {
        setActiveSession(null);
        setSelectedQuiz(null);
        if (sessionToSave?.quizId) {
          const sq = sessionToSave.quizId === "sample_quiz" ? sampleQuiz : quizzes.find((q: any) => q.id === sessionToSave.quizId);
          if (sq) {
            setViewingInsightsQuiz(sq);
            setActiveTab("insights");
          }
        }
      } else {
        setActiveSession((prev: any) => prev ? { ...prev, attemptSaved: true } : prev);
      }
      return;
    }

    const attemptedCount = correctCount + wrongCount;
    const scorePct = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
    const durationSeconds = sessionToSave.startedAt
      ? Math.round((Date.now() - sessionToSave.startedAt) / 1000)
      : 0;
    if (!sessionToSave.isBattle) {
      trackQuizCompleted({
        questionCount: questions.length,
        correctCount,
        wrongCount,
        skippedCount,
        mode: sessionToSave.selectionMode || "all",
        durationSeconds,
        scorePct,
      });
    }
    const targetAttemptId = sessionToSave.targetAttemptId;
    const retryOfAttemptNum = sessionToSave.retryOfAttemptNum;
    // Always create a new attempt entry — never modify the original score
    const baseAttemptData = {
      id: String(Date.now()),
      score: scorePct, correct: correctCount, wrong: wrongCount, skipped: skippedCount,
      timestamp: Date.now(),
      wrongQuestionIds: wrongQsForQuiz.map(q => q.id),
      questionIds: sessionToSave.questions.map((q: any) => q.id),
      answers: sessionToSave.answers,
      // Tag retries so the card can show "Retry of #N" instead of "Attempt #N"
      ...(targetAttemptId ? { mode: "retry", retryOfAttemptId: targetAttemptId, retryOfAttemptNum } : { mode: "full" }),
    };

    if (sessionToSave.quizId === "sample_quiz") {
      const q = sampleQuiz;
      const currentUnique = q.uniqueCorrectIds || [];
      const updatedUniqueCorrectIds = Array.from(new Set([...currentUnique, ...correctIdsInSession]));
      let updatedAttempts = q.attempts || [];
      updatedAttempts = [baseAttemptData, ...updatedAttempts];
      const correctSet = new Set(correctIdsInSession);
      const wrongMap = new Map();
      (q.wrongQuestions || []).forEach((w: any) => {
        const wid = w.id || w;
        if (!correctSet.has(wid)) wrongMap.set(wid, w);
      });
      wrongQsForQuiz.forEach((w: any) => { wrongMap.set(w.id, w); });
      const mergedWrongQuestions = Array.from(wrongMap.values());
      
      const updatedSample = { ...q, attempts: updatedAttempts, wrongQuestions: mergedWrongQuestions, uniqueCorrectIds: updatedUniqueCorrectIds };
      setSampleQuiz(updatedSample);
      AsyncStorage.setItem("quizforge_sample_data", JSON.stringify(updatedSample));
      
      // Update the insights view instantly if we are looking at the sample quiz
      if (viewingInsightsQuiz && viewingInsightsQuiz.id === "sample_quiz") {
        setViewingInsightsQuiz(updatedSample);
      }

      if (exitSession) {
        setActiveSession(null);
        setSelectedQuiz(null);
        setViewingInsightsQuiz(updatedSample);
        setActiveTab("insights");
      } else {
        setActiveSession((curr: any) => curr ? { ...curr, attemptSaved: true, targetAttemptId: curr.targetAttemptId || baseAttemptData.id, retryOfAttemptNum: curr.retryOfAttemptNum || updatedAttempts.length } : null);
      }
      return;
    }

    const updatedQuizzes = quizzes.map((q: any) => {
      if (q.id === sessionToSave.quizId) {
        const currentUnique = q.uniqueCorrectIds || [];
        const updatedUniqueCorrectIds = Array.from(new Set([...currentUnique, ...correctIdsInSession]));
        let updatedAttempts = q.attempts || [];
        // Always prepend as a new entry — original attempt score stays locked
        updatedAttempts = [baseAttemptData, ...updatedAttempts];
        const correctSet = new Set(correctIdsInSession);
        const wrongMap = new Map();
        (q.wrongQuestions || []).forEach((w: any) => {
          const wid = w.id || w;
          if (!correctSet.has(wid)) wrongMap.set(wid, w);
        });
        wrongQsForQuiz.forEach((w: any) => { wrongMap.set(w.id, w); });
        const mergedWrongQuestions = Array.from(wrongMap.values());
        return { ...q, attempts: updatedAttempts, wrongQuestions: mergedWrongQuestions, uniqueCorrectIds: updatedUniqueCorrectIds };
      }
      return q;
    });

    setQuizzes(updatedQuizzes);
    setViewingInsightsQuiz(updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId));

    if (exitSession) {
      setActiveSession(null);
      setSelectedQuiz(null);
      const updatedQ = updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId);
      if (updatedQ) {
        setViewingInsightsQuiz(updatedQ);
        setActiveTab("insights");
      }
    } else {
      const updatedQ = updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId);
      const attemptLength = updatedQ?.attempts?.length || 1;
      setActiveSession((curr: any) => curr ? { ...curr, attemptSaved: true, targetAttemptId: curr.targetAttemptId || baseAttemptData.id, retryOfAttemptNum: curr.retryOfAttemptNum || attemptLength } : null);
    }

    const updatedQ = updatedQuizzes.find((q: any) => q.id === sessionToSave.quizId);
    const neonId = updatedQ?.neonId ?? updatedQ?.id;
    if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
      if (!isConnected) {
        setSyncToastMessage("Offline. Changes will sync automatically.");
        setTimeout(() => setSyncToastMessage(null), 3000);
      }
      updateMobileQuiz({
        userId: firebaseUser.uid, quizId: neonId,
        attempts: updatedQ.attempts, wrongQuestions: updatedQ.wrongQuestions, uniqueCorrectIds: updatedQ.uniqueCorrectIds,
      }).catch((err) => logger.warn("NeonSync",  quiz attempt update failed:", err));
    }
  };

  const playQuizDirectly = (quiz: any, mode: "all" | "random" | "range" | "unanswered" | "wrong") => {
    let qsList = quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || []);
    if (qsList.length === 0) {
      qsList = generateMockQuestionsForQuiz(quiz.title, quiz.questions);
    }

    let filteredQuestions = [...qsList];
    if (mode === "random") {
      const rndCount = Math.min(5, quiz.questions);
      filteredQuestions = filteredQuestions.sort(() => Math.random() - 0.5).slice(0, rndCount);
    } else if (mode === "wrong") {
      const wrongList = quiz.wrongQuestions || [];
      const allWrongIds = new Set<string>();
      (quiz.attempts || []).forEach((a: any) => {
        (a.wrongQuestionIds || []).forEach((id: string) => allWrongIds.add(id));
      });
      wrongList.forEach((w: any) => allWrongIds.add(w.id));
      
      if (allWrongIds.size > 0) {
        filteredQuestions = filteredQuestions.filter((q: any) => allWrongIds.has(q.id));
        
        if (filteredQuestions.length === 0) {
          if (Platform.OS === "web") {
            alert("Version Mismatch: Your previous incorrect questions belong to an older version of this quiz. Please clear the quiz history and try again.");
          } else {
            Alert.alert(
              "Version Mismatch", 
              "Your previous incorrect questions belong to an older version of this quiz. Please clear the quiz history to start fresh."
            );
          }
          return;
        }
      }
    }

    const session = {
      quizId: quiz.id,
      quizTitle: quiz.title,
      questions: filteredQuestions,
      selectionMode: mode,
      shuffleQuestions: false,
      shuffleAnswers: shuffleAnswers,
      showAnswerOnSubmit: true,
      timePerQuestion: null,
      currentIndex: 0,
      answers: {},
      submitted: [] as string[],
      isFinished: false,
      startedAt: Date.now()
    };

    setActiveSession(session);
  };

  const recalculateRetriesAfterDeletion = (attemptsList: any[]) => {
    const idToNewNum: Record<string, number> = {};
    attemptsList.forEach((a: any, index: number) => {
      idToNewNum[a.id] = attemptsList.length - index;
    });

    return attemptsList.map((a: any) => {
      if (a.mode === "retry") {
        if (idToNewNum[a.retryOfAttemptId]) {
          return { ...a, retryOfAttemptNum: idToNewNum[a.retryOfAttemptId] };
        } else {
          return { ...a, retryOfAttemptNum: "-" };
        }
      }
      return a;
    });
  };

  const handleDeleteAttemptOnMobile = (quizId: string, attemptId: string) => {
    if (quizId === "sample_quiz") {
      const q = sampleQuiz;
      const filteredAttempts = q.attempts.filter((a: any) => a.id !== attemptId);
      const nextAttempts = recalculateRetriesAfterDeletion(filteredAttempts);
      const nextWrong = nextAttempts.length === 0 ? [] : (q.wrongQuestions || []);
      const nextUnique = nextAttempts.length === 0 ? [] : (q.uniqueCorrectIds || []);
      const updatedSample = { ...q, attempts: nextAttempts, wrongQuestions: nextWrong, uniqueCorrectIds: nextUnique };
      setSampleQuiz(updatedSample);
      AsyncStorage.setItem("quizforge_sample_data", JSON.stringify(updatedSample));
      if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
        setViewingInsightsQuiz(updatedSample);
      }
      if (Platform.OS === "web") {
        alert("Attempt history updated.");
      } else {
        Alert.alert("Success", "Attempt deleted successfully.");
      }
      return;
    }

    const updatedQuizzes = quizzes.map((q) => {
      if (q.id === quizId) {
        const filteredAttempts = q.attempts.filter((a: any) => a.id !== attemptId);
        const nextAttempts = recalculateRetriesAfterDeletion(filteredAttempts);
        const nextWrong = nextAttempts.length === 0 ? [] : (q.wrongQuestions || []);
        const nextUnique = nextAttempts.length === 0 ? [] : (q.uniqueCorrectIds || []);
        return { ...q, attempts: nextAttempts, wrongQuestions: nextWrong, uniqueCorrectIds: nextUnique };
      }
      return q;
    });
    setQuizzes(updatedQuizzes);
    if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
      setViewingInsightsQuiz(updatedQuizzes.find((q) => q.id === quizId));
    }
    if (Platform.OS === "web") {
      alert("Attempt history updated.");
    } else {
      Alert.alert("Success", "Attempt deleted successfully.");
    }
  };

  const handleClearHistoryOnMobile = (quizId: string) => {
    if (quizId === "sample_quiz") {
      const updatedSample = { ...sampleQuiz, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] };
      setSampleQuiz(updatedSample);
      AsyncStorage.setItem("quizforge_sample_data", JSON.stringify(updatedSample));
      if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
        setViewingInsightsQuiz(updatedSample);
      }
      return;
    }

    const updatedQuizzes = quizzes.map((q) => {
      if (q.id === quizId) {
        return { ...q, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] };
      }
      return q;
    });
    setQuizzes(updatedQuizzes);
    if (viewingInsightsQuiz && viewingInsightsQuiz.id === quizId) {
      setViewingInsightsQuiz(updatedQuizzes.find((q) => q.id === quizId));
    }
  };

  const handleDeleteQuizOnMobile = (quizId: string) => {
    if (quizId === "sample_quiz") {
      setSampleDismissed(true);
      AsyncStorage.setItem("quizforge_sample_dismissed", "1");
      setViewingInsightsQuiz(null);
      setActiveTab(viewingInsightsQuizFromTab as any || "home");
      return;
    }

    const quizToDelete = quizzes.find(q => q.id === quizId);
    if (quizToDelete) {
      const neonId = quizToDelete.neonId ?? quizToDelete.id;
      // Tombstone both the local id and neonId so the sync filter
      // always finds a match regardless of which ID Neon returns.
      const idsToTombstone = Array.from(new Set([quizToDelete.id, neonId].filter(Boolean)));

      // ── Synchronously mark as deleted in memory ──────────────────────────
      // This is the critical guard: any Neon re-sync that fires while the app is
      // running (e.g. after internet reconnects and Firebase re-emits auth state)
      // will check pendingDeleteIdsRef before adding quizzes back to local state.
      idsToTombstone.forEach(id => pendingDeleteIdsRef.current.add(id));

      AsyncStorage.getItem("quizforge_pending_deletions").then(val => {
        const pending: string[] = val ? JSON.parse(val) : [];
        let changed = false;
        for (const tombId of idsToTombstone) {
          if (!pending.includes(tombId)) { pending.push(tombId); changed = true; }
        }
        if (changed) return AsyncStorage.setItem("quizforge_pending_deletions", JSON.stringify(pending));
      }).then(() => {
        // Fire the delete to Neon immediately if online (best-effort)
        if (firebaseUser && !String(neonId).startsWith("local_")) {
          return deleteMobileQuiz(firebaseUser.uid, neonId);
        }
      }).then((_res: any) => {
        // Whether the delete succeeded or failed, we intentionally keep the tombstone
        // in AsyncStorage. The sync pipeline is the ONLY place that clears tombstones —
        // it does so only after confirming the quiz is gone from Neon AND filtering it
        // out of local state. Clearing tombstones here (even on success) caused a bug
        // where pressing R would reload stale local data but find no tombstone to filter it.
      }).catch((err: any) => {
        logger.warn("NeonSync",  quiz delete failed or offline — tombstone kept for next sync:", err);
      });
    }

    AsyncStorage.getItem(`quiz_file_${quizId}`).then(uri => {
      if (uri) {
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
      AsyncStorage.removeItem(`quiz_file_${quizId}`).catch(() => {});
    }).catch(() => {});

    const updatedQuizzes = quizzes.filter((q) => q.id !== quizId);
    // Write immediately to AsyncStorage so any app restart loads the correct list.
    // Don't wait for the persistence useEffect — it fires after the render cycle and
    // a fast R-press could reload stale data before it runs.
    AsyncStorage.setItem(storageKey("quizzes"), JSON.stringify(updatedQuizzes)).catch(() => {});
    setQuizzes(updatedQuizzes);
    setViewingInsightsQuiz(null);
    setActiveTab(viewingInsightsQuizFromTab as any || "home");
  };

  const renderTrendsChart = (attempts: any[]) => {
    if (!attempts || attempts.length < 2) return null;
    const reversed = [...attempts].reverse();
    return (
      <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard, { marginBottom: 14 }]}>
        <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>{t('insight.score_trends') || "SCORE TRENDS"}</Text>
        <View style={{ flexDirection: "row", height: 110, alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 10 }}>
          {reversed.map((att: any, i: number) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <View style={{ height: 80, width: 14, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", justifyContent: "flex-end", borderRadius: 8, overflow: "hidden" }}>
                <View
                  style={{
                    height: `${att.score}%`,
                    width: "100%",
                    borderRadius: 8,
                    backgroundColor: att.score >= 75 ? "#00e5a0" : "#f59e0b",
                  }}
                />
              </View>
              <Text style={{ fontSize: 9, color: "#888888", marginTop: 6 }}>#{i + 1}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStudyDirectory = (quiz: any) => {
    const questionsList = quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || []);
    if (questionsList.length === 0) return null;
    
    const filtered = questionsList.filter((q: any) => 
      q.prompt.toLowerCase().includes(qQuery.toLowerCase()) ||
      q.answers.some((a: any) => a.text.toLowerCase().includes(qQuery.toLowerCase()))
    );
    
    return (
      <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
        <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 12 }]}>Quiz Directory & Study Guide</Text>
        
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          <Feather name="search" size={14} color="#888888" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search questions..."
            placeholderTextColor="#666"
            value={qQuery}
            onChangeText={setQQuery}
            style={{ flex: 1, fontSize: 12, color: settingsDarkMode ? "#ffffff" : "#0d0f14", padding: 0 }}
          />
        </View>
        
        <View style={{ height: 320, borderRadius: 12, overflow: "hidden" }}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {filtered.map((q: any, i: number) => {
              const isExpanded = expandedQId === q.id;
              return (
                <View key={q.id} style={{ borderRadius: 12, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", overflow: "hidden" }}>
                  <Pressable
                    onPress={() => setExpandedQId(isExpanded ? "directory" : q.id)}
                    style={{ flexDirection: "row", alignItems: "flex-start", padding: 10, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)" }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "bold", color: "#888888", marginRight: 8, marginTop: 1 }}>Q{i+1}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: settingsDarkMode ? "#dddddd" : "#333333", lineHeight: 16 }} numberOfLines={isExpanded ? undefined : 2}>
                      {q.prompt}
                    </Text>
                    <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#666" style={{ marginLeft: 6 }} />
                  </Pressable>
                  
                  {isExpanded && (
                    <View style={{ padding: 10, borderTopWidth: 1, borderTopColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", gap: 6 }}>
                      {q.answers.map((answer: any, aIdx: number) => (
                        <View 
                          key={aIdx} 
                          style={{ 
                            flexDirection: "row", 
                            alignItems: "center", 
                            padding: 8, 
                            borderRadius: 8, 
                            backgroundColor: answer.isCorrect ? "rgba(0, 229, 160, 0.05)" : "rgba(255,255,255,0.01)",
                            borderWidth: 1,
                            borderColor: answer.isCorrect ? "rgba(0, 229, 160, 0.12)" : "transparent"
                          }}
                        >
                          <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: answer.isCorrect ? "rgba(0, 229, 160, 0.15)" : "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                            <Text style={{ fontSize: 9, fontWeight: "bold", color: answer.isCorrect ? "#00e5a0" : "#888888" }}>
                              {answer.isCorrect ? "✓" : "-"}
                            </Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 11, color: answer.isCorrect ? "#00e5a0" : (settingsDarkMode ? "#bbbbbb" : "#444444") }}>
                            {answer.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            {filtered.length === 0 && (
              <Text style={{ fontSize: 11, color: "#666", textAlign: "center", paddingVertical: 10 }}>No matching questions found.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderBookmarkedQuestionsView = () => {
    if (!viewingInsightsQuiz) return null;
    const quiz = viewingInsightsQuiz;
    const isDark = settingsDarkMode;
    // Match the global root container background
    const bg = isDark ? "#0f172a" : "#f4f4f8";
    const textMain = isDark ? "#ffffff" : "#0d0f14";
    const textSub = isDark ? "#9ca3af" : "#6b7280";
    const cardBg = isDark ? "#1e293b" : "#ffffff";
    const border = isDark ? "#334155" : "#e5e7eb";

    const bookmarkedQs = (quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList || [])).filter((q: any) => starredQuestions.has(q.id));

    return (
      <View style={{ flex: 1, backgroundColor: bg }}>
        {/* Header matching Flashcard Options */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 24 }}>
          <Pressable onPress={() => setActiveTab("insights")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6, marginLeft: -6 })}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#ffffff" : "#0f172a"} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14" }}>{t('insight.bookmarked_questions') || "Bookmarked Questions"}</Text>
          {/* Use width: 36 to perfectly center the title against the 24px icon + 12px padding */}
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {bookmarkedQs.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40, marginTop: 40 }}>
              <Ionicons name="bookmark-outline" size={64} color={isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1"} style={{ marginBottom: 16 }} />
              <Text style={{ fontSize: 16, color: textSub, textAlign: "center" }}>{t('insight.no_bookmarks') || "No bookmarked questions yet."}</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              <Pressable 
                onPress={() => playQuizDirectly({ ...quiz, questionsList: bookmarkedQs }, "all")}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: isDark ? "#6366f1" : "#4f46e5", paddingVertical: 14, borderRadius: 12, marginBottom: 12 }, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>{t('insight.attempt_bookmarked') || "Attempt Bookmarked"}</Text>
              </Pressable>
              {bookmarkedQs.map((q: any, i: number) => {
                const isBookmarked = starredQuestions.has(q.id);
                return (
                <View key={q.id} style={{ padding: 16, borderRadius: 16, backgroundColor: cardBg, borderWidth: 1, borderColor: border }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: isDark ? "#f8fafc" : "#111827", lineHeight: 24 }}>
                      <Text style={{ color: isDark ? "#64748b" : "#9ca3af" }}>#{i + 1} </Text>
                      {q.prompt}
                    </Text>
                    <Pressable onPress={() => setStarredQuestions(prev => {
                      const next = new Set(prev);
                      if (next.has(q.id)) next.delete(q.id);
                      else next.add(q.id);
                      return next;
                    })} style={{ paddingLeft: 12 }}>
                      <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={isBookmarked ? (isDark ? "#94a3b8" : "#64748b") : (isDark ? "#64748b" : "#9ca3af")} />
                    </Pressable>
                  </View>
                  
                  <View style={{ gap: 8 }}>
                    {(q.options || []).map((opt: any, optIdx: number) => {
                      const isCorrect = opt.isCorrect;
                      return (
                        <View key={optIdx} style={[
                          { padding: 14, borderRadius: 12 },
                          isCorrect 
                            ? { backgroundColor: isDark ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)" }
                            : { backgroundColor: "transparent" }
                        ]}>
                          <Text style={{ 
                            fontSize: 15, 
                            color: isCorrect ? (isDark ? "#34d399" : "#059669") : (isDark ? "#94a3b8" : "#4b5563"),
                            fontWeight: isCorrect ? "500" : "400"
                          }}>
                            {opt.text}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )})}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderInsightsView = () => <InsightsTabScreen p={p} />;

  const renderDeckInsightsTab = () => <DeckInsightsTab p={p} />;

