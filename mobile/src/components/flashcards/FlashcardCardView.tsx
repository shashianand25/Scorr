import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");


/**
 * FlashcardCardView — the active card-flipping study interface.
 * Extracted from FlashcardStudyView.tsx to reduce file size.
 */
export function FlashcardCardView({ p }: { p: any }) {
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

            }
          };

          const newCount = studyQueue.filter((id: any) => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition === 0; }).length;
          const learningCount = studyQueue.filter((id: any) => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval < 2; }).length;
          const reviewCount = studyQueue.filter((id: any) => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval >= 2; }).length;

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
                        setFlashcardDecks((prev: any) => prev.map((d: any) => d.id === studyingDeck.id ? updatedDeck : d));
                        
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

}
