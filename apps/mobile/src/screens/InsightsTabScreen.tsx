import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

// ─────────────────────────────────────────────────────────────────────────────
// InsightsTabScreen
// Extracted from renderInsightsView() in mobile/src/app/index.tsx (lines 2835-3021)
// Original function: 187 lines
// ─────────────────────────────────────────────────────────────────────────────
export function InsightsTabScreen({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();

  const {
    viewingInsightsQuiz,
    setActiveTab,
    viewingInsightsQuizFromTab,
    setShowQuizActions,
    settingsDarkMode,
    handleOpenQuizOptions,
    savedSessions,
    setActiveSession,
    setViewingInsightsQuizFromTab,
    activeTab,
    handleShareQuiz,
  } = p;

  // Optional fields with safe defaults
  const setStudyModeModalVisible = p.setStudyModeModalVisible || ((_v: boolean) => {});
  const expandedAttemptsMap: Record<string, boolean> = p.expandedAttemptsMap ?? {};
  const setExpandedAttemptsMap = p.setExpandedAttemptsMap ||
    ((_v: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {});
  const setSelectedAttemptForModal = (p as any).setSelectedAttemptForModal || ((_v: any) => {});
  const deleteFlashcardDeck: (uid: string, neonId: string) => Promise<void> =
    (p.deleteFlashcardDeck as any) || (async () => {});

  if (!viewingInsightsQuiz) return null;
  const quiz = viewingInsightsQuiz;
  const attempts = quiz.attempts || [];
  const wrongCount = (quiz.wrongQuestions || []).length;

  // Derived dark mode colors based on the requested design + supporting light mode
  const isDark = settingsDarkMode;
  const bg = isDark ? "#0B0F1E" : "#f4f4f8";
  const cardBg = isDark ? "#141930" : "#ffffff";
  const iconBg = isDark ? "#161B2E" : "#e5e7eb";
  const textMain = isDark ? "#F3F4F6" : "#111827";
  const textSub = isDark ? "#9CA3AF" : "#6B7280";
  const border = isDark ? "rgba(181, 168, 255, 0.12)" : "rgba(0,0,0,0.06)";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 20, paddingTop: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Top Bar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <Pressable 
          onPress={() => setActiveTab(viewingInsightsQuizFromTab as any || "home")}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Feather name="arrow-left" size={18} color={textSub} />
          <Text style={{ fontSize: 14, color: textSub, fontWeight: "500" }}>
            {viewingInsightsQuizFromTab === "library" ? (t('insight.back_to_library') || "Back to library") : (t('insight.back_to_home') || "Back to home")}
          </Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => setShowQuizActions(quiz)} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="ellipsis-vertical" size={18} color={textSub} />
          </Pressable>
        </View>
      </View>

      {/* Title Card */}
      <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: border, width: "100%" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <View style={{ backgroundColor: isDark ? "#123324" : "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ color: isDark ? "#4ADE80" : "#166534", fontSize: 11, fontWeight: "600" }}>{quiz.category || "General"}</Text>
          </View>
          <Text style={{ fontSize: 12, color: textSub }}>{(quiz.questionsList || []).length} {t('actions.questions') || "questions"}</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: "600", color: textMain, lineHeight: 24 }} numberOfLines={3} ellipsizeMode="tail">
          {(quiz.title || "").replace(/[\r\n]+/g, " ").replace(/[-_]/g, (match: string) => `${match}\u200B`)}
        </Text>
      </View>

      {/* Practice Modes */}
      <Text style={{ fontSize: 16, fontWeight: "600", color: textMain, marginTop: 12, marginBottom: 12, marginLeft: 4 }}>{t('insight.practice') || "Practice"}</Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
        <Pressable onPress={() => handleOpenQuizOptions(quiz)} style={({pressed}) => [{ flex: 1, backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center" }, pressed && {opacity: 0.8}]}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "#20264A" : "#e0e7ff", alignItems: "center", justifyContent: "center", marginRight: 6 }}>
            <Ionicons name="help-circle" size={18} color={isDark ? "#7C9DFF" : "#4338ca"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: textMain, marginBottom: 4 }} adjustsFontSizeToFit numberOfLines={1}>{t('create_pick.quiz_title') || "Quiz"}</Text>
            <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.8)" : textSub }} numberOfLines={1}>{(quiz.questionsList || []).length} Qs</Text>
          </View>
          <Feather name="chevron-right" size={16} color={isDark ? "#FFFFFF" : "#9ca3af"} style={{ opacity: isDark ? 0.8 : 1 }} />
        </Pressable>

        <Pressable onPress={() => setStudyModeModalVisible(true)} style={({pressed}) => [{ flex: 1, backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 8, borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center" }, pressed && {opacity: 0.8}]}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "#2B2560" : "#ede9fe", alignItems: "center", justifyContent: "center", marginRight: 6 }}>
            <Ionicons name="albums" size={16} color={isDark ? "#B5A8FF" : "#7c3aed"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: textMain, marginBottom: 4 }} adjustsFontSizeToFit numberOfLines={1}>{t('create_pick.flashcard_title') || "Flashcards"}</Text>
            <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.8)" : textSub }} numberOfLines={1}>{(quiz.flashcards || []).length} Cards</Text>
          </View>
          <Feather name="chevron-right" size={16} color={isDark ? "#FFFFFF" : "#9ca3af"} style={{ opacity: isDark ? 0.8 : 1 }} />
        </Pressable>
      </View>
      <Pressable 
        onPress={() => handleShareQuiz(quiz)} 
        style={({pressed}) => [{ 
          backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 12, 
          borderWidth: 1, borderColor: border, flexDirection: "row", alignItems: "center", marginBottom: 32
        }, pressed && {opacity: 0.8}]}
      >
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#e0e7ff", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
          <Ionicons name="share-social" size={18} color={isDark ? "#818cf8" : "#4f46e5"} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: textMain, marginBottom: 4 }} numberOfLines={1}>{t('share.share_quiz') || "Share Quiz"}</Text>
          <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.8)" : textSub }} numberOfLines={1}>{t('share.share_desc') || "Send a link to study together"}</Text>
        </View>
        <Feather name="chevron-right" size={16} color={isDark ? "#FFFFFF" : "#9ca3af"} style={{ opacity: isDark ? 0.8 : 1 }} />
      </Pressable>

      {/* Continue Last Attempt (if one exists) */}
      {savedSessions[quiz.id] && (
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: textSub, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>{t('insight.in_progress') || "In Progress"}</Text>
          <Pressable 
            onPress={() => {
              setActiveSession(savedSessions[quiz.id]);
              setViewingInsightsQuizFromTab(activeTab);
              setActiveTab("quiz-active" as any);
            }}
            style={({pressed}) => [{ 
              backgroundColor: cardBg, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 16, 
              borderWidth: 1, borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.5)", 
              flexDirection: "row", alignItems: "center"
            }, pressed && {opacity: 0.8}]}
          >
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#f59e0b", marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: textMain, marginBottom: 4 }}>{t('insight.resume_attempt') || "Resume Attempt"} #{attempts.length + 1}</Text>
              <Text style={{ fontSize: 13, color: textSub }}>
                {Object.keys(savedSessions[quiz.id].answers || {}).length} / {(savedSessions[quiz.id].questions || []).length} completed
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#f59e0b" }}>{t('common.continue') || "Continue"}</Text>
              <Feather name="arrow-right" size={16} color="#f59e0b" />
            </View>
          </Pressable>
        </View>
      )}

      {/* Past Attempts */}
      <Text style={{ fontSize: 12, fontWeight: "600", color: textSub, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12, marginLeft: 4 }}>
        {savedSessions[quiz.id] ? (t('insight.past_attempts') || "Past Attempts") : (t('insight.attempt_history') || "Attempt History")}
      </Text>
      {attempts.length === 0 ? (
        <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: isDark ? "#2A3050" : "#d1d5db", borderRadius: 16, padding: 24, alignItems: "center" }}>
          <Ionicons name="bar-chart" size={24} color={isDark ? "#4B5165" : "#9ca3af"} style={{ marginBottom: 12 }} />
          <Text style={{ fontSize: 14, fontWeight: "500", color: textSub, marginBottom: 4 }}>No attempts yet</Text>
          <Text style={{ fontSize: 12, color: isDark ? "#6B7280" : "#9ca3af", textAlign: "center" }}>Take a test to start tracking scores.</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {attempts.slice(0, expandedAttemptsMap[quiz.id] ? attempts.length : 3).map((attempt: any, index: number) => {
            const attemptNum = attempts.length - index;
            const isRetry = attempt.mode === "retry";
            return (
              <Pressable
                key={attempt.id || index}
                onPress={() => setSelectedAttemptForModal({ quizId: quiz.id, attempt, attemptNum })}
                style={({pressed}) => [{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: cardBg, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: border }, pressed && {opacity: 0.8}]}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: textMain }}>{t('insight.attempt') || "Attempt"} #{attemptNum}</Text>
                    {isRetry && (
                      <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: textSub }}>Retry of #{attempt.retryOfAttemptNum}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: isDark ? "#ffffff" : textSub }}>{attempt.correct} correct · {attempt.wrong} wrong · {attempt.skipped} skipped</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "500", color: textMain }}>{attempt.score}%</Text>
                  <Feather name="chevron-right" size={18} color={textSub} />
                </View>
              </Pressable>
            );
          })}
          
          {attempts.length > 3 && !expandedAttemptsMap[quiz.id] && (
            <Pressable
              onPress={() => setExpandedAttemptsMap((prev: any) => ({ ...prev, [quiz.id]: true }))}
              style={({pressed}) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, marginTop: 4, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 12 }, pressed && {opacity: 0.7}]}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: textMain }}>View all attempts</Text>
              <Feather name="arrow-down" size={16} color={textMain} style={{ marginLeft: 6 }} />
            </Pressable>
          )}
          
          {attempts.length > 3 && expandedAttemptsMap[quiz.id] && (
            <Pressable
              onPress={() => setExpandedAttemptsMap((prev: any) => ({ ...prev, [quiz.id]: false }))}
              style={({pressed}) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, marginTop: 4 }, pressed && {opacity: 0.7}]}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: textSub }}>Show less</Text>
              <Feather name="chevron-up" size={16} color={textSub} style={{ marginLeft: 6 }} />
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeckInsightsTab
// Extracted from renderDeckInsightsTab() in mobile/src/app/index.tsx (lines 3023-3184)
// Original function: 162 lines
// ─────────────────────────────────────────────────────────────────────────────
export function DeckInsightsTab({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();

  const {
    viewingInsightsDeck,
    setActiveTab,
    settingsDarkMode,
    flashcardDecks,
    setFlashcardDecks,
    firebaseUser,
  } = p;

  // Optional fields with safe defaults
  const startStudy = p.startStudy || ((_deck: any) => {});
  const deleteFlashcardDeck: (uid: string, neonId: string) => Promise<void> =
    (p.deleteFlashcardDeck as any) || (async () => {});

  const deck = viewingInsightsDeck;
  if (!deck) return null;
  const attempts = deck.attempts || [];
  const latestAttempt = attempts[attempts.length - 1];
  const cardCount = (deck.cards || []).length;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Back Link */}
      <Pressable 
        onPress={() => setActiveTab("home")}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 15 }}
      >
        <Feather name="arrow-left" size={16} color="#00e5a0" />
        <Text style={{ fontSize: 13, fontWeight: "bold", color: "#00e5a0" }}>Back to Flashcards</Text>
      </Pressable>

      {/* Page Header */}
      <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "rgba(168, 85, 247, 0.12)" }}>
            <Text style={{ fontSize: 10, fontWeight: "bold", color: "#a855f7" }}>{t('create_pick.flashcard_title') || "FLASHCARDS"}</Text>
          </View>
        </View>
        <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText, { fontSize: 20, marginTop: 4 }]} numberOfLines={2}>
          {deck.title}
        </Text>
      </View>

      {/* Core Stats Row */}
      <View style={[styles.statsGrid, { marginBottom: 15 }]}>
        <View 
          style={[
            styles.statCard, 
            settingsDarkMode 
              ? { backgroundColor: "rgba(245, 158, 11, 0.03)", borderColor: "rgba(245, 158, 11, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
              : { backgroundColor: "rgba(245, 158, 11, 0.04)", borderColor: "rgba(245, 158, 11, 0.22)", shadowColor: "#f59e0b", shadowOpacity: 0.14, shadowRadius: 12 }
          ]}
        >
          <View style={[styles.statIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.12)" }]}>
            <Ionicons name="albums-outline" size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{cardCount}</Text>
          <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>{t('insight.total_cards') || "Total Cards"}</Text>
        </View>

        <View 
          style={[
            styles.statCard, 
            settingsDarkMode 
              ? { backgroundColor: "rgba(34, 197, 94, 0.03)", borderColor: "rgba(34, 197, 94, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
              : { backgroundColor: "rgba(34, 197, 94, 0.04)", borderColor: "rgba(34, 197, 94, 0.22)", shadowColor: "#22c55e", shadowOpacity: 0.14, shadowRadius: 12 }
          ]}
        >
          <View style={[styles.statIconContainer, { backgroundColor: "rgba(34, 197, 94, 0.12)" }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
          </View>
          <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{latestAttempt ? latestAttempt.known : 0}</Text>
          <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>{t('home.mastered') || "Mastered"}</Text>
        </View>

        <View 
          style={[
            styles.statCard, 
            settingsDarkMode 
              ? { backgroundColor: "rgba(168, 85, 247, 0.03)", borderColor: "rgba(168, 85, 247, 0.15)", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 16 } 
              : { backgroundColor: "rgba(168, 85, 247, 0.04)", borderColor: "rgba(168, 85, 247, 0.22)", shadowColor: "#a855f7", shadowOpacity: 0.14, shadowRadius: 12 }
          ]}
        >
          <View style={[styles.statIconContainer, { backgroundColor: "rgba(168, 85, 247, 0.12)" }]}>
            <Ionicons name="time-outline" size={20} color="#a855f7" />
          </View>
          <Text style={[styles.statValue, !settingsDarkMode && styles.lightText]}>{attempts.length}</Text>
          <Text style={[styles.statLabel, !settingsDarkMode && styles.lightTextSub]}>{t('insight.sessions') || "Sessions"}</Text>
        </View>
      </View>

      {/* ── Primary actions ── */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        {/* Start Test — always shown */}
        <Pressable
          onPress={() => { startStudy(deck); }}
          style={({ pressed }) => [{
            flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
            height: 52, borderRadius: 16,
            backgroundColor: "#6366f1",
            shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
          }, pressed && styles.pressedScale]}
        >
          <Ionicons name="play" size={18} color="#ffffff" />
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>{t('insight.study_now') || "Study Now"}</Text>
        </Pressable>
      </View>

      {/* Attempt Log History */}
      <View style={[styles.panelCard, !settingsDarkMode && styles.lightCard]}>
        <Text style={[styles.optionsSectionTitle, !settingsDarkMode && styles.lightTextSub, { marginBottom: 10, fontSize: 12 }]}>{t('insight.session_history') || "Session History"}</Text>
        {attempts.length > 0 ? (
          <View style={{ gap: 8 }}>
            {attempts.slice().reverse().map((attempt: any, index: number) => (
              <View
                key={attempt.id || String(index)}
                style={[
                  { padding: 12, borderRadius: 12, backgroundColor: "rgba(255, 255, 255, 0.02)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.05)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                  !settingsDarkMode && styles.lightCard
                ]}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[{ fontSize: 12, fontWeight: "bold", color: "#ffffff" }, !settingsDarkMode && styles.lightText]}>
                    {t('insight.session_num') || "Session"} #{attempts.length - index}
                  </Text>
                  <Text style={[{ fontSize: 10, color: "#888888", marginTop: 2 }, !settingsDarkMode && styles.lightTextSub]}>
                    {new Date(attempt.date).toLocaleDateString()}
                  </Text>
                </View>
                
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 13, color: "#22c55e", fontWeight: "700" }}>{attempt.known} ✓</Text>
                  <Text style={{ fontSize: 13, color: "#ef4444", fontWeight: "700" }}>{attempt.unknown} ✗</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ fontSize: 11, color: "#666", textAlign: "center", paddingVertical: 10 }}>{t('insight.no_sessions') || "No sessions logged yet."}</Text>
        )}
      </View>

      {/* Reset controls */}
      <View style={[
        styles.panelCard, 
        { 
          marginBottom: 30,
        },
        !settingsDarkMode && styles.lightCard
      ]}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: settingsDarkMode ? "#6e727a" : "#999999", marginBottom: 12 }}>{t('insight.manage') || "Manage"}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => {
              const deckId = deck.id;
              const neonId = deck.neonId;
              setFlashcardDecks(flashcardDecks.filter((d: any) => d.id !== deckId));
              if (firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                deleteFlashcardDeck(firebaseUser.uid, neonId).catch((err: any) => console.warn("[NeonSync] deck delete failed:", err));
              }
              setActiveTab("home");
            }}
            style={({ pressed }) => [
              { flex: 1, padding: 10, borderRadius: 10, backgroundColor: "rgba(239, 68, 68, 0.15)", alignItems: "center", justifyContent: "center" },
              pressed && styles.opacityPress
            ]}
          >
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#ef4444" }}>{t('flashcards.delete_deck') || "Delete Deck"}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
