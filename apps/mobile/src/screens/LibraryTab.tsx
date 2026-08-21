import { RefreshControl } from "react-native";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * LibraryTab — Library tab — course catalogue and uploads.
 * Extracted from MainContentScreen/library case (~254 lines).
 * Receives all state and handlers via p: any.
 */
export function LibraryTab({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
    settingsDarkMode = true, libraryTab = "courses", setLibraryTab = () => {},
    quizzes = [], flashcardDecks = [],
    librarySearch = "", setLibrarySearch = () => {},
    setViewingInsightsQuiz = () => {}, setViewingInsightsQuizFromTab = () => {},
    setActiveTab = () => {}, startStudy = () => {},
    pullRefreshing = false, handlePullRefresh = async () => {},
    setShowAddMenu = () => {},
  } = p || {};

  // --- verbatim from case "library" in MainContentScreen ---
        // ── My Library ────────────────────────────────────────────
        const bg       = "#0B0F1A";
        const toggleBg = "#1A1E2E";
        const activeBg = "#252A3D";
        const muted    = "#8B8FA8";
        const txt      = "#ffffff";
        const border   = "rgba(255,255,255,0.12)";
        const accentPurple = "#8AB4F8";
        const accentPillBg = "#1E3A5F";

        const isCoursesTab = libraryTab === "courses";

        const filteredQuizzes = [...quizzes].filter((q: any) => {
          const qc = typeof q.questions === "number" ? q.questions : (q.questionsList?.length || 0);
          const cc = q.flashcards?.length || 0;
          if (qc === 0 && cc === 0) return false;
          return !librarySearch || q.title.toLowerCase().includes(librarySearch.toLowerCase());
        });
        const filteredDecks = flashcardDecks.filter((d: any) => {
          if (!d.cards || d.cards.length === 0) return false;
          return !librarySearch || d.title.toLowerCase().includes(librarySearch.toLowerCase());
        });

        const groupByTime = (items: any[], getDate: (item: any) => number) => {
          const now = Date.now();
          const oneWeek  = 7  * 24 * 60 * 60 * 1000;
          const twoWeeks = 14 * 24 * 60 * 60 * 1000;
          const groups: { label: string; items: any[] }[] = [
            { label: t('library.this_week') || "This week", items: [] },
            { label: t('library.last_week') || "Last week", items: [] },
            { label: t('library.older') || "Older",     items: [] },
          ];
          items.forEach(item => {
            const date = getDate(item);
            if (date === 0 || now - date < oneWeek)   groups[0].items.push(item);
            else if (now - date < twoWeeks)            groups[1].items.push(item);
            else                                       groups[2].items.push(item);
          });
          return groups.filter(g => g.items.length > 0);
        };

        const quizGroups = groupByTime(filteredQuizzes, (q: any) => {
          const attempts = q.attempts || [];
          const latestAttemptTime = attempts.length > 0
            ? Math.max(...attempts.map((a: any) => new Date(a.timestamp || a.date || 0).getTime() || 0))
            : 0;
          const createdTime = q.createdAt || q.created_at
            ? new Date(q.createdAt || q.created_at).getTime()
            : 0;
          const effectiveDate = Math.max(latestAttemptTime, createdTime);
          return effectiveDate > 0 ? effectiveDate : Date.now();
        });
        const deckGroups = groupByTime(filteredDecks, (d: any) => {
          const attempts = d.attempts || [];
          const latestAttemptTime = attempts.length > 0
            ? Math.max(...attempts.map((a: any) => new Date(a.timestamp || a.date || 0).getTime() || 0))
            : 0;
          const createdTime = d.createdAt || d.created_at
            ? new Date(d.createdAt || d.created_at).getTime()
            : 0;
          const effectiveDate = Math.max(latestAttemptTime, createdTime);
          return effectiveDate > 0 ? effectiveDate : Date.now();
        });

        const hasItems = isCoursesTab ? filteredQuizzes.length > 0 : filteredDecks.length > 0;

        const renderRow = (item: any, type: "quiz" | "deck") => {
          const isQuiz     = type === "quiz";
          const icoName    = "copy-outline";
          const icoColor   = isQuiz ? "#8AB4F8" : "#67E8F9";
          const iconBgCol  = isQuiz ? "#1A2240" : "#0D3040";
          const attempts   = item.attempts || [];
          const wrongCount = (item.wrongQuestions || []).length;
          const linkedDeck = isQuiz ? flashcardDecks.find((d: any) => d.id === `temp-${item.id}`) : null;
          
          let cardCount = 0;
          let dueCount = 0;
          
          if (isQuiz) {
            const allFlashcards = item.flashcards || [];
            cardCount = allFlashcards.length;
            const fcCardsWithState = cardCount > 0 
              ? allFlashcards.map((c: any, idx: number) => {
                  const cardId = c.id || `fc-${idx}`;
                  const saved = linkedDeck?.cards?.find((sc: any) => sc.id === cardId);
                  return saved ?? c;
                })
              : [];
            dueCount = fcCardsWithState.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
          } else {
            cardCount = (item.cards || []).length;
            dueCount = (item.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
          }

          const questionCount = item.questions || 0;
          let subtitleParts: string[] = [];
          if (isQuiz) {
            subtitleParts = [
              `${questionCount} ${t('actions.questions') || "questions"}`,
              `${cardCount} ${t('create_pick.flashcard_title') || "cards"}`,
              `${dueCount} ${t('library.due') || "due"}`
            ];
          } else {
            subtitleParts = [
              `Flashcard set`,
              `${cardCount} terms`,
              `by you`
            ];
          }
          const subtitle = subtitleParts.join("  ·  ");

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (isQuiz) {
                  setViewingInsightsQuiz(item);
                  setViewingInsightsQuizFromTab("library");
                  setActiveTab("insights");
                } else {
                  startStudy(item);
                }
              }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center",
                paddingVertical: 12, marginBottom: 16,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              {/* Flashcard stack icon */}
              <View style={{
                width: 46, height: 46, borderRadius: 12,
                backgroundColor: "#1C2B3A",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center", justifyContent: "center",
                marginRight: 14, flexShrink: 0,
              }}>
                {/* Back card — dark gray, rotated */}
                <View style={{
                  position: "absolute",
                  width: 13, height: 17,
                  borderRadius: 3,
                  backgroundColor: "#374151",
                  transform: [{ rotate: "-12deg" }, { translateX: -4 }, { translateY: 3 }],
                }} />
                {/* Front card — blue/teal */}
                <View style={{
                  position: "absolute",
                  width: 13, height: 17,
                  borderRadius: 3,
                  backgroundColor: icoColor,
                  transform: [{ translateX: 3 }, { translateY: -2 }],
                }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 4 }} numberOfLines={1}>
                  {item.title}
                </Text>
                {isQuiz ? (
                  <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }} numberOfLines={1} ellipsizeMode="tail">
                    {`${questionCount} ${t('actions.questions') || "Questions"}  •  ${cardCount} ${t('create_pick.flashcard_title') || "Cards"}  •  ${dueCount} ${t('library.due') || "Due"}`}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
                )}
              </View>
            </Pressable>
          );
        };

        const renderGroups = (groups: { label: string; items: any[] }[], type: "quiz" | "deck") => (
          <>
            {groups.map(group => (
              <View key={group.label}>
                <Text style={{ fontSize: 13, color: muted, marginBottom: 6, marginTop: 8 }}>
                  {group.label}
                </Text>
                {group.items.map(item => renderRow(item, type))}
              </View>
            ))}
          </>
        );

        return (
          <View style={{ flex: 1, backgroundColor: bg }}>

            {/* Removed My Library text and separator to push search upward */}


            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              marginHorizontal: 20, marginTop: 18, marginBottom: 8,
              borderRadius: 12, borderWidth: 1, borderColor: border,
              paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <Ionicons name="search-outline" size={18} color={muted} />
              <TextInput
                placeholder={t('library.search_placeholder') || "Search Library..."}
                placeholderTextColor={muted}
                value={librarySearch}
                onChangeText={setLibrarySearch}
                style={{ flex: 1, fontSize: 15, color: txt, padding: 0 }}
              />
              {(librarySearch || "").length > 0 && (
                <Pressable onPress={() => setLibrarySearch("")}>
                  <Ionicons name="close-circle" size={18} color={muted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
              refreshControl={
                <RefreshControl
                  refreshing={pullRefreshing}
                  onRefresh={handlePullRefresh}
                  tintColor={settingsDarkMode ? "#818cf8" : "#4f46e5"}
                  {...({ colors: ["#4f46e5", "#818cf8"], progressBackgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff" } as any)}
                />
              }
            >
              {!hasItems ? (
                <View style={{ alignItems: "center", paddingTop: 64, gap: 14 }}>
                  <Ionicons name={isCoursesTab ? "flash-outline" : "copy-outline"} size={40} color={muted} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: txt }}>
                    {librarySearch ? (t('library.no_results') || "No results found") : isCoursesTab ? (t('library.no_quizzes') || "No quizzes yet") : (t('library.no_flashcards') || "No flashcards yet")}
                  </Text>
                  <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                    {isCoursesTab ? (t('library.create_first_quiz') || "Create a quiz from any PDF or text") : (t('library.create_first_quiz') || "Create a flashcard deck to get started")}
                  </Text>
                  <Pressable
                    onPress={() => setShowAddMenu(true)}
                    style={({ pressed }) => ({
                      marginTop: 8, backgroundColor: "#4A6FFF",
                      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{t('library.create_new') || "+ Create new"}</Text>
                  </Pressable>
                </View>
              ) : isCoursesTab
                  ? renderGroups(quizGroups, "quiz")
                  : renderGroups(deckGroups, "deck")
              }
            </ScrollView>
          </View>
        );
}
