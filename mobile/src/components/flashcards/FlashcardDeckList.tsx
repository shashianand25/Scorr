import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");


/**
 * FlashcardDeckList — deck management list view.
 * Extracted from FlashcardsTab.tsx to reduce file size.
 */
export function FlashcardDeckList({ p }: { p: any }) {
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
                ].map((c: any) => (
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
