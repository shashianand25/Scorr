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
 * FlashcardNextStepsScreen — post-study 'what's next' options screen.
 * Extracted from FlashcardStudyView.tsx to reduce file size.
 */
export function FlashcardNextStepsScreen({ p }: { p: any }) {
  const { t } = useTranslation();
  const isDark = p?.settingsDarkMode ?? true;
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
  const { settingsDarkMode, insets } = p;
  const handleGoBack = () => { (p.setStudyingDeck || (() => {}))(null); if (p.viewingInsightsQuiz) (p.setActiveTab || (() => {}))('insights'); else (p.setActiveTab || (() => {}))('home'); };
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
  );
}
