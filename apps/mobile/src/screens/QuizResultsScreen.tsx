import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  FlatList,
  ActivityIndicator,
  Share,
  Dimensions, Image,
} from "react-native";
import { generateMockQuestionsForQuiz } from "../utils/quiz";
import { finishBattle, listenToBattleRoom, getBattleRoom } from "../lib/multiplayer";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { BattleTimer } from "../components/ui/BattleTimer";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * QuizSessionScreen — active quiz session and results view.
 * Extracted from HomeScreen god-file (renderActiveSessionView + renderResultsView).
 * All state is received via p: any (same pattern as AppModals).
 */

export function ResultsScreen({ p }: { p: any }) {
  const { t } = useTranslation();
  const {
    activeSession, setActiveSession,
    settingsDarkMode,
    battleRoomState, firebaseUser,
    battleHistory,
    insets, quizzes, isHost,
    battleFinishedCalledRef, battleUnsubscribeRef,
    saveBattleResult, setBattlePopup,
    setBattleRoomCode, setBattleRoomState,
    setIsHost, setJoinCodeInput, setActiveTab,
    starredQuestions, setStarredQuestions,
    viewingReportCardData, setViewingReportCardData,
    showWrongReview, setShowWrongReview,
    snapshotReviewData, setSnapshotReviewData,
    selectedAttemptForModal, setSelectedAttemptForModal,
    saveAndExitQuizSession, handleFinishSession,
    screenFadeAnim, renderFormattedText,
    triggerConfettiBurst, expandedAttemptsMap, setExpandedAttemptsMap,
    reportCardQs,
  } = p;

    if (!activeSession) return null;

    if (activeSession.isBattle) {
      const hostScore = activeSession.isHost ? (activeSession.correctCount || 0) : (battleRoomState?.hostScore || 0);
      const guestScore = activeSession.isHost ? (battleRoomState?.guestScore || 0) : (activeSession.correctCount || 0);
      const myScore = activeSession.correctCount || 0;
      const opponentScore = activeSession.isHost ? guestScore : hostScore;
      const opponentName = activeSession.isHost ? (battleRoomState?.guestName || "Rival") : (battleRoomState?.hostName || "Host");
      const myName = activeSession.isHost ? (battleRoomState?.hostName || "You") : (battleRoomState?.guestName || "You");

      const iFinished = activeSession.isFinished || false;
      const opponentFinished = activeSession.isHost ? (battleRoomState?.guestFinished || false) : (battleRoomState?.hostFinished || false);
      const bothFinished = iFinished && opponentFinished;

      // Trigger finishBattle once when both players are done
      // (done via useEffect-like guard using a ref to avoid calling on every render)
      if (bothFinished && battleRoomState?.status !== "finished") {
        // This is in render — use a ref to ensure only called once
        if (!battleFinishedCalledRef.current) {
          battleFinishedCalledRef.current = true;
          finishBattle(activeSession.battleRoomCode || "").catch(console.error);
        }
      } else if (!bothFinished) {
        battleFinishedCalledRef.current = false;
      }

      const exitBattle = () => {
        if (battleRoomState && (!battleRoomState.hostFinished || !battleRoomState.guestFinished)) {
          const code = battleRoomState.id;
          const host = isHost;
          const unsubscribe = listenToBattleRoom(code, (data) => {
            if (data.hostFinished && data.guestFinished) {
              const myScore = host ? data.hostScore : data.guestScore;
              const oppScore = host ? data.guestScore : data.hostScore;
              const oppName = host ? (data.guestName || "Opponent") : data.hostName;
              let effectiveWin = false;
              let myTime = host ? (data.hostTime ?? Infinity) : (data.guestTime ?? Infinity);
              let oppTime = host ? (data.guestTime ?? Infinity) : (data.hostTime ?? Infinity);
              if (myScore > oppScore) effectiveWin = true;
              else if (myScore === oppScore) {
                effectiveWin = myTime < oppTime;
              }
              const qList = activeSession.questions || [];
              const aMap = activeSession.answers || {};
              saveBattleResult(code, myScore, oppScore, oppName, data.quizTitle || "", effectiveWin, myTime !== Infinity ? myTime : undefined, oppTime !== Infinity ? oppTime : undefined, qList, aMap);
              setBattlePopup({ myScore, opponentScore: oppScore, opponentName: oppName, won: effectiveWin, myTime, opponentTime: oppTime });
              if (effectiveWin) triggerConfettiBurst();
              unsubscribe();
            }
          });
        }

        if (battleUnsubscribeRef.current) battleUnsubscribeRef.current();
        setBattleRoomCode("");
        setBattleRoomState(null);
        setActiveSession(null);
        setIsHost(false);
        setJoinCodeInput("");
        setActiveTab("battle");
      };

      // ── WAITING FOR OPPONENT ────────────────────────────────────────
      if (!bothFinished) {
        const isDark = settingsDarkMode;
        const bg = isDark ? "#0f172a" : "#f4f4f8";
        const cardBg = isDark ? "#1e293b" : "#ffffff";
        const txt = isDark ? "#ffffff" : "#0d0f14";
        const muted = isDark ? "#94a3b8" : "#64748b";
        const border = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";

        return (
          <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
            {/* My score card */}
            <View style={{ backgroundColor: cardBg, borderRadius: 20, padding: 24, width: "100%",
              borderWidth: 1, borderColor: border, alignItems: "center", marginBottom: 28 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
                {t('battle.your_score') || "Your Score"}
              </Text>
              <Text style={{ fontSize: 56, fontWeight: "900", color: txt, letterSpacing: -2 }}>{myScore}</Text>
              <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                {t('quiz_results.score_desc', { correct: activeSession.correctCount || 0, total: activeSession.questions?.length || 0 }) || `${activeSession.correctCount || 0} correct of ${activeSession.questions?.length || 0} questions`}
              </Text>
            </View>

            {/* Waiting indicator */}
            <View style={{ alignItems: "center", marginBottom: 36, gap: 12 }}>
              <ActivityIndicator size="large" color={isDark ? "#818cf8" : "#6366f1"} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: txt }}>
                {t('battle.waiting_finish', { name: opponentName }) || `Waiting for ${opponentName} to finish…`}
              </Text>
              <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                {t('battle.both_done_desc') || "Results will appear when both players are done."}
              </Text>
              <Pressable
                onPress={() => {
                  if (activeSession?.battleRoomCode) {
                    getBattleRoom(activeSession.battleRoomCode).then(data => {
                      if (data) setBattleRoomState(data);
                    });
                  }
                }}
                style={({ pressed }) => [{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#818cf8" : "#6366f1" }}>{t('battle.refresh_status') || "Refresh Status"}</Text>
              </Pressable>
            </View>

            {/* Exit button */}
            <Pressable
              onPress={exitBattle}
              style={({ pressed }) => [{
                borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.15)" : "#e2e8f0",
                paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center",
              }, pressed && { opacity: 0.7 }]}
            >
              <Text style={{ color: muted, fontSize: 15, fontWeight: "600" }}>{t('battle.exit_to_library') || "Exit to Library"}</Text>
            </Pressable>
          </View>
        );
      }

      // ── FULL RESULTS (both finished) ────────────────────────────────
      const isWinner = myScore > opponentScore;
      // Tie-break by speed: lower time wins
      const myTimeState = activeSession.isHost ? battleRoomState?.hostTime : battleRoomState?.guestTime;
      const myTime = myTimeState ?? (Date.now() - (activeSession.startTime || Date.now()));
      const opponentTime = activeSession.isHost ? (battleRoomState?.guestTime ?? Infinity) : (battleRoomState?.hostTime ?? Infinity);
      const isTie = myScore === opponentScore;
      const tiebreakerWin = isTie && myTime < opponentTime;
      const isPerfectDraw = isTie && myTime === opponentTime;
      const effectiveWin = isWinner || tiebreakerWin;
      const totalQs = activeSession.questions?.length || 0;
      const accuracy = totalQs > 0 ? Math.round((activeSession.correctCount || 0) / totalQs * 100) : 0;

      return (
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
          <ScrollView contentContainerStyle={{ alignItems: "center", padding: 24, paddingTop: 60, paddingBottom: 80 }}>
            {/* Trophy badge */}
            <View style={{
              width: 110, height: 110, borderRadius: 55,
              backgroundColor: effectiveWin ? (settingsDarkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)") : isPerfectDraw ? (settingsDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)") : (settingsDarkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)"),
              borderWidth: 1.5,
              borderColor: effectiveWin ? "rgba(34,197,94,0.35)" : isPerfectDraw ? "rgba(99,102,241,0.35)" : "rgba(239,68,68,0.25)",
              alignItems: "center", justifyContent: "center", marginBottom: 18
            }}>
              <Text style={{ fontSize: 50 }}>{effectiveWin ? "🏆" : isPerfectDraw ? "🤝" : "💀"}</Text>
            </View>

            <Text style={{ fontSize: 34, fontWeight: "900", letterSpacing: -1, marginBottom: 4,
              color: effectiveWin ? "#22c55e" : isPerfectDraw ? "#6366f1" : "#ef4444" }}>
              {effectiveWin ? (t('battle.victory') || "VICTORY!") : isPerfectDraw ? (t('battle.draw') || "DRAW!") : (t('battle.defeated') || "DEFEATED")}
            </Text>
            {/* Tie-breaker explanation */}
            {isTie && !isPerfectDraw && (
              <View style={{ backgroundColor: tiebreakerWin ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.08)",
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 6,
                borderWidth: 1, borderColor: tiebreakerWin ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.2)" }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: tiebreakerWin ? "#22c55e" : "#ef4444" }}>
                  {tiebreakerWin ? (t('battle.tiebreaker_won') || "⚡ You were faster — tiebreaker win!") : (t('battle.tiebreaker_lost') || "⚡ Opponent was faster — tiebreaker loss")}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 14, color: settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 28, textAlign: "center", fontWeight: "500" }}>
              {effectiveWin ? (t('battle.dominated_msg') || "You dominated the quiz!") : isPerfectDraw ? (t('battle.draw_msg') || "Perfect match!") : (t('battle.defeated_msg') || "Better luck next time!")}
            </Text>

            {/* Score card */}
            <View style={{ flexDirection: "row",
              backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff",
              borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.08)" : "#e2e8f0",
              borderRadius: 18, padding: 18, width: "100%", marginBottom: 14, alignItems: "center", gap: 12 }}>
              {/* Me */}
              <View style={[{ flex: 1, alignItems: "center", padding: 10, borderRadius: 12 },
                effectiveWin && { backgroundColor: settingsDarkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.07)" }]}>
                <Text style={{ fontSize: 26 }}>🦊</Text>
                <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700", marginBottom: 2 }}>{myName}</Text>
                <Text style={{ fontSize: 30, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -1 }}>{myScore}</Text>
                <Text style={{ fontSize: 10, color: settingsDarkMode ? "#52525b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>{t('battle.pts') || "pts"}</Text>
                {effectiveWin && <View style={{ backgroundColor: "rgba(34,197,94,0.2)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5 }}>{t('battle.winner_badge') || "Winner"}</Text>
                </View>}
              </View>

              <Text style={{ fontSize: 14, fontWeight: "900", color: settingsDarkMode ? "#3f3f46" : "#cbd5e1" }}>VS</Text>

              {/* Opponent */}
              <View style={[{ flex: 1, alignItems: "center", padding: 10, borderRadius: 12 },
                !effectiveWin && !isPerfectDraw && { backgroundColor: settingsDarkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.07)" }]}>
                <Text style={{ fontSize: 26 }}>🐺</Text>
                <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700", marginBottom: 2 }}>{opponentName}</Text>
                <Text style={{ fontSize: 30, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -1 }}>{opponentScore}</Text>
                <Text style={{ fontSize: 10, color: settingsDarkMode ? "#52525b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>{t('battle.pts') || "pts"}</Text>
                {!effectiveWin && !isPerfectDraw && <View style={{ backgroundColor: "rgba(34,197,94,0.2)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: "#22c55e", textTransform: "uppercase", letterSpacing: 0.5 }}>{t('battle.winner_badge') || "Winner"}</Text>
                </View>}
              </View>
            </View>

            {/* Stats row */}
            <View style={{ flexDirection: "row", gap: 10, width: "100%", marginBottom: 32 }}>
              {[{label: t('library.questions_count') || "Questions", value: String(totalQs)}, {label: t('quiz_results.correct') || "Correct", value: String(activeSession.correctCount || 0)}, {label: t('dashboard.accuracy') || "Accuracy", value: accuracy + "%"}].map((s) => (
                <View key={s.label} style={{ flex: 1,
                  backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff",
                  borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "#e2e8f0",
                  borderRadius: 14, padding: 12, alignItems: "center" }}>
                  <Text style={{ fontSize: 9, color: settingsDarkMode ? "#52525b" : "#94a3b8", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</Text>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: settingsDarkMode ? "#fff" : "#0d0f14" }}>{s.value}</Text>
                </View>
              ))}
            </View>

            {/* Exit button */}
            <Pressable
              onPress={() => {
                const myTimeMs = activeSession.isHost ? (battleRoomState?.hostTime ?? Infinity) : (battleRoomState?.guestTime ?? Infinity);
                const oppTimeMs = activeSession.isHost ? (battleRoomState?.guestTime ?? Infinity) : (battleRoomState?.hostTime ?? Infinity);
                const qList = activeSession.questions || [];
                const aMap = activeSession.answers || {};
                saveBattleResult(activeSession.battleRoomCode, myScore, opponentScore, opponentName, activeSession.quizTitle || "", effectiveWin, myTimeMs !== Infinity ? myTimeMs : undefined, oppTimeMs !== Infinity ? oppTimeMs : undefined, qList, aMap);
                exitBattle();
              }}
              style={({ pressed }) => [{
                backgroundColor: "#6366f1",
                paddingVertical: 16, borderRadius: 14, width: "100%", alignItems: "center",
              }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{t('battle.back_to_lobby') || "⚔️ Back to Battle Lobby"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }
    const questions = activeSession.questions;
    const totalQs = questions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const wrongQsForQuiz: any[] = [];

    // Compute real scores from recorded answers
    questions.forEach((q: any) => {
      const selected: string[] = (activeSession.answers as Record<string, string[]>)?.[q.id] || [];
      const correctIds: string[] = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
      if (selected.length === 0) {
        skippedCount++;
      } else {
        const isAllCorrect =
          selected.every((id: string) => correctIds.includes(id)) &&
          selected.length === correctIds.length;
        if (isAllCorrect) correctCount++;
        else { wrongCount++; wrongQsForQuiz.push(q); }
      }
    });

    const handleReattemptWrong = () => {
      if (wrongQuestionObjects.length === 0) return;
      setActiveSession({
        ...activeSession,
        attemptSaved: false,
        questions: wrongQuestionObjects,
        currentIndex: 0,
        answers: {},
        submitted: [] as string[],
        isFinished: false,
        startedAt: Date.now()
      });
      setShowWrongReview(false);
    };

    const handleRetakeEntire = () => {
      const origQuiz = quizzes.find((q: any) => q.id === activeSession.quizId);
      const title = origQuiz ? origQuiz.title : activeSession.quizTitle;
      
      let qsList = origQuiz && origQuiz.questionsList && origQuiz.questionsList.length > 0
        ? [...origQuiz.questionsList]
        : [...activeSession.questions];
        
      if (qsList.length === 0) {
        qsList = generateMockQuestionsForQuiz(title, origQuiz ? origQuiz.questions : activeSession.questions.length);
      }

      if (activeSession.shuffleQuestions) {
        qsList = qsList.sort(() => Math.random() - 0.5);
      }
      if (activeSession.shuffleAnswers) {
        qsList = qsList.map((q: any) => ({
          ...q,
          answers: [...q.answers].sort(() => Math.random() - 0.5)
        }));
      }

      setActiveSession({
        quizId: activeSession.quizId,
        quizTitle: title,
        targetAttemptId: activeSession.targetAttemptId,
        retryOfAttemptNum: activeSession.retryOfAttemptNum,
        attemptSaved: false,
        questions: qsList,
        selectionMode: activeSession.selectionMode || "all",
        shuffleQuestions: activeSession.shuffleQuestions || false,
        shuffleAnswers: activeSession.shuffleAnswers || false,
        showAnswerOnSubmit: activeSession.showAnswerOnSubmit !== false,
        timePerQuestion: activeSession.timePerQuestion || null,
        quizTimeLimit: activeSession.quizTimeLimit || null,
        currentIndex: 0,
        answers: {},
        submitted: [] as string[],
        isFinished: false,
        startedAt: Date.now()
      });
      setShowWrongReview(false);
    };

    const wrongQuestionIds = wrongQsForQuiz.map((wq: any) => wq.id);
    const wrongQuestionObjects = questions.filter((q: any) => wrongQuestionIds.includes(q.id));

    const scorePct = totalQs > 0 ? Math.round((correctCount / totalQs) * 100) : 0;
    const xpGained = correctCount * 20;

    return (
      <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
        {/* Header with Close Button */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 20, paddingBottom: 0 }}>
          <Text style={{ fontSize: 24, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{t('quiz_results.title') || "Quiz Results"}</Text>
          <Pressable onPress={() => saveAndExitQuizSession(true)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
            <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
          </Pressable>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 90 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot */}
          <View style={{ alignItems: "center", marginBottom: 32, marginTop: 4 }}>
            {/* Mascot Placeholder */}
            <View style={{ position: "relative", alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="robot-happy" size={72} color="#00e5a0" />
              <View style={{ position: "absolute", bottom: -10, flexDirection: "row", gap: 6 }}>
                <View style={{ width: 16, height: 8, backgroundColor: "#00e5a0", borderRadius: 4, transform: [{rotate: "-20deg"}] }} />
                <View style={{ width: 20, height: 10, backgroundColor: "#00e5a0", borderRadius: 5 }} />
                <View style={{ width: 16, height: 8, backgroundColor: "#00e5a0", borderRadius: 4, transform: [{rotate: "20deg"}] }} />
              </View>
            </View>
          </View>

          {/* Score Box */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 48, fontWeight: "800", color: "#84cc16" }}>{scorePct}%</Text>
            <Text style={{ fontSize: 15, color: settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)", marginTop: 4 }}>
              {t('quiz_results.score_desc', { correct: correctCount, total: totalQs }) || `${correctCount} out of ${totalQs} correct`}
            </Text>
          </View>

          {/* Stats Grid */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark-sharp" size={22} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{correctCount} {t('quiz_results.correct') || "Correct"}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close-sharp" size={22} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{wrongCount} {t('quiz_results.incorrect') || "Incorrect"}</Text>
            </View>
          </View>

          {/* Answered Box */}
          <View style={{ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "#0284c7", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>{totalQs}</Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{totalQs} {t('quiz_results.answered') || "Answered"}</Text>
          </View>

          {/* Report Card Button */}
          <Pressable 
            onPress={() => {
              if (!activeSession) return;
              // Snapshot the review data right now from the live session
              // so the modal never shows stale or empty content
              const qs = activeSession.questions || [];
              const ans = activeSession.answers || {};
              const snapshot = qs.map((q: any) => {
                const selected: string[] = ans[q.id] || [];
                const correctIds: string[] = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
                let status = "skipped";
                if (selected.length > 0) {
                  const isAllCorrect = selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
                  status = isAllCorrect ? "correct" : "wrong";
                }
                return {
                  id: q.id,
                  prompt: q.prompt,
                  explanation: q.explanation,
                  status,
                  selectedTexts: q.answers.filter((a: any) => selected.includes(a.id)).map((a: any) => a.text),
                  correctTexts: q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.text),
                };
              });
              setSnapshotReviewData(snapshot);
              setShowWrongReview(true);
            }}
            style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Text style={{ fontSize: 24 }}>📝</Text>
              <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{t('quiz_results.review_answers') || "Review Answers"}</Text>
            </View>
            <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
          </Pressable>
        </ScrollView>

        {/* Bottom Pinned Continue Button */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 10, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
          <Pressable
            onPress={() => saveAndExitQuizSession(true)}
            style={({ pressed }) => ({
              backgroundColor: "#ffffff",
              borderRadius: 16,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.8 : 1,
              shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>{t('quiz_results.continue_btn') || "Continue"}</Text>
          </Pressable>
        </View>
      </View>
    );
}
