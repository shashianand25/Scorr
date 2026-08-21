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
import { ResultsScreen } from "./QuizResultsScreen";
import type { HomeScreenProps } from "../types/HomeScreenProps";

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
    sessionTimeLeft, battleQuestionTimeLeft, battleTimePerQuestion,
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
    insets,
  } = p;

    if (!activeSession) return null;

    if (activeSession.isFinished) {
      return <ResultsScreen p={p} />;
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
                  setStarredQuestions((prev: any) => {
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
}


// ResultsScreen extracted to QuizResultsScreen.tsx for smaller file size.
// Re-exported here to preserve existing import paths.
export { ResultsScreen } from "./QuizResultsScreen";
