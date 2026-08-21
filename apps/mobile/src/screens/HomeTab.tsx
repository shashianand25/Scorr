import { HomeQuickActions } from "../components/home/HomeQuickActions";
import { getUserInitial } from "../utils/user";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { Alert } from "react-native";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions, RefreshControl } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * HomeTab — Home tab — quiz list and jump back in.
 * Extracted from MainContentScreen/home case (~469 lines).
 * Receives all state and handlers via p: any.
 */
export function HomeTab({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
    settingsDarkMode = true, quizzes = [], flashcardDecks = [],
    sampleDismissed = false, setSampleDismissed = () => {}, sampleQuiz = null,
    firebaseUser = null, homeSearch = "", setHomeSearch = () => {},
    jumpPage = 0, setJumpPage = () => {}, startStudy = () => {},
    appConfig = null, setActiveTab = () => {}, setShowAddMenu = () => {},
    setShowFeedbackPage = () => {}, openAuthScreen = () => {},
    pullRefreshing = false, handlePullRefresh = async () => {},
    setViewingInsightsQuiz = () => {}, setViewingInsightsQuizFromTab = () => {},
    deleteQuiz = () => {}, renameQuiz = () => {},
  } = p || {};

  // --- verbatim from case "home" in MainContentScreen ---
        // ── Home Screen (Hybrid Design) ──────────────────────────────
        return (() => {
          const bg         = "#0B0F1E";
          const cardBg     = "#141930";
          const searchBg   = "#1A1F38";
          const accentBlue = "#4A6FFF";
          const accentGrn  = "#4ADE80";
          const accentOrng = "#F97316";
          const accentPurp = "#B5A8FF";
          const pillBg     = "#2B2560";
          const muted      = "#8B8FA8";
          const txt        = "#ffffff";
          const border     = "rgba(255,255,255,0.07)";
          const iconBg     = "#1C2448";

          // ── Jump Back In data ─────────────────────────────────────
          // Filter tombstoned IDs at the source so deleted quizzes never appear in
          // Continue Learning, even if stale AsyncStorage data briefly re-hydrates them.
          const tombstoneSet = p?.pendingDeleteIdsRef?.current || new Set();
          const liveQuizzes = (quizzes || []).filter((q: any) =>
            !tombstoneSet.has(q.id) &&
            !tombstoneSet.has(q.neonId)
          );
          const inProgressQuizzes = liveQuizzes.filter((q: any) => {
            const uniqueCount = (q.uniqueCorrectIds || []).length;
            const qCount = q.questions || 1;
            return uniqueCount < qCount;
          });
          const inProgressDecks = flashcardDecks.filter((d: any) => (d.cards || []).length > 0);

          type JumpItem = { id: string; title: string; type: "quiz"|"flashcard"; progress: number; label: string; raw: any; ts?: number; isNew?: boolean };
          const allJumpCandidates: JumpItem[] = [
            ...inProgressQuizzes.map((q: any, i: number): JumpItem => {
              const done = (q.uniqueCorrectIds || []).length;
              const total = q.questions || 1;
              const isNew = (q.attempts || []).length === 0;
              const ts = isNew ? -i : (q.attempts[0]?.timestamp || q.attempts[0]?.date || 0);
              return { id: q.id, title: q.title, type: "quiz", progress: done / total,
                label: isNew ? (t('home.not_started') || "Not started") : (t('home.pct_complete', { pct: Math.round((done / total) * 100) }) || `${Math.round((done / total) * 100)}% complete`), raw: q, ts, isNew };
            }),
            ...inProgressDecks.map((d: any, i: number): JumpItem => {
              const cards = d.cards || [];
              const studied = cards.filter((c: any) => !!c.sm2_nextReviewDate).length;
              const isNew = studied === 0;
              const ts = isNew ? -i : (d.attempts?.[d.attempts.length - 1]?.date || 0);
              return { id: d.id, title: d.title, type: "flashcard", progress: cards.length > 0 ? studied / cards.length : 0,
                label: isNew ? (t('home.not_started') || "Not started") : (t('home.cards_sorted', { studied, total: cards.length }) || `${studied}/${cards.length} cards sorted`), raw: d, ts, isNew };
            }),
          ];
          const jumpItems: JumpItem[] = allJumpCandidates.filter((q: any) => {
            if (q.type === "quiz") {
              const qc = typeof q.raw.questions === "number" ? q.raw.questions : (q.raw.questionsList?.length || 0);
              const cc = q.raw.flashcards?.length || 0;
              return qc > 0 || cc > 0;
            } else if (q.type === "flashcard") {
              return q.raw.cards && q.raw.cards.length > 0;
            }
            return true;
          }).sort((a, b) => {
            if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
            return (b.ts || 0) - (a.ts || 0);
          }).slice(0, 3);

          type RecentItem = { id: string; title: string; type: "quiz"|"flashcard"; sub: string; raw: any; ts: number; };
          const allRecents: RecentItem[] = [
            ...liveQuizzes.map((q: any): RecentItem => {
              const linkedDeck = flashcardDecks.find((d: any) => d.id === `temp-${q.id}`);
              const allFlashcards = q.flashcards || [];
              const cardCount = allFlashcards.length;
              const fcCardsWithState = cardCount > 0 
                ? allFlashcards.map((c: any, idx: number) => {
                    const cardId = c.id || `fc-${idx}`;
                    const saved = linkedDeck?.cards?.find((sc: any) => sc.id === cardId);
                    return saved ?? c;
                  })
                : [];
              const due = fcCardsWithState.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
              return {
                id: q.id, title: q.title, type: "quiz",
                sub: `${q.questions || 0} ${t('actions.questions') || "questions"}  ·  ${cardCount} ${t('create_pick.flashcard_title') || "cards"}  ·  ${due} ${t('library.due') || "due"}`, raw: q,
                ts: (q.attempts || []).length > 0 ? (q.attempts[0].timestamp || q.attempts[0].date || 0) : 0,
              };
            }),
            ...flashcardDecks.map((d: any): RecentItem => ({
              id: d.id, title: d.title, type: "flashcard",
              sub: `Flashcard set  ·  ${(d.cards || []).length} terms  ·  by you`, raw: d,
              ts: (d.attempts || []).length > 0 ? (d.attempts[d.attempts.length - 1].date || 0) : 0,
            })),
          ].sort((a, b) => b.ts - a.ts).slice(0, 6);

          const hasContent = jumpItems.length > 0 || allRecents.length > 0;
          const userInitial = firebaseUser ? getUserInitial(firebaseUser) : "";

          const goQuiz = (q: any) => { setViewingInsightsQuiz(q); setViewingInsightsQuizFromTab("home"); setActiveTab("insights"); };

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={
                  <RefreshControl
                    refreshing={pullRefreshing}
                    onRefresh={handlePullRefresh}
                    tintColor={settingsDarkMode ? "#818cf8" : "#4f46e5"}
                    {...({ colors: ["#4f46e5", "#818cf8"], progressBackgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff" } as any)}
                  />
                }
              >
                {/* ── Top: Search + Avatar ── */}
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
                }}>
                  {/* Search pill */}
                  <View style={{
                    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
                    backgroundColor: searchBg, borderRadius: 28,
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderWidth: 1, borderColor: border,
                  }}>
                    <Ionicons name="search-outline" size={17} color={muted} />
                    <TextInput
                      placeholder={t('home.search_placeholder') || "Search"}
                      placeholderTextColor={muted}
                      value={homeSearch}
                      onChangeText={setHomeSearch}
                      style={{ flex: 1, fontSize: 15, color: txt, padding: 0 }}
                    />
                    {(homeSearch || "").length > 0 && (
                      <Pressable onPress={() => setHomeSearch("")}>
                        <Ionicons name="close-circle" size={17} color={muted} />
                      </Pressable>
                    )}
                  </View>

                  {/* Avatar circle */}
                  <AnimatedPressable
                    onPress={() => setActiveTab("menu")}
                    style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: "#1C2244",
                      alignItems: "center", justifyContent: "center", overflow: "hidden",
                      borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
                    }}
                  >
                    {firebaseUser?.photoURL ? (
                      <Image source={{ uri: firebaseUser.photoURL }} style={{ width: 46, height: 46, borderRadius: 23 }} />
                    ) : firebaseUser ? (
                      <Text style={{ fontSize: 17, fontWeight: "700", color: accentPurp }}>{userInitial}</Text>
                    ) : (
                      <Ionicons name="person" size={20} color={accentPurp} />
                    )}
                  </AnimatedPressable>
                </View>

                {/* ── New user or Signed Out: sample try-it-out card ── */}
                {/* Show whenever: not logged in, OR library is completely empty (regardless of sampleDismissed) */}
                {((!firebaseUser) || (!hasContent)) && !homeSearch && sampleQuiz && (
                  <View style={{ marginTop: 24, marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt }}>
                        {sampleDismissed ? (t('home.library_empty') || "Your library is empty") : (t('home.try_first_quiz') || "Try your first quiz 👋")}
                      </Text>
                      <Text style={{ fontSize: 13, color: muted }}>{sampleDismissed ? (t('home.sample') || "Sample") : (t('home.new_user') || "New user")}</Text>
                    </View>

                    <View
                      style={{
                        marginHorizontal: 20,
                        backgroundColor: cardBg,
                        borderRadius: 20, padding: 20,
                        borderWidth: 1, borderColor: border,
                      }}
                    >
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: txt }} numberOfLines={1}>{sampleQuiz.title}</Text>
                        <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                          {sampleQuiz.questions} {t('actions.questions') || "questions"}  ·  {(sampleQuiz.flashcards || []).length} {t('create_pick.flashcard_title') || "flashcards"}
                        </Text>
                      </View>
                      <AnimatedPressable
                        onPress={() => goQuiz(sampleQuiz)}
                        style={{
                          backgroundColor: "#6366f1",
                          paddingVertical: 14, borderRadius: 16,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                          {t('home.study_set') || "Study Set"}
                        </Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                )}

                {/* ── Jump Back In ── */}
                {!!firebaseUser && jumpItems.length > 0 && !homeSearch && (
                  <View style={{ marginTop: 20, marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt, marginBottom: 2 }}>
                        {t('home.continue_learning') || "Continue learning"}
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={SCREEN_WIDTH - 40}
                      snapToAlignment="start"
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                      onScroll={(e) => {
                        const page = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                        setJumpPage(Math.max(0, Math.min(page, jumpItems.length - 1)));
                      }}
                      scrollEventThrottle={16}
                    >
                      {jumpItems.map((item) => {
                        const pct = Math.min(Math.round(item.progress * 100), 100);
                        return (
                          <View
                            key={item.id}
                            style={{
                              width: SCREEN_WIDTH - 52,
                              backgroundColor: cardBg,
                              borderRadius: 16,
                              padding: 16,
                              borderWidth: 1,
                              borderColor: border,
                            }}
                          >
                            {/* Title row */}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", flex: 1, lineHeight: 20 }} numberOfLines={1} ellipsizeMode="tail">
                                {item.title}
                              </Text>
                              <Ionicons name="ellipsis-vertical" size={16} color={muted} style={{ marginLeft: 8 }} />
                            </View>

                            {/* Progress bar */}
                            <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, marginBottom: 8, overflow: "hidden", flexDirection: "row" }}>
                              {pct > 0 && (
                                <View style={{ width: `${Math.max(pct - 12, 0)}%` as any, backgroundColor: "#10B981" }} />
                              )}
                              {pct > 0 && pct < 100 && (
                                <View style={{ width: "12%", backgroundColor: "#F59E0B", borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
                              )}
                            </View>

                            {/* Label */}
                            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500", marginBottom: 14 }}>{item.label}</Text>

                            {/* Continue button — blue pill */}
                            <Pressable
                              onPress={() => {
                                if (item.type === "quiz") goQuiz(item.raw);
                                else startStudy(item.raw);
                              }}
                              style={({ pressed }) => ({
                                backgroundColor: "#4F46E5",
                                borderRadius: 14,
                                paddingVertical: 10,
                                alignItems: "center",
                                opacity: pressed ? 0.85 : 1,
                              })}
                            >
                              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{t('home.continue_btn') || "Continue"}</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* Dot pagination */}
                    {jumpItems.length > 1 && (
                      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
                        {jumpItems.map((_, idx) => (
                          <View
                            key={idx}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: idx === jumpPage ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}


                {/* ── Battle Arena, Flashcard Banner, More Options ── */}
                {!homeSearch && <HomeQuickActions p={p} />}
              </ScrollView>
            </View>
          );
        })();
}
