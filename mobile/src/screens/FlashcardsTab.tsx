import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * FlashcardsTab — Flashcards tab — spaced repetition study mode.
 * Extracted from MainContentScreen/flashcards case (~889 lines).
 * Receives all state and handlers via p: any.
 */
export function FlashcardsTab({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;

  // --- verbatim from case "flashcards" in MainContentScreen ---
      case "flashcards" as any: {
        // ── Flashcard study mode ─────────────────────────────────────
        if (studyingDeck) {
          const isDark  = settingsDarkMode;
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

            // ── After a real study session → "Next steps" screen ────────────
            return (
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc", zIndex: 99 }}>
                {/* Header with Close Button */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 }}>
                  <Text style={{ fontSize: 24, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Next steps</Text>
                  <Pressable onPress={handleGoBack} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
                    <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 90 }} showsVerticalScrollIndicator={false}>
                  {/* Performance Breakdown Box */}
                  <View style={{ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                    {/* Perfectly */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Perfectly</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{sessionRatings.perfect}</Text>
                    </View>
                    {/* Well */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Well</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{sessionRatings.good}</Text>
                    </View>
                    {/* Not quite */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="close-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Not quite</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{sessionRatings.hard}</Text>
                    </View>
                    {/* Not at all */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="close-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Not at all</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{sessionRatings.again}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ gap: 12 }}>
                    <Pressable onPress={() => {
                        const savedIdx = studyingDeck.previewIndex || 0;
                        const startIdx = savedIdx >= studyingDeck.cards.length ? 0 : savedIdx;
                        const remainingCards = studyingDeck.cards.slice(startIdx);
                        
                        setStudyQueue(remainingCards.map((c: any) => c.id));
                        setStudyQueueTotal(studyingDeck.cards.length);
                        setIsPreviewMode(true);
                      }} style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                        <Text style={{ fontSize: 24 }}>📝</Text>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>
                            {studyingDeck.previewIndex && studyingDeck.previewIndex > 0 && studyingDeck.previewIndex < studyingDeck.cards.length 
                              ? "Resume Preview" 
                              : "Preview Flashcards"}
                          </Text>
                          {studyingDeck.previewIndex && studyingDeck.previewIndex > 0 && studyingDeck.previewIndex < studyingDeck.cards.length ? (
                            <Text style={{ fontSize: 13, color: settingsDarkMode ? "rgba(255,255,255,0.6)" : "#6b7280", marginTop: 2 }}>
                              Continuing from card {studyingDeck.previewIndex + 1}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                    </Pressable>

                    <Pressable 
                      onPress={() => {
                        setStudyingDeck(null);
                        setActiveTab("insights" as any);
                        setTimeout(() => handleOpenQuizOptions(viewingInsightsQuiz || quizzes[0] || {} as any), 300);
                      }} 
                      style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                        <Text style={{ fontSize: 24 }}>❓</Text>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Play Quiz</Text>
                      </View>
                      <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                    </Pressable>
                  </View>
                </ScrollView>

                {/* Bottom Pinned Done Button */}
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 10, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
                  <Pressable
                    onPress={handleGoBack}
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
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Done</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          const cardId = studyQueue[0];
          const card = studyingDeck.cards.find((c: any) => c.id === cardId) || studyingDeck.cards[0];
          const isCloze = studyingDeck.cardType === "Cloze";
          const isTypeInAnswer = studyingDeck.cardType === "Basic (type in the answer)";

          let frontText = card.front || card.question || card.prompt || "";
          let backText  = card.back || card.answer || "";
          if (isCloze) {
            frontText = String(frontText).replace(/\{\{c1::(.*?)\}\}/g, "[...]");
            backText  = String(frontText).replace(/\{\{c1::(.*?)\}\}/g, "$1");
          }

          const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg","180deg"] });
          const backInterpolate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg","360deg"] });
          const frontOpacity     = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: "clamp" });
          const backOpacity      = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: "clamp" });
          
          const swipeRotate = studyTiltAnim.interpolate({ inputRange: [-20, 0, 20], outputRange: ["-20deg", "0deg", "20deg"], extrapolate: "clamp" });

          const flipCard = () => {
            if (studyFlipped) {
              Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
              setStudyFlipped(false);
            } else {
              Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
              setStudyFlipped(true);
            }
          };

          const newCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition === 0; }).length;
          const learningCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval < 2; }).length;
          const reviewCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval >= 2; }).length;

          return (
            <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8" }}>

              {/* Header Row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#111827" }}>
                    {studyQueueTotal - studyQueue.length + 1}/{studyQueueTotal || 1}
                  </Text>
                  {isPreviewMode && (
                    <View style={{ backgroundColor: "rgba(99,102,241,0.18)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#818cf8", letterSpacing: 0.8 }}>PREVIEW</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => {
                  if (viewingInsightsQuiz) {
                    setStudyingDeck(null);
                    setActiveTab("insights");
                  } else {
                    setStudyingDeck(null);
                  }
                }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
                  <Ionicons name="close" size={26} color={isDark ? "#ffffff" : "#111827"} />
                </Pressable>
              </View>

              {/* Progress bar */}
              <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e0e0e8" }}>
                <View style={{ height: 4, backgroundColor: "#00d4aa", width: `${((studyQueueTotal - studyQueue.length + 1) / (studyQueueTotal || 1)) * 100}%` }} />
              </View>

              {/* Card Stack Area — same structure as Simple Preview */}
              <View style={{ flex: 1, padding: 16, paddingTop: 20 }}>

                {/* Transparent outer wrapper — handles swipe translate + shadow */}
                <Animated.View
                  style={{
                    flex: 1,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 24, elevation: 10,
                    transform: [{ translateX: swipeX }],
                  }}
                >
                  {/* FRONT FACE */}
                  <Animated.View 
                    pointerEvents={studyFlipped ? "none" : "auto"}
                    style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 24, backgroundColor: isDark ? "#253344" : "#ffffff",
                    backfaceVisibility: "hidden", overflow: "hidden",
                    opacity: frontOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
                  }}>
                    {/* Speaker — top right */}
                    <Pressable
                      onPress={() => toggleSpeech(frontText)}
                      style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === frontText ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
                    >
                      <Ionicons name="volume-high-outline" size={22} color={speakingText === frontText ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
                    </Pressable>

                    {/* Term — centred */}
                    <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingVertical: 52 }}>
                      {renderFormattedText(frontText, {
                        fontSize: 22, fontWeight: "500",
                        color: isDark ? "#f1f5f9" : "#111827",
                        lineHeight: 33, letterSpacing: 0.1,
                        textAlign: "center",
                      })}
                      {isTypeInAnswer && (
                        <View style={{ width: "100%", marginTop: 28, gap: 12 }}>
                          <TextInput
                            placeholder="Type your answer…"
                            placeholderTextColor={"rgba(255,255,255,0.4)"}
                            style={{ backgroundColor: "rgba(0,0,0,0.1)",
                              borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                              color: isDark ? "#ffffff" : "#0d0f14", fontSize: 16, textAlign: "center",
                              borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                            value={studyTypedAnswer} onChangeText={setStudyTypedAnswer}
                          />
                          <Pressable onPress={() => { setStudyChecked(true); flipCard(); }}
                            style={({ pressed }) => [{ backgroundColor: isDark ? "#ffffff" : "#0d0f14", borderRadius: 14, height: 48,
                              alignItems: "center", justifyContent: "center" }, pressed && styles.pressedScale]}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#000000" : "#ffffff" }}>Check Answer</Text>
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>

                  {/* BACK FACE */}
                  <Animated.View 
                    pointerEvents={studyFlipped ? "auto" : "none"}
                    style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 24, backgroundColor: isDark ? "#253344" : "#ffffff",
                    backfaceVisibility: "hidden", overflow: "hidden",
                    opacity: backOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
                  }}>
                    {/* Speaker — top right */}
                    <Pressable
                      onPress={() => toggleSpeech(backText)}
                      style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === backText ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
                    >
                      <Ionicons name="volume-high-outline" size={22} color={speakingText === backText ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
                    </Pressable>

                    {/* Answer + extras */}
                    <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40, paddingTop: 52 }}>
                      {renderFormattedText(backText, {
                        fontSize: 18, fontWeight: "400",
                        color: isDark ? "#ffffff" : "#0f172a",
                        lineHeight: 28, letterSpacing: 0.1,
                      })}
                      {isCloze && card.back.trim() ? (
                        <View style={{ width: "100%", marginTop: 20, paddingTop: 16,
                          borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)",
                            fontWeight: "700", letterSpacing: 1, textAlign: "center", marginBottom: 6 }}>EXTRA NOTES</Text>
                          {renderFormattedText(card.back, { fontSize: 14, color: "#e2e8f0", textAlign: "center", lineHeight: 20 })}
                        </View>
                      ) : null}
                      {isTypeInAnswer && studyChecked && (
                        <View style={{ marginTop: 20, alignItems: "center", width: "100%" }}>
                          {studyTypedAnswer.trim().toLowerCase() === card.back.trim().toLowerCase() ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
                              backgroundColor: "rgba(34,197,94,0.2)", paddingHorizontal: 18,
                              paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.4)" }}>
                              <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                              <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 14 }}>Correct!</Text>
                            </View>
                          ) : (
                            <View style={{ gap: 8, backgroundColor: "rgba(239,68,68,0.2)",
                              paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
                              alignItems: "center", width: "90%", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Ionicons name="close-circle" size={18} color="#f87171" />
                                <Text style={{ color: "#f87171", fontWeight: "700" }}>Incorrect</Text>
                              </View>
                              <Text style={{ fontSize: 13, color: "#f87171", textAlign: "center" }}>
                                Expected: <Text style={{ fontWeight: "700", color: isDark ? "#ffffff" : "#000" }}>{card.back}</Text>
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>

                </Animated.View>
              </View>

              {/* Bottom Actions — fixed height so card never shifts */}
              <View style={{ height: 130 + Math.max(insets.bottom, 16), paddingBottom: Math.max(insets.bottom, 16), justifyContent: "center", borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
              {isPreviewMode ? (
                // ── Preview mode: no rating buttons, just flip + advance ──
                <View style={{ paddingHorizontal: 20, gap: 12 }}>
                  {!studyFlipped ? (
                    <Pressable
                      onPress={() => { if (!isTypeInAnswer) flipCard(); }}
                      style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Show Answer</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        // Advance without updating SM2
                        const newQueue = studyQueue.slice(1);
                        setStudyQueue(newQueue);
                        
                        const newPreviewIndex = studyingDeck.cards.length - newQueue.length;
                        const updatedDeck = { ...studyingDeck, previewIndex: newPreviewIndex };
                        setStudyingDeck(updatedDeck);
                        setFlashcardDecks((prev) => prev.map(d => d.id === studyingDeck.id ? updatedDeck : d));
                        
                        setStudyFlipped(false);
                        flipAnim.setValue(0);
                        swipeX.setValue(0);
                        if (newQueue.length === 0) {
                          // Restore full deck so completion screen has accurate data
                          if (previewSourceDeckRef.current) {
                            setStudyingDeck(previewSourceDeckRef.current);
                            previewSourceDeckRef.current = null;
                          }
                          setIsPreviewMode(false);
                        }
                      }}
                      style={({ pressed }) => [{ backgroundColor: isDark ? "#334155" : "#e2e8f0", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#0f172a" }}>Next</Text>
                      <Ionicons name="chevron-forward" size={18} color={isDark ? "#ffffff" : "#0f172a"} />
                    </Pressable>
                  )}
                  <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)", textAlign: "center" }}>
                    Preview only — no changes to your review schedule
                  </Text>
                </View>
              ) : !studyFlipped ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <Pressable
                    onPress={() => { if (!isTypeInAnswer) flipCard(); }}
                    style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Show Answer</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={{ textAlign: "center", fontSize: 14, color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 14 }}>How well did you know this?</Text>
                  <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12 }}>
                    {[
                      { rating: "again"   as const, num: "1", label: "Again",   color: "#ef4444" },
                      { rating: "hard"    as const, num: "2", label: "Hard",    color: "#eab308" },
                      { rating: "good"    as const, num: "3", label: "Good",    color: "#22c55e" },
                      { rating: "perfect" as const, num: "4", label: "Perfect", color: "#00d4aa" },
                    ].map(({ rating, num, label, color }) => (
                      <Pressable
                        key={rating}
                        onPress={() => handleSM2Rating(rating)}
                        style={({ pressed }) => ({ flex: 1, alignItems: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
                      >
                        {({ pressed }) => (
                          <>
                            <View style={{
                              width: "100%", height: 52,
                              borderRadius: 12, borderWidth: 1.5, borderColor: color,
                              alignItems: "center", justifyContent: "center",
                              backgroundColor: selectedRating === rating || pressed ? color : "transparent", marginBottom: 8,
                            }}>
                              <Text style={{ fontSize: 20, fontWeight: "700", color: (selectedRating === rating || pressed) ? (rating === "hard" || rating === "perfect" ? "#000" : "#fff") : color }}>{num}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", textAlign: "center" }}>
                              {label}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              </View>
            </View>
          );
        }

        const allDecks = flashcardDecks;
        const isDark = settingsDarkMode;

        const openNewDeck = () => {
          setCreationMode("pick");
          setFcTitle("");
          setFcCategory("General");
          setFcCards([{ front: "", back: "" }]);
          setFcCurrentIdx(0);
          setEditingDeckId(null);
          setDeckNameInput("");
          setNameDeckAction("create");
          setShowNameDeckModal(true);
          setActiveTab("add");
        };

        return (() => {
          const isDark   = settingsDarkMode;
          const bg       = isDark ? "#0f172a" : "#f4f4f8";
          const cardBg   = isDark ? "#1e293b" : "#ffffff";
          const border   = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const border2  = isDark ? "#2a1e3a" : "rgba(168,85,247,0.2)";
          const txt      = isDark ? "#ffffff" : "#0d0f14";
          const muted    = isDark ? "#ffffff" : "#666677";

          return (
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Topbar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 52 }}>
              <View>
                <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>{t('flashcards.library') || "// your library"}</Text>
                <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>{t('flashcards.fc_title') || "Flashcards"}</Text>
              </View>
              <Pressable onPress={openNewDeck} style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(168,85,247,0.15)", borderWidth: 1, borderColor: isDark ? "#3a2a4a" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add" size={18} color="#a855f7" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="search" size={16} color={muted} />
              <TextInput 
                placeholder={t('flashcards.search') || "Search decks..."} 
                placeholderTextColor={muted} 
                style={{ flex: 1, fontSize: 13, color: txt, fontWeight: "300", padding: 0 }} 
                value={homeSearch} 
                onChangeText={setHomeSearch} 
              />
            </View>

            {/* Filters */}
            <View style={{ marginTop: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                {[
                  { key: "all", label: t('flashcards.all_decks') || "All Decks" },
                  { key: "due", label: t('flashcards.due') || "Due to Review" },
                  { key: "progress", label: t('flashcards.progress') || "In Progress" },
                  { key: "mastered", label: t('flashcards.mastered') || "Mastered" }
                ].map(c => (
                  <Pressable key={c.key} onPress={() => setFlashcardFilter(c.key as any)}
                    style={({ pressed }) => [{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: flashcardFilter === c.key ? "#8B5CF6" : "transparent",
                      borderWidth: 1, borderColor: flashcardFilter === c.key ? "#8B5CF6" : border,
                      alignSelf: "flex-start",
                    }, pressed && styles.pressedScale]}>
                    <Text style={{ fontSize: 11, letterSpacing: 0.5, color: flashcardFilter === c.key ? "#fff" : muted }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>


            {/* List Head */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase" }}>{t('flashcards.your_decks') || "Your decks"}</Text>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#a855f7" }}>{allDecks.length} {allDecks.length === 1 ? (t('flashcards.deck_singular') || 'deck') : (t('flashcards.deck_plural') || 'decks')}</Text>
            </View>

            {/* Deck List Grid */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 40, marginTop: 10 }}>
              {(() => {
                if (allDecks.length === 0) {
                  return (
                    <View style={{ width: "100%", alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="copy-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        {t('flashcards.empty_create') || "Click + to create your first deck"}
                      </Text>
                    </View>
                  );
                }
                const filteredDecks = allDecks.filter((d: any) => {
                  const matchSearch = d.title.toLowerCase().includes(homeSearch.toLowerCase());
                  if (!matchSearch) return false;
                  
                  const cardCount = (d.cards || []).length;
                  const dueCount = (d.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
                  const masteredCount = (d.cards || []).filter((c: any) => c.sm2_repetition > 0).length;
                  const masteryPercent = cardCount === 0 ? 0 : Math.round((masteredCount / cardCount) * 100);

                  if (flashcardFilter === "due") return dueCount > 0;
                  if (flashcardFilter === "progress") return masteryPercent > 0 && masteryPercent < 100;
                  if (flashcardFilter === "mastered") return masteryPercent === 100 && cardCount > 0;
                  return true;
                });
                if (filteredDecks.length === 0) {
                  return (
                    <View style={{ width: "100%", alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="search-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        {t('flashcards.empty_search') || "No decks match your search"}
                      </Text>
                    </View>
                  );
                }


                return (
                  <>
                    {filteredDecks.map((deck: any) => {
                      const cardCount = (deck.cards || []).length;
                      const dueCount = (deck.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
                      const masteredCount = (deck.cards || []).filter((c: any) => c.sm2_repetition > 0).length;
                      const masteryPercent = cardCount === 0 ? 0 : Math.round((masteredCount / cardCount) * 100);
                      
                      return (
                        <View key={deck.id} style={{ width: "100%", marginBottom: 20 }}>
                          <AnimatedPressable 
                            onPress={() => { startStudy(deck); }}
                            style={{ flexDirection: "row", alignItems: "center", width: "100%" }}
                            scaleTo={0.97}
                          >
                            {/* Left Icon Wrapper */}
                            <View style={{ 
                              width: 52, height: 52, borderRadius: 12, 
                              backgroundColor: isDark ? "#232e42" : "#e0e7ff", 
                              alignItems: "center", justifyContent: "center", marginRight: 16 
                            }}>
                              <Ionicons name="copy-outline" size={24} color={isDark ? "#38bdf8" : "#3b82f6"} style={{ transform: [{ rotate: "-5deg" }] }} />
                            </View>
                            
                            {/* Text Content */}
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 4 }} numberOfLines={1}>
                                {deck.title}
                              </Text>
                              <Text style={{ fontSize: 13, color: isDark ? "#e2e8f0" : "#64748b", fontWeight: "600" }}>
                                {cardCount} {cardCount === 1 ? (t('flashcards.term') || 'term') : (t('flashcards.terms') || 'terms')} • {dueCount} {t('flashcards.due') || 'due'}
                              </Text>
                            </View>

                            {/* Options Button */}
                            <Pressable 
                              onPress={(e) => { e.stopPropagation(); setShowFlashcardOptions(deck); }} 
                              style={({pressed}) => [{ padding: 8, opacity: pressed ? 0.5 : 1 }]}
                            >
                              <Ionicons name="ellipsis-vertical" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                            </Pressable>
                          </AnimatedPressable>
                        </View>
                      );
                    })}

                  </>
                );
              })()}
            </View>
          </ScrollView>
          );
        })();
      }


}
