import { FlashcardNextStepsScreen } from "./FlashcardNextStepsScreen";
import { FlashcardCardView } from "./FlashcardCardView";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");


/**
 * FlashcardStudyView — card-flip study session view.
 * Extracted from FlashcardsTab.tsx to reduce file size.
 */
export function FlashcardStudyView({ p }: { p: any }) {
  const { t } = useTranslation();
  const isDark = p?.settingsDarkMode ?? true;
  const {
    settingsDarkMode = true, flashcardDecks = [], setFlashcardDecks = () => {},
    studyingDeck = null, setStudyingDeck = () => {},
    studyQueue = [], setStudyQueue = () => {},
    isPreviewMode = false, setIsPreviewMode = () => {},
    fcIndex = 0, setFcIndex = () => {},
    fcCards = [], fcCurrentIdx = 0, setFcCards = () => {}, setFcCurrentIdx = () => {},
    fcTitle = "", setFcTitle = () => {}, editingDeckId = null, setEditingDeckId = () => {},
    setActiveTab = () => {}, startStudy = () => {},
    studyFlipped = false, setStudyFlipped = () => {},
    toggleSpeech = () => {}, speakingText = null,
    renderFormattedText = (txt: string) => <Text>{txt}</Text>,
    studyTypedAnswer = "", setStudyTypedAnswer = () => {},
    studyChecked = false, setStudyChecked = () => {},
    insets = { top: 0, bottom: 0, left: 0, right: 0 },
    flipAnim = new Animated.Value(0), swipeX = new Animated.Value(0),
    previewSourceDeckRef = { current: null },
    handleSM2Rating = () => {}, selectedRating = null,
    setCreationMode = () => {}, setFcCategory = () => {},
    setDeckNameInput = () => {}, setNameDeckAction = () => {},
    setShowNameDeckModal = () => {},
    homeSearch = "", setHomeSearch = () => {},
    flashcardFilter = "all", setFlashcardFilter = () => {},
    setShowFlashcardOptions = () => {},
    viewingInsightsQuiz = null, setStudyQueueTotal = () => {}, studyQueueTotal = 0,
    noDueAtStart = false, setNoDueAtStart = () => {},
    sessionRatings = { again: 0, hard: 0, good: 0, perfect: 0 },
    handleOpenQuizOptions = () => {}, quizzes = [], studyTiltAnim = new Animated.Value(0),
  } = p || {};

if (studyingDeck) {
          
          const cardBg  = isDark ? "#334155" : "#475569";
          const pageBg  = isDark ? "#0f172a" : "#f4f4f8";
          
          if (studyQueue.length === 0 && !isPreviewMode) {
            // ── Completion screen ────────────────────────────────────────
            const allCards: any[] = studyingDeck.cards || [];
            const totalCards = allCards.length;
            // Count cards that have been seen at least once (sm2_nextReviewDate set)
            const reviewedCards = allCards.filter((c: any) => !!c.sm2_nextReviewDate).length;
            const reviewedPct = totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;
            // Count truly mastered (graduated to Review interval ≥ 1 day)
            // Require at least 2 repetitions and 3-day interval to count as truly mastered (SM-2 convention)
            const masteredCards = allCards.filter((c: any) => (c.sm2_repetition ?? 0) >= 2 && (c.sm2_interval ?? 0) >= 3).length;

            // Upcoming cards — not yet due, sorted soonest first
            const nowMs = Date.now();
            const upcomingCards = allCards
              .filter((c: any) => c.sm2_nextReviewDate && c.sm2_nextReviewDate > nowMs)
              .sort((a: any, b: any) => a.sm2_nextReviewDate - b.sm2_nextReviewDate);

            // Next review time (soonest due card)
            const nextReviewMs = upcomingCards.length > 0 ? upcomingCards[0].sm2_nextReviewDate : null;
            const formatCountdown = (ms: number) => {
              const diff = ms - nowMs;
              if (diff <= 0) return "now";
              const secs = Math.floor(diff / 1000);
              const mins = Math.floor(secs / 60);
              const hrs  = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (days > 0) return `${days}d ${hrs % 24}h`;
              if (hrs > 0) return `${hrs}h ${mins % 60}m`;
              if (mins > 0) return `${mins}m`;
              return "< 1m";
            };

            const formatRelative = (ms: number) => {
              const diff = ms - nowMs;
              if (diff <= 0) return "now";
              const secs = Math.floor(diff / 1000);
              const mins = Math.floor(secs / 60);
              const hrs  = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (days >= 2) return `in ${days} days`;
              if (days === 1) return "tomorrow";
              if (hrs > 0) return `in ${hrs}h ${mins % 60}m`;
              if (mins > 0) return `in ${mins}m`;
              return "in < 1m";
            };

            // New (unseen) cards available to learn
            const newCards = allCards.filter((c: any) => !c.sm2_nextReviewDate && (c.sm2_repetition ?? 0) === 0);

            // Preview candidates — next 5 upcoming
            const previewCandidates = upcomingCards.slice(0, 5);

            const handleGoBack = () => {
              setIsPreviewMode(false);
              if (viewingInsightsQuiz) {
                setStudyingDeck(null);
                setActiveTab("insights" as any);
              } else {
                setStudyingDeck(null);
              }
            };

            const handleLearnNew = () => {
              if (newCards.length === 0) return;
              setIsPreviewMode(false);
              // Build a deck of only new cards
              const newDeck = { ...studyingDeck, cards: newCards };
              setStudyQueue(newCards.map((c: any) => c.id));
              setStudyQueueTotal(newCards.length);
              setStudyingDeck(newDeck);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setStudyTypedAnswer("");
              setStudyChecked(false);
            };

            const handlePreviewNext = () => {
              if (previewCandidates.length === 0) return;
              // Save the full deck so we can restore it after preview finishes
              previewSourceDeckRef.current = studyingDeck;
              const previewDeck = { ...studyingDeck, cards: previewCandidates };
              setStudyQueue(previewCandidates.map((c: any) => c.id));
              setStudyQueueTotal(previewCandidates.length);
              setStudyingDeck(previewDeck);
              setIsPreviewMode(true);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
            };

            const masteredPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

            const handleReviewAll = () => {
              setIsPreviewMode(false);
              // Start a full SM-2 review of all cards in the deck, regardless of due date
              const allDeck = { ...studyingDeck, cards: allCards };
              setStudyQueue(allCards.map((c: any) => c.id));
              setStudyingDeck(allDeck);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setStudyTypedAnswer("");
              setStudyChecked(false);
            };

            const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
            const surface = isDark ? "#141930" : "#ffffff";
            const border  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
            const txt     = isDark ? "#ffffff" : "#0d0f14";
            const muted   = isDark ? "rgba(255,255,255,0.7)" : "#64748b";
            const sep     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

            // ── Branch: 0-due-at-start → "You're all caught up!" screen ──────
            if (noDueAtStart) {
              return (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: bg, zIndex: 99 }}>
                  <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Hero */}
                    <View style={{ alignItems: "center", paddingTop: 72, paddingBottom: 28, paddingHorizontal: 24 }}>
                      <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: isDark ? "rgba(0,212,170,0.1)" : "rgba(0,212,170,0.12)",
                        borderWidth: 1.5, borderColor: "rgba(0,212,170,0.35)",
                        alignItems: "center", justifyContent: "center",
                        marginBottom: 24,
                        shadowColor: "#00d4aa", shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
                      }}>
                        <Text style={{ fontSize: 46 }}>🎉</Text>
                      </View>
                      <Text style={{ fontSize: 30, fontWeight: "800", color: txt,
                        textAlign: "center", letterSpacing: -0.5, marginBottom: 8 }}>
                        You're all caught up!
                      </Text>
                      <Text style={{ fontSize: 15, color: muted, textAlign: "center", lineHeight: 22, marginBottom: 18 }}>
                        All due cards have been reviewed.
                      </Text>
                      {nextReviewMs ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7,
                          backgroundColor: "rgba(0,212,170,0.1)",
                          borderRadius: 24, paddingHorizontal: 18, paddingVertical: 9,
                          borderWidth: 1, borderColor: "rgba(0,212,170,0.3)" }}>
                          <Ionicons name="time-outline" size={15} color="#00d4aa" />
                          <Text style={{ fontSize: 14, color: "#00d4aa", fontWeight: "700" }}>
                            Next review in {formatCountdown(nextReviewMs)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Stat tiles */}
                    <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 14 }}>
                      <View style={{ flex: 1, backgroundColor: surface, borderRadius: 20,
                        padding: 18, borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#00d4aa" }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#00d4aa",
                            letterSpacing: 1.1, textTransform: "uppercase" }}>Reviewed</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: "800", color: txt, lineHeight: 36 }}>{reviewedCards}</Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 3, marginBottom: 14 }}>of {totalCards} cards</Text>
                        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e8f0fe", borderRadius: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: "#00d4aa", width: `${reviewedPct}%` as any }} />
                        </View>
                      </View>
                      <View style={{ flex: 1, backgroundColor: surface, borderRadius: 20,
                        padding: 18, borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#818cf8" }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#818cf8",
                            letterSpacing: 1.1, textTransform: "uppercase" }}>Mastered</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: "800", color: txt, lineHeight: 36 }}>{masteredCards}</Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 3, marginBottom: 14 }}>of {totalCards} cards</Text>
                        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e8f0fe", borderRadius: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: "#818cf8", width: `${masteredPct}%` as any }} />
                        </View>
                      </View>
                    </View>

                    {/* Coming up */}
                    {upcomingCards.length > 0 && (
                      <View style={{ marginHorizontal: 20, backgroundColor: surface, borderRadius: 20,
                        borderWidth: 1, borderColor: border, marginBottom: 20, overflow: "hidden",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
                          borderBottomWidth: 1, borderBottomColor: sep }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.1,
                            textTransform: "uppercase", color: muted }}>Coming Up</Text>
                        </View>
                        {upcomingCards.slice(0, 5).map((c: any, i: number) => (
                          <View key={c.id || i} style={{ flexDirection: "row", alignItems: "center",
                            paddingHorizontal: 18, paddingVertical: 13,
                            borderTopWidth: i === 0 ? 0 : 1, borderTopColor: sep }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3,
                              backgroundColor: "#00d4aa", marginRight: 14, flexShrink: 0, opacity: 0.7 }} />
                            <Text style={{ flex: 1, fontSize: 14, color: txt, lineHeight: 20 }} numberOfLines={1}>
                              {c.front || c.question || c.prompt || "Card"}
                            </Text>
                            <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#f1f5f9",
                              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                              marginLeft: 12, flexShrink: 0 }}>
                              <Text style={{ fontSize: 12, color: muted, fontWeight: "500" }}>
                                {formatRelative(c.sm2_nextReviewDate)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={{ paddingHorizontal: 20, gap: 10 }}>
                      {/* Review All */}
                      <Pressable
                        onPress={handleReviewAll}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", justifyContent: "center",
                          gap: 10, height: 58, borderRadius: 18,
                          backgroundColor: newCards.length > 0 ? (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0") : "#6366f1",
                          borderWidth: newCards.length > 0 ? 1 : 0,
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          opacity: pressed ? 0.85 : 1,
                          shadowColor: newCards.length > 0 ? "transparent" : "#6366f1", shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: newCards.length > 0 ? 0 : 0.3, shadowRadius: 10, elevation: newCards.length > 0 ? 0 : 5,
                        })}
                      >
                        <Ionicons name="refresh-circle-outline" size={22} color={newCards.length > 0 ? (isDark ? "#ffffff" : "#0f172a") : "#ffffff"} />
                        <Text style={{ fontSize: 16, fontWeight: "700", color: newCards.length > 0 ? (isDark ? "#ffffff" : "#0f172a") : "#ffffff" }}>
                          Review All Cards
                        </Text>
                      </Pressable>

                      {/* Learn New — indigo */}
                      {newCards.length > 0 && (
                        <Pressable
                          onPress={handleLearnNew}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 10, height: 56, borderRadius: 18,
                            backgroundColor: "#6366f1",
                            opacity: pressed ? 0.85 : 1,
                            shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
                          })}
                        >
                          <Ionicons name="book-outline" size={20} color="#fff" />
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                            Learn New Cards ({newCards.length})
                          </Text>
                        </Pressable>
                      )}

                      {/* Preview Next — ghost */}
                      {previewCandidates.length > 0 && (
                        <Pressable
                          onPress={handlePreviewNext}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 10, height: 52, borderRadius: 18,
                            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e8eaf6",
                            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(99,102,241,0.15)",
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Ionicons name="eye-outline" size={18} color={isDark ? "#94a3b8" : "#6366f1"} />
                          <Text style={{ fontSize: 15, fontWeight: "600",
                            color: isDark ? "#cbd5e1" : "#4338ca" }}>
                            Preview Next {previewCandidates.length}
                          </Text>
                        </Pressable>
                      )}

                      {/* Back — text only */}
                      <Pressable
                        onPress={() => { setNoDueAtStart(false); handleGoBack(); }}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", justifyContent: "center",
                          gap: 6, height: 44, opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Ionicons name="chevron-back" size={16} color={muted} />
                        <Text style={{ fontSize: 14, fontWeight: "500", color: muted }}>
                          {viewingInsightsQuiz ? "Back to Quiz" : "Back to Deck"}
                        </Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              );
            }


            // ── After a real study session → "Next steps" screen ── extracted to FlashcardNextStepsScreen.tsx
            return <FlashcardNextStepsScreen p={p} />;
          }
        }
      }
    }
    return null;
}
