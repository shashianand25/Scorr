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
  Dimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { BattleTimer } from "../components/ui/BattleTimer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/**
 * QuizSessionScreen — active quiz session and results view.
 * Extracted from HomeScreen god-file (renderActiveSessionView + renderResultsView).
 * All state is received via p: any (same pattern as AppModals).
 */
export function ActiveSessionScreen({ p }: { p: any }) {
  const { t } = useTranslation();
  const {
    activeSession, setActiveSession,
    settingsDarkMode,
    isConnected, showReconnectedToast, offlineModalParams,
    battleRoomState, firebaseUser,
    sessionTimeLeft, battleQuestionTimeLeft,
    starredQuestions, setStarredQuestions,
    showQuitConfirm, setShowQuitConfirm,
    showQuizSettingsModal, setShowQuizSettingsModal,
    autoSlideEnabled, setAutoSlideEnabled,
    showRestartConfirm, setShowRestartConfirm,
    jumpPage, setJumpPage,
    quizFlatListRef, quizNumbersScrollRef,
    handleTimerExpiredRef,
    handleCheckAnswer, handleAnswerSelect, handleNavigateSession,
    handleFinishSession, saveAndExitQuizSession,
    toggleSpeech, speakingText,
    renderFormattedText, screenFadeAnim,
  } = p;

    if (!activeSession) return null;

    if (activeSession.isFinished) {
      return renderResultsView();
    }

    const currentIndex = activeSession.currentIndex;
    const currentQuestion = activeSession.questions[currentIndex];
    const totalQs = activeSession.questions.length;

    if (!currentQuestion) {
      return (
        <Animated.View style={[styles.sessionContainer, !settingsDarkMode && styles.lightSessionContainer]}>
          <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>No Questions available</Text>
          <Pressable onPress={() => setActiveSession(null)} style={styles.startQuizBtn}>
            <Text style={styles.startQuizBtnText}>Go Back</Text>
          </Pressable>
        </Animated.View>
      );
    }

    const selectedAnswers = activeSession.answers[currentQuestion.id] || [];
    const isAnswered = selectedAnswers.length > 0;
    // In battle mode: always show result immediately after selection (locked + colored)
    const showResult = activeSession.isBattle
      ? isAnswered
      : (activeSession.showAnswerOnSubmit && (activeSession.submitted || []).includes(currentQuestion.id));

    return (
      <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0a1020" : "#f4f4f8" }}>
        {/* Offline Banner for Battle */}
        {activeSession.isBattle && (!isConnected || showReconnectedToast) && !offlineModalParams && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: isConnected ? "#34d399" : "#fbbf24", paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}>
            <Ionicons name={isConnected ? "checkmark-circle" : "warning"} size={16} color={isConnected ? "#064e3b" : "#78350f"} />
            <Text style={{ color: isConnected ? "#064e3b" : "#78350f", fontSize: 13, fontWeight: "700" }}>{isConnected ? "Reconnected" : "Connection lost. Reconnecting..."}</Text>
          </View>
        )}
        {/* Session Header / Battle Header */}
        {activeSession.isBattle ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
            backgroundColor: settingsDarkMode ? "#0a1020" : "#f4f4f8", borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>

            {/* Scoreboard */}
            {(() => {
              const hostScore = battleRoomState?.hostScore || 0;
              const guestScore = battleRoomState?.guestScore || 0;
              // Always show current player on LEFT, opponent on RIGHT
              const myScore = activeSession.isHost ? hostScore : guestScore;
              const opponentScore = activeSession.isHost ? guestScore : hostScore;
              const myName = activeSession.isHost
                ? (battleRoomState?.hostName || firebaseUser?.displayName || "You")
                : (battleRoomState?.guestName || firebaseUser?.displayName || "You");
              const opponentName = activeSession.isHost
                ? (battleRoomState?.guestName || "Rival")
                : (battleRoomState?.hostName || "Host");

              let myFlex = 0.5;
              if (myScore > 0 || opponentScore > 0) {
                myFlex = myScore / (myScore + opponentScore);
              }
              const qTotal = activeSession.questions?.length || 0;
              const qCurrent = (activeSession.currentIndex || 0) + 1;

              return (
                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    {/* Left — always YOU */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 18 }}>🦊</Text>
                      <View>
                        <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700" }}>{myName}</Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.5 }}>{myScore}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "center", gap: 4 }}>
                      <View style={{ backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: settingsDarkMode ? "#52525b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{qCurrent}/{qTotal}</Text>
                      </View>
                      <View style={{ backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 }}>
                        <BattleTimer startTime={activeSession.startTime || Date.now()} settingsDarkMode={settingsDarkMode} />
                      </View>
                      {battleTimePerQuestion != null && (
                        <View style={{ backgroundColor: battleQuestionTimeLeft <= 5 ? "rgba(239,68,68,0.15)" : (settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                          paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
                          borderWidth: battleQuestionTimeLeft <= 5 ? 1 : 0,
                          borderColor: "rgba(239,68,68,0.4)" }}>
                          <Text style={{ fontSize: 13, fontWeight: "900", letterSpacing: -0.5,
                            color: battleQuestionTimeLeft <= 5 ? "#ef4444" : (settingsDarkMode ? "#94a3b8" : "#64748b") }}>
                            {battleQuestionTimeLeft}s
                          </Text>
                        </View>
                      )}
                    </View>
                    {/* Right — always OPPONENT */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 11, color: settingsDarkMode ? "#71717a" : "#64748b", fontWeight: "700" }}>{opponentName}</Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.5 }}>{opponentScore}</Text>
                      </View>
                      <Text style={{ fontSize: 18 }}>🐺</Text>
                    </View>
                  </View>
                  <View style={{ height: 6, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)", borderRadius: 99, overflow: "hidden", flexDirection: "row" }}>
                    <View style={{ flex: myFlex, backgroundColor: "#6366f1", borderRadius: 99 }} />
                    <View style={{ flex: 1 - myFlex, backgroundColor: "#ec4899", borderRadius: 99 }} />
                  </View>
                </View>
              );
            })()}
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Pressable onPress={() => setShowQuitConfirm(true)} style={({ pressed }) => [{ padding: 8, marginLeft: -8, marginRight: 8 }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="chevron-back" size={24} color={settingsDarkMode ? "#e2e8f0" : "#0d0f14"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: settingsDarkMode ? "#f8fafc" : "#0d0f14" }} numberOfLines={1}>
                  {activeSession.quizTitle}
                </Text>
                <Text style={{ fontSize: 12, color: settingsDarkMode ? "#64748b" : "#666677", marginTop: 2 }}>
                  {activeSession.category || "Internal Medicine Mix"}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {(activeSession.quizTimeLimit != null || activeSession.timePerQuestion != null) && (
                <View style={[styles.sessionTimerBox, sessionTimeLeft <= 30 && { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" }]}>
                  <Ionicons name="time-outline" size={13} color={sessionTimeLeft <= 30 ? "#ef4444" : "#00e5a0"} style={{ marginRight: 4 }} />
                  <Text style={[styles.sessionTimerText, sessionTimeLeft <= 30 && { color: "#ef4444" }]}>
                    {`${String(Math.floor(sessionTimeLeft / 60)).padStart(2, "0")}:${String(sessionTimeLeft % 60).padStart(2, "0")}`}
                  </Text>
                </View>
              )}
              <Pressable
                onPress={() => setShowQuizSettingsModal(true)}
                style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: settingsDarkMode ? "#334155" : "#e1e4e8", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="settings" size={18} color={settingsDarkMode ? "#94a3b8" : "#24292f"} />
              </Pressable>
              <Pressable
                onPress={() => {
                  const qId = currentQuestion.id;
                  setStarredQuestions(prev => {
                    const next = new Set(prev);
                    if (next.has(qId)) next.delete(qId); else next.add(qId);
                    return next;
                  });
                }}
                style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: settingsDarkMode ? "#334155" : "#e1e4e8", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name={starredQuestions.has(currentQuestion.id) ? "bookmark" : "bookmark-outline"} size={16} color={starredQuestions.has(currentQuestion.id) ? "#3b82f6" : (settingsDarkMode ? "#94a3b8" : "#24292f")} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Horizontal Number Progress */}
        <View style={{ marginBottom: 20 }}>
          {activeSession.isBattle || activeSession.timePerQuestion != null ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: settingsDarkMode ? "#e2e8f0" : "#334155" }}>
                Question {currentIndex + 1} of {totalQs}
              </Text>
            </View>
          ) : (
          <ScrollView 
            ref={quizNumbersScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
          >
            {activeSession.questions.map((q: any, i: number) => {
              const isActive = i === currentIndex;
              const isSubmitted = (activeSession.submitted || []).includes(q.id);
              const selected = activeSession.answers[q.id] || [];
              const isAnswered = selected.length > 0;
              
              let isCorrect = false;
              if (isAnswered) {
                const correctIds = q.answers.filter((a: any) => a.isCorrect).map((a: any) => a.id);
                isCorrect = selected.length === correctIds.length && selected.every((id: string) => correctIds.includes(id));
              }

              let bgColor = "transparent";
              let textColor = settingsDarkMode ? "#94a3b8" : "#666677";
              
              if (activeSession.showAnswerOnSubmit && isSubmitted) {
                bgColor = isCorrect ? (settingsDarkMode ? "rgba(16, 185, 129, 0.2)" : "#d1fae5") : (settingsDarkMode ? "rgba(239, 68, 68, 0.2)" : "#fee2e2");
                textColor = settingsDarkMode ? "#ffffff" : "#0f172a";
              } else if (!activeSession.showAnswerOnSubmit && isAnswered) {
                 // if answered but not submitted yet (like in a mock test)
                 bgColor = settingsDarkMode ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0";
                 textColor = settingsDarkMode ? "#f1f5f9" : "#0f172a";
              }



              return (
                <Pressable
                  key={q.id}
                  onPress={() => {
                    if (activeSession.isBattle) return; // Disable navigation in battle mode
                    handleNavigateSession(i);
                    quizFlatListRef.current?.scrollToIndex({ index: i, animated: false });
                  }}
                  style={{ alignItems: "center" }}
                >
                  <View style={{
                    width: 32, height: 32, borderRadius: 16, overflow: "hidden",
                    backgroundColor: bgColor,
                    borderWidth: 1, borderColor: bgColor === "transparent" ? "transparent" : bgColor,
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>{i + 1}</Text>
                  </View>
                  {isActive && (
                    <View style={{ marginTop: 4, width: 24, height: 2, backgroundColor: settingsDarkMode ? "#34d399" : "#059669", borderRadius: 1 }} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          )}
        </View>

        <FlatList
          ref={quizFlatListRef}
          data={activeSession.questions}
          keyExtractor={(item: any) => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={!activeSession.isBattle && activeSession.timePerQuestion == null}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentIndex}
          getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          onMomentumScrollEnd={(e) => {
            const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (newIndex !== currentIndex) {
              handleNavigateSession(newIndex);
            }
          }}
          renderItem={({ item: qst, index: qIdx }) => {
            const itemSelectedAnswers = activeSession.answers[qst.id] || [];
            const itemShowResult = activeSession.showAnswerOnSubmit && (activeSession.submitted || []).includes(qst.id);

            return (
              <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
                  
                  {/* Battle: question label */}
                  {activeSession.isBattle && (
                    <View style={{ marginBottom: 16, marginTop: 4 }}>
                      <View style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start", borderWidth: 1, borderColor: "rgba(99,102,241,0.25)" }}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#818cf8", letterSpacing: 1 }}>QUESTION {qIdx + 1}</Text>
                      </View>
                    </View>
                  )}

                  <Text 
                    style={{ fontSize: 18, color: activeSession.isBattle ? "#f1f5f9" : (settingsDarkMode ? "#f1f5f9" : "#24292f"), lineHeight: 28, marginBottom: 20, textAlign: "left", fontWeight: activeSession.isBattle ? "600" : "500" }}
                  >
                    {qst.prompt}
                  </Text>

                  {qst.imageUrl && (
                    <Image 
                      source={{ uri: qst.imageUrl }} 
                      style={{ width: "100%", height: 200, borderRadius: 12, marginBottom: 20, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} 
                      resizeMode="contain" 
                    />
                  )}

                  {/* Options */}
                  <View style={{ gap: 12 }}>
                    {qst.answers.map((answer: any, idx: number) => {
                      const isSelected = itemSelectedAnswers.includes(answer.id);
                      // In battle: show result immediately after any answer is selected, but DON'T dim others
                      const effectiveShowResult = activeSession.isBattle
                        ? itemSelectedAnswers.length > 0
                        : itemShowResult;
                      const correctHighlight = effectiveShowResult && answer.isCorrect;
                      const wrongHighlight = effectiveShowResult && isSelected && !answer.isCorrect;

                      // Determine border and background colors
                      let containerBg = settingsDarkMode ? "transparent" : "#ffffff";
                      let containerBorder = settingsDarkMode ? "rgba(255,255,255,0.15)" : "#e1e4e8";
                      let circleBg = settingsDarkMode ? "transparent" : "#f1f5f9";
                      let circleBorder = settingsDarkMode ? "rgba(255, 255, 255, 0.2)" : "#cbd5e1";
                      let textColor = settingsDarkMode ? "#e2e8f0" : "#24292f";

                      if (correctHighlight) {
                        containerBg = "rgba(34,197,94,0.15)";
                        containerBorder = "#22c55e";
                        circleBg = "#22c55e";
                        circleBorder = "#22c55e";
                        textColor = settingsDarkMode ? "#ffffff" : "#0f172a";
                      } else if (wrongHighlight) {
                        containerBg = "rgba(239,68,68,0.15)";
                        containerBorder = "#ef4444";
                        circleBg = "#ef4444";
                        circleBorder = "#ef4444";
                        textColor = settingsDarkMode ? "#ffffff" : "#0f172a";
                      } else if (isSelected && !effectiveShowResult) {
                        // Just selected, not checked yet
                        containerBg = settingsDarkMode ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9";
                        containerBorder = settingsDarkMode ? "#ffffff" : "#0d0f14";
                        circleBg = settingsDarkMode ? "#ffffff" : "#0d0f14";
                        circleBorder = settingsDarkMode ? "#ffffff" : "#0d0f14";
                      }

                      return (
                        <Pressable
                          key={answer.id}
                          disabled={effectiveShowResult}
                          onPress={() => handleAnswerSelect(qst, answer.id)}
                          style={({ pressed }) => [{
                            flexDirection: "row", alignItems: "center",
                            paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16,
                            backgroundColor: containerBg,
                            borderWidth: 1,
                            borderBottomWidth: 3,
                            borderColor: containerBorder,
                          }, pressed && !effectiveShowResult && { opacity: 0.7, transform: [{ scale: 0.99 }] }]}
                        >
                          <View style={{
                            width: 28, height: 28, borderRadius: qst.type === "multiple_choice" ? 6 : 14, overflow: "hidden",
                            backgroundColor: circleBg, borderWidth: 1, borderColor: circleBorder,
                            alignItems: "center", justifyContent: "center", marginRight: 14,
                          }}>
                            {qst.type === "multiple_choice" && (isSelected || correctHighlight || wrongHighlight) ? (
                              <Ionicons name="checkmark" size={18} color={(correctHighlight || wrongHighlight) ? "#fff" : (isSelected && !effectiveShowResult) ? (settingsDarkMode ? "#000000" : "#ffffff") : (settingsDarkMode ? "#cbd5e1" : "#475569")} />
                            ) : (
                              <Text style={{ fontSize: 12, fontWeight: "800",
                                color: (correctHighlight || wrongHighlight) ? "#fff" :
                                  (isSelected && !effectiveShowResult) ? (settingsDarkMode ? "#000000" : "#ffffff") :
                                  (settingsDarkMode ? "#cbd5e1" : "#475569") }}>
                                {String.fromCharCode(65 + idx)}
                              </Text>
                            )}
                          </View>
                          <Text style={{ flex: 1, fontSize: 15, color: textColor, lineHeight: 22,
                            fontWeight: "500" }}>
                            {answer.text}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          }}
        />

        {/* Floating Action Button */}
        <View style={{ position: "absolute", bottom: Math.max(insets.bottom, 20) + 20, right: 24, zIndex: 10 }}>
          {activeSession.showAnswerOnSubmit && currentQuestion.type === "multiple_choice" && !(activeSession.submitted || []).includes(currentQuestion.id) ? (
            <Pressable
              disabled={selectedAnswers.length === 0}
              onPress={() => handleCheckAnswer(currentQuestion.id)}
              style={({ pressed }) => [{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: settingsDarkMode ? "#6366f1" : "#4f46e5",
                alignItems: "center", justifyContent: "center",
                opacity: selectedAnswers.length === 0 ? 0.4 : (pressed ? 0.7 : 1),
                shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
              }]}
            >
              <Ionicons name="checkmark" size={28} color="#ffffff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                if (currentIndex < totalQs - 1) {
                  const newIdx = currentIndex + 1;
                  handleNavigateSession(newIdx);
                  quizFlatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                } else {
                  handleFinishSession();
                }
              }}
              style={({ pressed }) => [{
                width: 56, height: 56, borderRadius: 28,
                backgroundColor: activeSession.isBattle ? "#6366f1" : (settingsDarkMode ? "#6366f1" : "#4f46e5"),
                alignItems: "center", justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
                shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6
              }]}
            >
              <Ionicons name={currentIndex === totalQs - 1 ? "checkmark" : "arrow-forward"} size={28} color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

}

export function ResultsScreen({ p }: { p: any }) {
  const { t } = useTranslation();
  const {
    activeSession, setActiveSession,
    settingsDarkMode,
    battleRoomState, firebaseUser,
    battleHistory,
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
  };

}
