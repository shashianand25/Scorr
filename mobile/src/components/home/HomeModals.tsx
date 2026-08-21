import { FontAwesome6 } from "@expo/vector-icons";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { ActiveSessionScreen } from "./QuizSessionScreen";
import React from "react";
import {
  View, Text, Pressable, ScrollView, Animated,
  Platform, TouchableOpacity, Modal, ActivityIndicator,
  Dimensions, StatusBar, KeyboardAvoidingView,
  TextInput, FlatList, Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ToggleSwitch } from "../components/ui/ToggleSwitch";
import { CardState } from "../utils/sm2";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import { AppModals } from "../components/modals/AppModals";
import { MainContentScreen } from "../screens/MainContentScreen";
import { AIGeneratingScreen, FullscreenBattleCountdown } from "../components/AIGeneratingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import type { HomeScreenProps } from "../types/HomeScreenProps";

/**
 * HomeModals — Battle history and study mode modals for HomeLayout.
 * Extracted from HomeLayout.tsx to reduce file size.
 */
export function HomeModals({ p }: { p: any }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
  const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  return (
    <>
        {/* ── Battle History Modal ── */}
        {/* ── Battle History Modal ── */}
        {showBattleHistory && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBattleHistory(false)}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8", paddingTop: Platform.OS === 'ios' ? 0 : 40 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
              padding: 20, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: txt }}>📜 Battle History</Text>
              <Pressable onPress={() => setShowBattleHistory(false)}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
                  alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            {(battleHistory || []).length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
                <Text style={{ fontSize: 48 }}>⚔️</Text>
                <Text style={{ fontSize: 18, fontWeight: "800", color: txt }}>No battles yet</Text>
                <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>Complete your first battle{"\n"}to see your history here!</Text>
              </View>
            ) : (
              <FlatList
                data={[...battleHistory].sort((a, b) => b.date - a.date)}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24, gap: 10 }}
                renderItem={({ item }) => {
                  const d = new Date(item.date);
                  const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const matchingQuiz = (quizzes || []).find((q: any) => q.title && item.quizTitle && q.title.trim().toLowerCase() === item.quizTitle.trim().toLowerCase()) || (item.quizTitle?.toLowerCase().includes("sample") ? sampleQuiz : null);
                  const questionsList = (item.questions && item.questions.length > 0) ? item.questions : (matchingQuiz?.questionsList || []);
                  const hasQuestions = questionsList && questionsList.length > 0;

                  return (
                    <Pressable
                      onPress={() => {
                        try {
                          if (hasQuestions) {
                            const attempt = {
                              score: item.myScore,
                              correct: questionsList.filter((q: any) => {
                                const selected = (item.answers || {})[q.id] || [];
                                const correctIds = (q.answers || []).filter((a: any) => a.isCorrect).map((a: any) => a.id);
                                return selected.length > 0 && selected.every((id: string) => correctIds.includes(id)) && selected.length === correctIds.length;
                              }).length,
                              date: item.date,
                              answers: item.answers || {},
                              questionIds: questionsList.map((q: any) => q.id),
                            };
                            const quiz = {
                              id: `battle_${item.roomCode || item.date}`,
                              title: `${item.quizTitle} (vs ${item.opponentName})`,
                              questionsList: questionsList,
                            };
                            setViewingReportCardData({ attempt, quiz });
                          } else {
                            Alert.alert(
                              "Report Card",
                              "Detailed answer breakdowns aren't available for battles completed before this update."
                            );
                          }
                        } catch (err: any) {
                          console.error("Failed to open battle report card:", err);
                          Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : "Couldn't load report card for this battle. Please try again.");
                        }
                      }}
                      style={({ pressed }) => [{
                        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                        borderRadius: 16, padding: 16,
                        borderWidth: 1, borderColor: item.won ? (isDark ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.15)") : cardBorder,
                        flexDirection: "row", alignItems: "center", gap: 14,
                      }, pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] }]}
                    >
                      <Text style={{ fontSize: 28 }}>{item.won ? "🏆" : "💀"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: txt, marginBottom: 2 }} numberOfLines={1}>{item.quizTitle}</Text>
                        <Text style={{ fontSize: 12, color: muted }}>vs {item.opponentName} · {dateStr}</Text>
                        {hasQuestions && (
                          <Text style={{ fontSize: 11, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "600", marginTop: 3 }}>
                            Tap to review answers →
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <View style={{ backgroundColor: item.won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                          borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: item.won ? "#22c55e" : "#ef4444" }}>
                            {item.won ? "WIN" : "LOSS"}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: muted }}>{item.myScore} – {item.opponentScore}</Text>
                        {item.myScore === item.opponentScore && item.myTime != null && item.opponentTime != null && (
                          <Text style={{ fontSize: 10, color: item.won ? "#22c55e" : "#ef4444", fontWeight: "600", marginTop: -2 }}>
                            {item.won ? "+" : "-"}{(Math.abs(item.opponentTime - item.myTime) / 1000).toFixed(1)}s
                          </Text>
                        )}
                      </View>
                      {hasQuestions && (
                        <Ionicons name="chevron-forward" size={16} color={muted} style={{ marginLeft: 2 }} />
                      )}
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </Modal>
        )}
          </>
        );
      })()}
      {/* ── Study Mode Modal ── */}
      {studyModeModalVisible && (() => {
        const isDark = settingsDarkMode;
        const quiz = viewingInsightsQuiz;
        const allCards = quiz?.flashcards || [];
        const dueCards = allCards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now());
        const countLabel = `${allCards.length} Flashcards available`;

        const getLimit = () => {
          if (studyCardCount === "auto") return null;
          return studyCardCount;
        };

        const handleStart = () => {
          if (selectedStudyMode === "spaced" && dueCards.length === 0) {
            // No due cards — go straight to the completion screen instead of an alert
            setStudyModeModalVisible(false);
            const savedDeck = flashcardDecks.find((d: any) => d.id === `temp-${quiz?.id}`);
            const savedCardsMap = new Map((savedDeck?.cards || []).map((c: any) => [c.id, c]));
            const mergedCards = allCards.map((c: any, i: number) => {
              const cardId = c.id || `fc-${i}`;
              const saved = savedCardsMap.get(cardId) as any;
              return {
                ...c, id: cardId,
                sm2_interval:       saved?.sm2_interval       ?? c.sm2_interval       ?? 0,
                sm2_repetition:     saved?.sm2_repetition     ?? c.sm2_repetition     ?? 0,
                sm2_easeFactor:     saved?.sm2_easeFactor     ?? c.sm2_easeFactor     ?? 2.5,
                sm2_state:          saved?.sm2_state          ?? c.sm2_state          ?? CardState.NEW,
                sm2_nextReviewDate: saved?.sm2_nextReviewDate ?? c.sm2_nextReviewDate ?? null,
              };
            });
            const tempDeck = { id: `temp-${quiz?.id}`, neonId: null,
              title: quiz?.title || "Flashcards", cardType: "Basic", cards: mergedCards };
            setFlashcardDecks((prev: any[]) => {
              const exists = prev.find((d: any) => d.id === tempDeck.id);
              return exists
                ? prev.map((d: any) => d.id === tempDeck.id ? { ...d, cards: mergedCards } : d)
                : [...prev, tempDeck];
            });
            setStudyingDeck(tempDeck);
            setStudyQueue([]);         // empty queue → completion screen
            setIsPreviewMode(false);
            flipAnim.setValue(0);
            swipeX.setValue(0);
            setActiveTab("flashcards" as any);
            return;
          }

          setStudyModeModalVisible(false);
          if (selectedStudyMode === "simple") {
            setFcIndex(0);
            setFcFlipped(false);
            insightsFlipAnim.setValue(0);
            insightsSwipeX.setValue(0);
            insightsSwipeY.setValue(0);
            setActiveTab("insights-flashcard" as any);
          } else {
            const limit = getLimit();

            // Look up any previously saved SM2 progress for this quiz's flashcards
            const savedDeck = flashcardDecks.find((d: any) => d.id === `temp-${quiz?.id}`);
            const savedCardsMap = new Map((savedDeck?.cards || []).map((c: any) => [c.id, c]));

            // Merge SM2 data from saved deck into the current flashcards
            const mergedCards = allCards.map((c: any, i: number) => {
              const cardId = c.id || `fc-${i}`;
              const saved = savedCardsMap.get(cardId) as any;
              return {
                ...c,
                id: cardId,
                sm2_interval:       saved?.sm2_interval       ?? c.sm2_interval       ?? 0,
                sm2_repetition:     saved?.sm2_repetition     ?? c.sm2_repetition     ?? 0,
                sm2_easeFactor:     saved?.sm2_easeFactor     ?? c.sm2_easeFactor     ?? 2.5,
                sm2_state:          saved?.sm2_state          ?? c.sm2_state          ?? CardState.NEW,
                sm2_nextReviewDate: saved?.sm2_nextReviewDate ?? c.sm2_nextReviewDate ?? null,
              };
            });

            // Filter for due cards — add 5s buffer so "again" cards (nextReviewDate ≈ now) always qualify
            const now = Date.now() + 5000;
            const mergedDue = mergedCards.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= now);

            if (mergedDue.length === 0) {
              // No due cards — navigate to the full completion screen so user
              // can still Preview Next 5, Learn New Cards, Review All, etc.
              setStudyModeModalVisible(false);
              const tempDeck = {
                id: `temp-${quiz?.id}`,
                neonId: null,
                title: quiz?.title || "Flashcards",
                cardType: "Basic",
                cards: mergedCards,          // full merged deck, not just due
              };
              setFlashcardDecks((prev: any[]) => {
                const exists = prev.find((d: any) => d.id === tempDeck.id);
                return exists
                  ? prev.map((d: any) => d.id === tempDeck.id ? { ...d, cards: mergedCards } : d)
                  : [...prev, tempDeck];
              });
              setStudyingDeck(tempDeck);
              setStudyQueue([]);           // empty queue → triggers completion screen
              setIsPreviewMode(false);
              setNoDueAtStart(true);       // flag: we got here because 0 cards were due
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setActiveTab("flashcards" as any);
              return;
            }

            const cardsToStudy = limit ? mergedDue.slice(0, limit) : mergedDue;
            const tempDeck = {
              id: `temp-${quiz?.id}`,
              neonId: null,
              title: quiz?.title || "Flashcards",
              cardType: "Basic",
              cards: cardsToStudy,
            };

            // Save/update the temp deck in state so SM2 data persists
            setFlashcardDecks((prev: any[]) => {
              const exists = prev.find((d: any) => d.id === tempDeck.id);
              if (exists) {
                return prev.map((d: any) => d.id === tempDeck.id ? { ...d, cards: mergedCards } : d);
              }
              return [...prev, { ...tempDeck, cards: mergedCards }];
            });

            startStudy(tempDeck, false);
            setActiveTab("flashcards" as any);
          }
        };

        return (
          <Modal
            visible={studyModeModalVisible}
            animationType="fade"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={() => setStudyModeModalVisible(false)}
          >
            <KeyboardAvoidingView style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
              <View style={{ flex: 1, paddingTop: Math.max(insets.top, 16) + 12 }}>


                  {/* Header */}
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: "500", color: isDark ? "#ffffff" : "#0d0f14", fontFamily: "serif" }}>Study Mode</Text>
                <Pressable onPress={() => setStudyModeModalVisible(false)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}>
                  <Feather name="x" size={24} color={isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"} />
                </Pressable>
              </View>

              <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 100 }}>
                {/* Spaced Repetition option */}
                <Pressable
                  onPress={() => setSelectedStudyMode("spaced")}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "transparent",
                    borderRadius: 16, padding: 18, marginBottom: 14,
                    borderWidth: 2,
                    borderColor: selectedStudyMode === "spaced" ? "#34d399" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 40, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 26 }}>🧠</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 3 }}>Spaced Repetition</Text>
                    <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Optimizes retention with smart scheduling</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedStudyMode === "spaced" ? "#34d399" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"), alignItems: "center", justifyContent: "center" }}>
                    {selectedStudyMode === "spaced" && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#34d399" }} />}
                  </View>
                </Pressable>

                {/* Simple Review option */}
                <Pressable
                  onPress={() => setSelectedStudyMode("simple")}
                  style={({ pressed }) => ({
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: "transparent",
                    borderRadius: 16, padding: 18, marginBottom: 28,
                    borderWidth: 2,
                    borderColor: selectedStudyMode === "simple" ? "#34d399" : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View style={{ width: 40, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 26 }}>📋</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 3 }}>Simple Review</Text>
                    <Text style={{ fontSize: 13, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>Browse all cards at your own pace</Text>
                  </View>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedStudyMode === "simple" ? "#34d399" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"), alignItems: "center", justifyContent: "center" }}>
                    {selectedStudyMode === "simple" && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#34d399" }} />}
                  </View>
                </Pressable>


              </ScrollView>

              {/* Start Flashcards button — pinned to bottom */}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 16, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }}>
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => [
                    { backgroundColor: "#ffffff", borderRadius: 12, paddingVertical: 18, alignItems: "center" },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Start Flashcards</Text>
                </Pressable>
              </View>
            </View>
            </KeyboardAvoidingView>
          </Modal>
        );
      })()}
    </>
  );
}
