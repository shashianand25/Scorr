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

/**
 * ReportCardModal — wrong-answer review and results report card modal.
 * Extracted from HomeLayout.tsx to reduce file size.
 */
export function ReportCardModal({ p }: { p: any }) {
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

  return (
    <>
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
    </>
  );
}
