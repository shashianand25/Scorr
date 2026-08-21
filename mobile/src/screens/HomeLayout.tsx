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
import { AppModals } from "../components/modals/AppModals";
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


      {/* ── Report Card Modal ── extracted to ReportCardModal.tsx ── */}
      <ReportCardModal p={p} />


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


      {/* ── Battle Modals ── extracted to BattleModals.tsx ── */}
      <BattleModals p={p} />


        {/* Battle History & Study Mode Modals — extracted to HomeModals.tsx */}
        <HomeModals p={p} />
    </View>
  );
}
