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
import { AppModals }
import { HomeModals } from "../components/home/HomeModals" from "../components/modals/AppModals";
import { MainContentScreen } from "../screens/MainContentScreen";
import { AIGeneratingScreen, FullscreenBattleCountdown } from "../components/AIGeneratingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import type { HomeScreenProps } from "../types/HomeScreenProps";

/**
 * HomeLayout — the root JSX shell of HomeScreen.
 * Contains: StatusBar, SafeAreaView, tab bar, overlays, modals.
 * Extracted from index.tsx to reduce god-file size.
 * Receives ALL HomeScreen state and handlers via p: any.
 */
export function HomeLayout({ p }: { p: any }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
    settingsDarkMode, activeTab, setActiveTab,
    showAuthScreen, aiGenPhase, battleCountdown,
    battlePopup, screenFadeAnim, insets,
    bottomToast, bottomToastOpacity, bottomToastTranslateY,
    confettiParticles, renderAuthScreen, syncToastMessage,
    battleShuffleQ, setBattleShuffleQ,
    battleShuffleA, setBattleShuffleA,
    battleError, handleStartBattle, battleCreating,
    showBattleHistory, setShowBattleHistory, battleHistory,
    quizzes, sampleQuiz, setViewingReportCardData,
    studyModeModalVisible, setStudyModeModalVisible,
    viewingInsightsQuiz, studyCardCount, selectedStudyMode, setSelectedStudyMode,
    flashcardDecks, setFlashcardDecks,
    setStudyingDeck, setStudyQueue, setIsPreviewMode,
    flipAnim, swipeX, setFcIndex, setFcFlipped,
    insightsFlipAnim, insightsSwipeX, insightsSwipeY,
    setNoDueAtStart, startStudy,
    customToast, activeSession, creationMode, viewingInsightsQuizFromTab,
    setShowAddMenu, fileInputRef, handleImportQst,
    showWrongReview, viewingReportCardData, setShowWrongReview, setSnapshotReviewData,
    reportCardQs, snapshotReviewData,
    handleCancelAiGeneration, aiGenCharCount, appConfig, aiGenConnectionLost,
    showBattleQuizSelector, setShowBattleQuizSelector, handleHostBattle, sampleDismissed,
    showBattleOptions, setShowBattleOptions, battleOptionsQuiz,
    battleSelectionMode, setBattleSelectionMode,
    battleRandomCount, setBattleRandomCount,
    battleRangeStart, setBattleRangeStart,
    battleRangeEnd, setBattleRangeEnd,
    battleTimePerQuestion, setBattleTimePerQuestion,
  } = p;

  const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

  if (showAuthScreen) {
    return (
      <SafeAreaView style={[styles.landingSafeArea]} edges={["top", "left", "right", "bottom"]}>
        <KeyboardWrapper
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderAuthScreen()}
          </ScrollView>
        </KeyboardWrapper>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
      {/* Offline Sync Toast */}
      {!!syncToastMessage && (
        <View style={{ position: "absolute", top: Platform.OS === "ios" ? 52 : 24, left: 20, right: 20, zIndex: 1000, backgroundColor: settingsDarkMode ? "#334155" : "#475569", padding: 12, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 10, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 }}>
          <Ionicons name="cloud-offline" size={20} color="#cbd5e1" />
          <Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: "500", flex: 1 }}>{syncToastMessage}</Text>
        </View>
      )}

      {/* Custom Toast */}
      {!!customToast && (
        <View style={{ position: "absolute", top: Platform.OS === "ios" ? 52 : 24, left: 20, right: 20, zIndex: 1000, backgroundColor: "#10142a", borderWidth: 1, borderColor: "rgba(139,143,240,0.2)", padding: 14, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 12, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "rgba(45,212,167,0.15)", justifyContent: "center", alignItems: "center" }}>
            <Ionicons name={customToast.icon} size={18} color={customToast.color} />
          </View>
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", flex: 1, lineHeight: 20 }}>{customToast.message}</Text>
        </View>
      )}

    <SafeAreaView style={[styles.rootContainer, !settingsDarkMode && styles.lightRootContainer]} edges={["top", "left", "right"]}>
      {activeSession ? (
        <ActiveSessionScreen p={p} />
      ) : (
        <>
          <View style={styles.screenContainer}>
            <Animated.View style={{ flex: 1, opacity: screenFadeAnim || 1 }}>
              <MainContentScreen p={p} />
            </Animated.View>
          </View>

          {/* Bottom Tab Bar — Quizlet-style (hidden during focused editing and study sessions to maximize screen real estate and prevent keyboard overlaps) */}
          {!( (activeTab === "add" && creationMode !== "pick") || activeTab === ("flashcards" as any) || activeTab === ("insights-flashcard" as any) ) && (() => {
            const effectiveTab = (activeTab === "insights" || activeTab === "bookmarked-questions") ? viewingInsightsQuizFromTab : activeTab === "library" ? "library" : activeTab;
            return (
            <View style={[
              styles.bottomTabBar,
              !settingsDarkMode && styles.lightTabBar,
              {
                paddingBottom: Math.max(insets.bottom, 16)
              }
            ]}>

              {/* Home */}
              <AnimatedPressable onPress={() => setActiveTab("home")} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons
                  name={effectiveTab === "home" ? "home" : "home-outline"}
                  size={23}
                  color={effectiveTab === "home" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"}
                />
                <Text style={[styles.tabLabel, { color: effectiveTab === "home" ? "#FFFFFF" : settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: effectiveTab === "home" ? "800" : "500" }]}>{t('tabs.home')}</Text>
              </AnimatedPressable>


              {/* Create */}
              <AnimatedPressable
                onPress={() => setShowAddMenu(true)}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <FontAwesome6 name="plus" size={22} color={settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"} />
                <Text style={[styles.tabLabel, { color: settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)", fontWeight: "500" }]}>{t('tabs.create')}</Text>
              </AnimatedPressable>

              {/* Library */}
              <AnimatedPressable
                onPress={() => setActiveTab("library" as any)}
                style={styles.tabItem}
                scaleTo={0.88}
              >
                <Ionicons
                  name={effectiveTab === "library" ? "folder" : "folder-outline"}
                  size={23}
                  color={effectiveTab === "library" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)")}
                />
                <Text style={[styles.tabLabel, { color: effectiveTab === "library" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"), fontWeight: effectiveTab === "library" ? "800" : "500" }]}>{t('tabs.library')}</Text>
              </AnimatedPressable>

              {/* Profile */}
              <AnimatedPressable onPress={() => setActiveTab("menu")} style={styles.tabItem} scaleTo={0.88}>
                <Ionicons
                  name={effectiveTab === "menu" ? "person" : "person-outline"}
                  size={23}
                  color={effectiveTab === "menu" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)")}
                />
                <Text style={[styles.tabLabel, { color: effectiveTab === "menu" ? (settingsDarkMode ? "#FFFFFF" : "#000000") : (settingsDarkMode ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.5)"), fontWeight: effectiveTab === "menu" ? "800" : "500" }]}>{t('tabs.profile')}</Text>
              </AnimatedPressable>

            </View>
            );
          })()}

          {Platform.OS === "web" && (
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.qst"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    handleImportQst(text, file.name);
                  };
                  reader.readAsText(file);
                }
                e.target.value = "";
              }}
            />
          )}
        </>
      )}

      {/* ── Floating Bottom Pill Toast (Capsule) ── */}
      {!!bottomToast && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom, 16) + 68,
            alignSelf: "center",
            zIndex: 9999,
            opacity: bottomToastOpacity,
            transform: [{ translateY: bottomToastTranslateY }],
            backgroundColor: settingsDarkMode ? "rgba(15, 23, 42, 0.94)" : "rgba(15, 23, 42, 0.90)",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: settingsDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.18)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          {!!bottomToast.icon && (
            <Ionicons name={bottomToast.icon} size={14} color={bottomToast.color || "#38bdf8"} />
          )}
          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "600", letterSpacing: 0.2 }}>
            {bottomToast.message}
          </Text>
        </Animated.View>
      )}

    </SafeAreaView>

      {/* ── Report Card Modal ── */}
      <Modal visible={showWrongReview || !!viewingReportCardData} animationType="slide" transparent={true} statusBarTranslucent={true} onRequestClose={() => { (setShowWrongReview || (() => {}))(false); (setViewingReportCardData || (() => {}))(null); (setSnapshotReviewData || (() => {}))([]); }}>
        <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }} numberOfLines={1}>
                {viewingReportCardData?.quiz?.title ? viewingReportCardData.quiz.title : "Review Answers"}
              </Text>
              {viewingReportCardData?.attempt?.score != null && (
                <Text style={{ fontSize: 13, color: settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                  Score: {viewingReportCardData.attempt.score} pts
                </Text>
              )}
            </View>
            <Pressable onPress={() => { (setShowWrongReview || (() => {}))(false); (setViewingReportCardData || (() => {}))(null); (setSnapshotReviewData || (() => {}))([]); }} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, paddingBottom: Math.max(insets.bottom, 16) + 40 }}>
            {(() => {
              // Live session review uses the snapshot captured at press time.
              // History report card uses reportCardQs from useMemo.
              const rawQs = viewingReportCardData ? reportCardQs : snapshotReviewData;
              const displayQs = Array.isArray(rawQs) ? rawQs : [];
              return (
                <>
                  {displayQs.length === 0 && (
                    <Text style={{ textAlign: "center", color: settingsDarkMode ? "#9ca3af" : "#6b7280", marginTop: 40 }}>
                      No answer data available for this attempt.
                    </Text>
                  )}
                  {displayQs.map((q: any, idx: number) => (
              <View key={q.id} style={{ backgroundColor: settingsDarkMode ? "#161b2e" : "#ffffff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 16, lineHeight: 24 }}>
                  {idx + 1}. {q.prompt}
                </Text>
                <View style={{ height: 1, backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", marginBottom: 16 }} />
                
                <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 12 }}>
                  Your answer:
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    {q.status === "skipped" ? (
                      <Text style={{ fontSize: 15, color: settingsDarkMode ? "#ef4444" : "#dc2626", marginBottom: 16 }}>
                        Skipped
                      </Text>
                    ) : (
                      q.selectedTexts.map((text: string, i: number) => (
                        <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: i < q.selectedTexts.length - 1 ? 8 : 0 }}>
                          {q.status === "wrong" && <Ionicons name="close" size={16} color="#ef4444" style={{ marginTop: 2, marginRight: 8 }} />}
                          {q.status === "correct" && <Ionicons name="checkmark" size={16} color="#4ade80" style={{ marginTop: 2, marginRight: 8 }} />}
                          <Text style={{ flex: 1, fontSize: 15, color: settingsDarkMode ? (q.status === "wrong" ? "#fca5a5" : "#cbd5e1") : (q.status === "wrong" ? "#b91c1c" : "#334155"), lineHeight: 22 }}>
                            {text}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                  <View style={{ marginLeft: 16 }}>
                    {q.status === "wrong" ? (
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    ) : q.status === "correct" ? (
                      <Ionicons name="checkmark-circle" size={24} color="#4ade80" />
                    ) : null}
                  </View>
                </View>
                
                <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 12 }}>
                  Correct Answer:
                </Text>
                <View style={{ backgroundColor: "#65a30d", borderRadius: 8, padding: 16, marginBottom: q.explanation ? 16 : 0 }}>
                  {q.correctTexts.map((text: string, i: number) => (
                    <Text key={i} style={{ fontSize: 15, color: "#ffffff", fontWeight: "500", lineHeight: 22, marginBottom: i < q.correctTexts.length - 1 ? 8 : 0 }}>
                      {text}
                    </Text>
                  ))}
                </View>

                {q.explanation && (
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#111827", marginBottom: 8 }}>
                      Tip to remember:
                    </Text>
                    <Text style={{ fontSize: 14, color: settingsDarkMode ? "#cbd5e1" : "#475569", lineHeight: 20 }}>
                      {q.explanation}
                    </Text>
                  </View>
                )}
              </View>
                  ))}
                </>
              );
            })()}
          </ScrollView>
        </View>
      </Modal>

      {/* ── All Modals ── outside SafeAreaView so they never affect flex layout ── */}
      <AppModals p={p} />

      {/* ── Battle Fullscreen Countdown ── */}
      {battleCountdown !== null && <FullscreenBattleCountdown count={battleCountdown} isDark={settingsDarkMode} />}

      {/* ── AI Generation Screen ── */}
      {aiGenPhase === "generating" && (
        <AIGeneratingScreen 
          onCancel={handleCancelAiGeneration} 
          isDark={settingsDarkMode} 
          documentCharCount={aiGenCharCount} 
          generationTimeoutMs={appConfig?.aiConfig?.generationTimeoutMs ?? 60000} 
          connectionLost={aiGenConnectionLost} 
        />
      )}

      {/* ── Battle Modals ── */}
      {(() => {
        const isDark = settingsDarkMode;
        const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
        const cardBg  = isDark ? "#141930" : "#ffffff";
        const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
        const txt     = isDark ? "#ffffff" : "#0d0f14";
        const muted   = isDark ? "rgba(255,255,255,0.7)" : "#64748b";
        const mutedSub = isDark ? "rgba(255,255,255,0.4)" : "#94a3b8";
        return (
          <>
        {/* ── Quiz Selector Modal ── */}
        {showBattleQuizSelector && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBattleQuizSelector(false)}>
          <View style={{ flex: 1, backgroundColor: bg }}>
            <SafeAreaView style={{ backgroundColor: bg }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: txt, letterSpacing: -0.4 }}>Select a Quiz</Text>
                </View>
                <Pressable
                  onPress={() => setShowBattleQuizSelector(false)}
                  style={({ pressed }) => [{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    alignItems: "center", justifyContent: "center",
                    opacity: pressed ? 0.6 : 1,
                  }]}
                >
                  <Ionicons name="close" size={18} color={txt} />
                </Pressable>
              </View>
            </SafeAreaView>
            <FlatList
              data={(!sampleDismissed && sampleQuiz) ? [sampleQuiz, ...quizzes].reverse() : [...quizzes].reverse()}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 24, gap: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => handleHostBattle(item.id)}
                  style={({ pressed }) => [{
                    backgroundColor: cardBg,
                    borderWidth: 1, borderColor: cardBorder,
                    borderRadius: 16, padding: 18,
                    flexDirection: "row", alignItems: "center", gap: 14,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDark ? 0 : 0.04, shadowRadius: 8, elevation: isDark ? 0 : 1,
                  }, pressed && { opacity: 0.8, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)" }]}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 12,
                    backgroundColor: isDark ? "rgba(129,140,248,0.15)" : "rgba(79,70,229,0.1)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Ionicons name="document-text" size={22} color={isDark ? "#818cf8" : "#4f46e5"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 3 }} numberOfLines={1}>{item.title.replace(/[\r\n]+/g, ' ')}</Text>
                    <Text style={{ fontSize: 12, color: muted, fontWeight: "500" }}>{item.questions} questions · {item.category}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={mutedSub} />
                </Pressable>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: "center", marginTop: 60, gap: 12 }}>
                  <Text style={{ fontSize: 40 }}>📭</Text>
                  <Text style={{ textAlign: "center", color: muted, fontSize: 15, fontWeight: "500" }}>No quizzes yet.{"\n"}Create one to host a battle!</Text>
                </View>
              }
            />
          </View>
        </Modal>
        )}

        {/* ── Battle Options Modal ── */}
        {showBattleOptions && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!battleCreating) setShowBattleOptions(false); }}>
          <View style={{ flex: 1, backgroundColor: isDark ? "#0B0F1C" : "#f4f4f8" }}>

            {/* Header with safe area */}
            <SafeAreaView style={{ backgroundColor: isDark ? "#0B0F1C" : "#f4f4f8" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: txt, letterSpacing: -0.4 }}>Battle Setup</Text>
                  {battleOptionsQuiz && (
                    <Text style={{ fontSize: 13, color: muted, marginTop: 3 }} numberOfLines={1}>
                      {battleOptionsQuiz.title.replace(/[\r\n]+/g, ' ')}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => { if (!battleCreating) setShowBattleOptions(false); }}
                  style={({ pressed }) => [{
                    width: 36, height: 36, borderRadius: 18,
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                    alignItems: "center", justifyContent: "center",
                    opacity: battleCreating ? 0.3 : pressed ? 0.6 : 1,
                  }]}
                >
                  <Ionicons name="close" size={18} color={txt} />
                </Pressable>
              </View>
            </SafeAreaView>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 140, paddingTop: 4 }}
              showsVerticalScrollIndicator={false}
            >

              {/* Questions available pill */}
              {battleOptionsQuiz && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 }}>
                  <View style={{ backgroundColor: isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#818cf8" : "#6366f1" }}>
                      {battleOptionsQuiz.questions} questions available
                    </Text>
                  </View>
                </View>
              )}

              {/* Question Selection */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Questions</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {([{ value: "all" as const, label: "All" }, { value: "random" as const, label: "Random" }, { value: "range" as const, label: "Range" }]).map(({ value, label }) => {
                  const isActive = battleSelectionMode === value;
                  return (
                    <Pressable key={value} onPress={() => setBattleSelectionMode(value)}
                      style={({ pressed }) => [{
                        flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderColor: isActive
                          ? "#6366f1"
                          : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                        opacity: pressed ? 0.75 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 14, fontWeight: "700", color: isActive ? (isDark ? "#ffffff" : "#0d0f14") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Random count stepper */}
              {battleSelectionMode === "random" && (
                <View style={{ backgroundColor: "transparent",
                  borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: txt }}>Number of questions</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Pressable onPress={() => setBattleRandomCount(Math.max(1, battleRandomCount - 1))}
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, color: txt, fontWeight: "700" }}>−</Text>
                    </Pressable>
                    <TextInput
                      style={{ fontSize: 18, fontWeight: "800", color: txt, minWidth: 32, textAlign: "center", padding: 0 }}
                      keyboardType="number-pad"
                      value={battleRandomCount === 0 ? "" : String(battleRandomCount)}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '');
                        if (!cleaned) { setBattleRandomCount(0); return; }
                        const maxQ = battleOptionsQuiz?.questionsList?.length || battleOptionsQuiz?.questions || 50;
                        setBattleRandomCount(Math.max(1, Math.min(maxQ, parseInt(cleaned, 10))));
                      }}
                    />
                    <Pressable onPress={() => setBattleRandomCount(Math.min((battleOptionsQuiz?.questionsList?.length || battleOptionsQuiz?.questions || 50), battleRandomCount + 1))}
                      style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, color: txt, fontWeight: "700" }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Range steppers */}
              {battleSelectionMode === "range" && (
                <View style={{ backgroundColor: "transparent",
                  borderRadius: 14, padding: 18, marginBottom: 24, borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: txt }}>Range</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {[{ val: battleRangeStart, set: (v: number) => setBattleRangeStart(Math.max(1, Math.min(battleRangeEnd, v))) },
                      { val: battleRangeEnd, set: (v: number) => setBattleRangeEnd(Math.max(battleRangeStart, Math.min(battleOptionsQuiz?.questionsList?.length || 100, v))) }
                    ].map((item, idx) => (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        {idx === 1 && <Text style={{ fontSize: 13, color: muted, marginHorizontal: 4 }}>to</Text>}
                        <Pressable onPress={() => item.set(item.val - 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>−</Text>
                        </Pressable>
                        <TextInput
                          style={{ fontSize: 16, fontWeight: "800", color: txt, minWidth: 32, textAlign: "center", padding: 0 }}
                          keyboardType="number-pad"
                          value={item.val === 0 ? "" : String(item.val)}
                          onChangeText={(text) => {
                            const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
                            if (!isNaN(n)) item.set(n);
                          }}
                        />
                        <Pressable onPress={() => item.set(item.val + 1)}
                          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 16, color: txt, fontWeight: "700" }}>+</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Time per question */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Time per Question</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
                {([null, 15, 20, 30, 45, 60] as (number | null)[]).map((t) => {
                  const isActive = battleTimePerQuestion === t;
                  const label = t === null ? "No Limit" : `${t}s`;
                  return (
                    <Pressable key={String(t)} onPress={() => setBattleTimePerQuestion(t)}
                      style={({ pressed }) => [{
                        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        borderColor: isActive
                          ? "#6366f1"
                          : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color: isActive ? (isDark ? "#ffffff" : "#0d0f14") : muted }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Gameplay toggles */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Gameplay</Text>
              <View style={{ backgroundColor: "transparent",
                borderRadius: 16, borderWidth: 2, borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)", overflow: "hidden" }}>
                {[
                  { label: "Shuffle questions", sub: "Randomize question order", value: battleShuffleQ, set: setBattleShuffleQ },
                  { label: "Shuffle answers", sub: "Randomize answer choices", value: battleShuffleA, set: setBattleShuffleA },
                ].map((row, i) => (
                  <View key={row.label}>
                    {i > 0 && <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6", marginLeft: 18 }} />}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 }}>
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 2 }}>{row.label}</Text>
                        <Text style={{ fontSize: 12, color: muted }}>{row.sub}</Text>
                      </View>
                      <ToggleSwitch checked={row.value} onChange={row.set} darkMode={isDark} />
                    </View>
                  </View>
                ))}
              </View>

            </ScrollView>

            {/* Sticky bottom — CTA + optional join code */}
            <View style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              backgroundColor: isDark ? "#0B0F1C" : "#f4f4f8",
              borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
              paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16) + 16,
              gap: 10,
            }}>
              {/* Join code row removed as per user request */}
              {battleError ? <Text style={{ fontSize: 12, color: "#f87171", marginTop: -4, textAlign: "center" }}>{battleError}</Text> : null}

              {/* Create Room CTA */}
              <Pressable
                onPress={handleStartBattle}
                disabled={battleCreating}
                style={({ pressed }) => [{
                  borderRadius: 16, overflow: "hidden",
                  shadowColor: "#4f46e5", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
                  opacity: battleCreating ? 0.7 : 1,
                }, pressed && !battleCreating && { transform: [{ scale: 0.98 }] }]}
              >
                <LinearGradient
                  colors={["#6366f1", "#4f46e5"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }}
                >
                  {battleCreating ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Creating Room…</Text>
                    </>
                  ) : (
                    <>
                      <MaterialCommunityIcons name="sword-cross" size={20} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Create Battle Room</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Modal>
        )}


        {/* Battle History & Study Mode Modals — extracted to HomeModals.tsx */}
        <HomeModals p={p} />
    </View>
  );
}
