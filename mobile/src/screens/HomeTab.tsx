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
export function HomeTab({ p }: { p: any }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
    settingsDarkMode, quizzes, flashcardDecks,
    sampleDismissed, setSampleDismissed, sampleQuiz,
    firebaseUser, homeSearch, setHomeSearch,
    jumpPage, setJumpPage, startStudy,
    appConfig, setActiveTab, setShowAddMenu,
    setShowFeedbackPage, openAuthScreen,
    pullRefreshing, handlePullRefresh,
    setViewingInsightsQuiz, setViewingInsightsQuizFromTab,
    deleteQuiz, renameQuiz,
  } = p;

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
          const liveQuizzes = quizzes.filter((q: any) =>
            !p.pendingDeleteIdsRef.current.has(q.id) &&
            !p.pendingDeleteIdsRef.current.has(q.neonId)
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
                    colors={["#4f46e5", "#818cf8"]}
                    progressBackgroundColor={settingsDarkMode ? "#1e293b" : "#ffffff"}
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
                    {homeSearch.length > 0 && (
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

                {/* ── Battle Arena Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: jumpItems.length > 0 || !hasContent ? 20 : 16, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 10 }}>{t('home.multiplayer') || "Multiplayer"}</Text>
                    
                    <Pressable
                      onPress={() => {
                        if (appConfig?.featureFlags?.disableBattles) {
                          Alert.alert(
                            t('battle.cant_join') || "Battles Temporarily Unavailable",
                            t('battle.battles_disabled') || "Battle Arena is currently disabled while we perform maintenance. Please try again shortly."
                          );
                          return;
                        }
                        setActiveTab("battle" as any);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(251, 113, 133, 0.15)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        <Ionicons name="flame" size={20} color="#FB7185" />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }} numberOfLines={1}>
                          {t('battle.title') || "Battle Arena"}
                        </Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1} ellipsizeMode="tail">
                          {t('battle.subtitle') || "Challenge friends in real-time matches"}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={muted} />
                    </Pressable>
                  </View>
                )}

                {/* ── Create Flashcards Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 10 }}>{t('home.study_need_title') || "Study exactly what you need"}</Text>
                    
                    <View style={{
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                      }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Ionicons name="albums" size={24} color="#4F46E5" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('home.create_flashcards_title') || "Create your own flashcards"}</Text>
                      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>{t('home.study_need_sub') || "Study exactly what's on your test"}</Text>
                      
                      {/* Image placeholder */}
                      <View style={{ height: 88, backgroundColor: "#E0F2FE", borderRadius: 12, marginBottom: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <Ionicons name="document-text" size={48} color="#4F46E5" style={{ opacity: 0.8 }} />
                      </View>
                      
                      <Pressable
                        onPress={() => setShowAddMenu(true)}
                        style={({ pressed }) => ({
                          backgroundColor: "#4F46E5",
                          borderRadius: 14,
                          paddingVertical: 11,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{t('home.create_flashcards_btn') || "Create flashcards"}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── More Options ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 10 }}>{t('home.more') || "More"}</Text>
                    
                    <Pressable
                      onPress={async () => {
                        try {
                          const downloadLink = appConfig?.appLinks?.downloadUrl || appConfig?.appLinks?.playStoreUrl || "https://scorrapp.com/download";
                          await Share.share({
                            message: `Study smarter with Scorr! Create quizzes and flashcards with AI:\n${downloadLink}`,
                            url: downloadLink,
                          });
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('home.invite_friends') || "Invite your friends"}</Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>{t('home.invite_sub') || "Learn together and grow faster"}</Text>
                      </View>
                      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 26 }}>💌</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setShowFeedbackPage(true)}
                      style={({ pressed }) => ({
                        marginTop: 10,
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('profile.feedback') || "Feedback"}</Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>{t('home.feedback_sub') || "Help us improve"}</Text>
                      </View>
                      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 26 }}>💡</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })();
}
