import React from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, ActivityIndicator, Animated, Platform, FlatList, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../../styles/shared";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const closeOrDismiss = (fn: () => void) => fn();
const KeyboardWrapper = Platform.OS === "ios" ? require("react-native").KeyboardAvoidingView : View;

/**
 * Reset/logout/delete/quit/offline/settings/restart/attempt report modals
 */
export function SessionConfirmationModals({ p }: { p: any }) {
  const { t } = useTranslation();
  return (
    <>
      {!!p.showResetConfirm && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowResetConfirm || (() => {}))(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowResetConfirm || (() => {}))(false)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="refresh-circle-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>Reset Statistics</Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 20 }]}>
              Are you sure you want to clear all attempt history and statistics? This cannot be undone.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => (p.setShowResetConfirm || (() => {}))(false)}
                style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  (p.setQuizzes || (() => {}))((p.quizzes || []).map((q: any) => ({ ...q, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] })));
                  // Sync all resets to Neon
                  if (p.firebaseUser) {
                    (p.quizzes || []).forEach((q: any) => {
                      const neonId = q.neonId ?? q.id;
                      if (neonId && !String(neonId).startsWith("local_")) {
                        (p.updateMobileQuiz || (() => {}))({
                          userId: p.firebaseUser?.uid,
                          quizId: neonId,
                          attempts: [],
                          wrongQuestions: [],
                          uniqueCorrectIds: []
                        }).catch((err: any) => console.warn("[NeonSync] quiz reset failed:", err));
                      }
                    });
                  }
                  (p.setShowResetConfirm || (() => {}))(false);
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Logout Confirm ── */}
      {!!p.showLogoutConfirm && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowLogoutConfirm || (() => {}))(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowLogoutConfirm || (() => {}))(false)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
              <Ionicons name="log-out-outline" size={28} color="#6366f1" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Log Out</Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 20 }]}>
              Are you sure you want to log out of your account?
            </Text>
            <View style={styles.dialogButtons}>
              <AnimatedPressable
                onPress={() => (p.setShowLogoutConfirm || (() => {}))(false)}
                style={[styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  (p.setShowLogoutConfirm || (() => {}))(false);
                  if (p.handleLogout) p.handleLogout();
                }}
                style={[styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Log Out</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Delete Account Confirm ── */}
      {!!p.showDeleteAccountConfirm && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowDeleteAccountConfirm || (() => {}))(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowDeleteAccountConfirm || (() => {}))(false)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="warning-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>Delete Account</Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 20 }]}>
              Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.
            </Text>
            <View style={styles.dialogButtons}>
              <AnimatedPressable
                onPress={() => (p.setShowDeleteAccountConfirm || (() => {}))(false)}
                disabled={p.deleteAccountLoading}
                style={[styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={async () => {
                  if (p.firebaseUser) {
                    (p.setDeleteAccountLoading || (() => {}))(true);
                    try {
                      await (p.deleteUserFromNeon || (() => {}))(p.firebaseUser?.uid);
                      await (p.deleteAccount || (() => {}))();
                      (p.setShowDeleteAccountConfirm || (() => {}))(false);
                      (p.setActiveTab || (() => {}))("home");
                    } catch (e) {
                      console.warn("Failed to delete account", e);
                      alert("Please re-authenticate and try again. For security, you must have signed in recently to delete your account.");
                      (p.setShowDeleteAccountConfirm || (() => {}))(false);
                    } finally {
                      (p.setDeleteAccountLoading || (() => {}))(false);
                    }
                  }
                }}
                disabled={p.deleteAccountLoading}
                style={[styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }]}
              >
                {p.deleteAccountLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Delete</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Quit Quiz Confirm — in-app modal ── */}
      {!!p.showQuitConfirm && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowQuitConfirm || (() => {}))(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowQuitConfirm || (() => {}))(false)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 24 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
              <Ionicons name="warning-outline" size={30} color="#f59e0b" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>
              {p.activeSession?.isBattle ? "Submit and Exit Now?" : "Quit Quiz?"}
            </Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 24 }]}>
              {p.activeSession?.isBattle ? "Your current score will be submitted to the battle." : "Your attempted questions will be saved as a completed session."}
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => (p.setShowQuitConfirm || (() => {}))(false)}
                style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { 
                  (p.setShowQuitConfirm || (() => {}))(false); 
                  if (p.activeSession?.isBattle) {
                    (p.handleFinishSession || (() => {}))();
                  } else {
                    if (p.saveAndExitQuizSession) {
                      p.saveAndExitQuizSession(true, { ...(p.activeSession || {}), isFinished: true });
                    } else {
                      (p.setActiveSession || (() => {}))(null);
                    }
                  }
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: p.activeSession?.isBattle ? "#10b981" : "#f59e0b" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: p.activeSession?.isBattle ? "#ffffff" : "#000" }]}>
                  {p.activeSession?.isBattle ? "Submit & Exit" : "Save & Exit"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Offline Protection Modal ── */}
      {!!p.offlineModalParams && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setOfflineModalParams || (() => {}))(null)}>
        <Pressable style={[styles.centerModalBackdrop, { backgroundColor: "rgba(0,0,0,0.6)" }]} onPress={() => (p.setOfflineModalParams || (() => {}))(null)}>
          <View style={{
            backgroundColor: p.settingsDarkMode ? "rgba(22, 24, 31, 0.95)" : "#ffffff",
            borderRadius: 28,
            padding: 32,
            width: Dimensions.get("window").width * 0.85,
            maxWidth: 340,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.35,
            shadowRadius: 24,
            elevation: 10,
            borderWidth: 1,
            borderColor: p.settingsDarkMode ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
          }} onStartShouldSetResponder={() => true}>
            


            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: p.settingsDarkMode ? "rgba(239, 68, 68, 0.12)" : "rgba(239, 68, 68, 0.08)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.25)"
            }}>
              <Ionicons name="cloud-offline" size={32} color="#ef4444" />
            </View>

            <Text style={{
              fontSize: 22,
              fontWeight: "800",
              color: p.settingsDarkMode ? "#ffffff" : "#0f172a",
              letterSpacing: -0.4,
              marginBottom: 12,
              textAlign: "center"
            }}>
              {p.offlineModalParams?.title}
            </Text>

            <Text style={{
              fontSize: 16,
              color: p.settingsDarkMode ? "#cbd5e1" : "#475569",
              textAlign: "center",
              marginBottom: 32,
              lineHeight: 24,
              fontWeight: "400"
            }}>
              {p.offlineModalParams?.message}
            </Text>
            
            <View style={{ width: "100%", gap: 12 }}>
              {p.offlineModalParams?.buttons ? (
                p.offlineModalParams?.buttons.map((btn: any, idx: any) => (
                  <Pressable
                    key={idx}
                    onPress={() => {
                      (p.setOfflineModalParams || (() => {}))(null);
                      btn.onPress();
                    }}
                    style={({ pressed }) => [
                      { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", width: "100%" },
                      btn.isPrimary ? { backgroundColor: "#ef4444" } : { backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" },
                      pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                    ]}
                  >
                    <Text style={[{ fontSize: 16, fontWeight: "700" }, btn.isPrimary ? { color: "#ffffff" } : { color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }]}>
                      {btn.text}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Pressable
                  onPress={() => (p.setOfflineModalParams || (() => {}))(null)}
                  style={({ pressed }) => [
                    { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", width: "100%", backgroundColor: "#ef4444", shadowColor: "#ef4444", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
                    pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                  ]}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff", letterSpacing: 0.3 }}>OK</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Quiz Settings Modal ── */}
      {!!p.showQuizSettingsModal && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowQuizSettingsModal || (() => {}))(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => (p.setShowQuizSettingsModal || (() => {}))(false)}>
          <View style={{
            position: "absolute",
            top: (insets?.top || 0) + 90,
            right: 20,
            width: 220,
            backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff",
            borderRadius: 16,
            padding: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 8
          }} onStartShouldSetResponder={() => true}>
            <View style={{ gap: 4 }}>
              {/* Restart */}
              <Pressable
                onPress={() => {
                  (p.setShowQuizSettingsModal || (() => {}))(false);
                  (p.setShowRestartConfirm || (() => {}))(true);
                }}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 }, pressed && { backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}
              >
                <Ionicons name="refresh" size={20} color="#6366f1" style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "500", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Restart Quiz</Text>
              </Pressable>

              {/* Submit */}
              <Pressable
                onPress={() => {
                  (p.setShowQuizSettingsModal || (() => {}))(false);
                  (p.handleFinishSession || (() => {}))();
                }}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 }, pressed && { backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}
              >
                <Ionicons name="checkmark-done" size={20} color="#10b981" style={{ marginRight: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "500", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Submit Quiz</Text>
              </Pressable>

              {/* Auto Slide */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="play-forward" size={20} color="#f59e0b" style={{ marginRight: 12 }} />
                  <View style={{ flexDirection: "column" }}>
                    <Text style={{ fontSize: 16, fontWeight: "500", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Auto Slide</Text>
                    <Text style={{ fontSize: 12, color: p.settingsDarkMode ? "#94a3b8" : "#64748b" }}>(correct answers)</Text>
                  </View>
                </View>
                <ToggleSwitch checked={p.autoSlideEnabled} onChange={p.setAutoSlideEnabled} darkMode={p.settingsDarkMode} />
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Restart Quiz Confirm — in-app modal ── */}
      {!!p.showRestartConfirm && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowRestartConfirm || (() => {}))(false)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowRestartConfirm || (() => {}))(false)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 24 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
              <Ionicons name="refresh" size={30} color="#6366f1" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Restart Quiz?</Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 24 }]}>
              This will erase all your current answers and let you start over.
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => (p.setShowRestartConfirm || (() => {}))(false)}
                style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0,0,0,0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => { 
                  (p.setShowRestartConfirm || (() => {}))(false); 
                  (p.setActiveSession || (() => {}))({
                    ...p.activeSession,
                    answers: {},
                    submitted: [],
                    currentIndex: 0,
                    isFinished: false,
                    startedAt: Date.now()
                  });
                  p.quizFlatListRef?.current?.scrollToIndex({ index: 0, animated: false });
                  p.quizNumbersScrollRef?.current?.scrollTo({ x: 0, animated: false });
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#6366f1" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Restart</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
      )}

      {/* ── Attempt Actions Modal (Sleek Bottom Sheet) ── */}
      {!!p.selectedAttemptForModal && (
      <Modal visible={true} animationType="slide" transparent onRequestClose={() => (p.setSelectedAttemptForModal || (() => {}))(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => (p.setSelectedAttemptForModal || (() => {}))(null)}>
          {p.selectedAttemptForModal && (
            <View style={{ backgroundColor: p.settingsDarkMode ? "#16162a" : "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 36 : 24) + 16 }} onStartShouldSetResponder={() => true}>
              {/* Drag Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(99,102,241,0.3)", shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}>
                  <Text style={{ fontSize: 26 }}>🎯</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 22, fontWeight: "800", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", letterSpacing: -0.5 }}>
                    Attempt #{p.selectedAttemptForModal.attemptNum}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 3 }}>
                    Score: {p.selectedAttemptForModal.attempt.score}% • {p.selectedAttemptForModal.attempt.correct} correct
                  </Text>
                </View>
              </View>
              
              <View style={{ gap: 10, width: "100%" }}>
                {/* Re-attempt Incorrect Action */}
                {(p.selectedAttemptForModal.attempt.wrongQuestionIds || []).length > 0 && (
                  <Pressable
                    onPress={() => {
                      const quiz = p.selectedAttemptForModal.quizId === "sample_quiz" ? p.sampleQuiz : (p.quizzes || []).find((q: any) => q.id === p.selectedAttemptForModal.quizId);
                      if (quiz) {
                        let qsList = quiz.id === "sample_quiz" ? SAMPLE_QUIZ.questionsList : (quiz.questionsList && quiz.questionsList.length > 0 ? [...quiz.questionsList] : []);
                        if (qsList.length === 0) {
                          qsList = generateMockQuestionsForQuiz(quiz.title, quiz.questions);
                        }
                        const wrongIds = p.selectedAttemptForModal.attempt.wrongQuestionIds;
                        const filteredList = qsList.filter((q: any) => wrongIds.includes(q.id));
                        if (filteredList.length > 0) {
                          (p.setActiveSession || (() => {}))({
                            quizId: quiz.id,
                            quizTitle: quiz.title,
                            questions: filteredList,
                            selectionMode: "wrong",
                            shuffleQuestions: false,
                            shuffleAnswers: true,
                            showAnswerOnSubmit: true,
                            timePerQuestion: null,
                            currentIndex: 0,
                            answers: {},
                            submitted: [] as string[],
                            isFinished: false,
                            startedAt: Date.now(),
                            targetAttemptId: p.selectedAttemptForModal.attempt.id,
                            retryOfAttemptNum: p.selectedAttemptForModal.attemptNum
                          });
                          (p.setSelectedAttemptForModal || (() => {}))(null);
                        }
                      }
                    }}
                    style={({ pressed }) => ({
                      backgroundColor: p.settingsDarkMode ? "#172033" : "#ffffff",
                      borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                      borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                      opacity: pressed ? 0.8 : 1
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      <Text style={{ fontSize: 24 }}>🔄</Text>
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#111827" }}>
                          {t('profile.re_attempt_wrong') || "Re-attempt Incorrect"}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 4 }}>
                          {(p.selectedAttemptForModal?.attempt?.wrongQuestionIds || []).length} {t('profile.missed_questions') || "missed questions"}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={p.settingsDarkMode ? "#6e727a" : "#94a3b8"} />
                  </Pressable>
                )}
                {/* Report Card Action */}
                <Pressable
                  onPress={() => {
                    (p.onViewReportCard || (() => {}))(p.selectedAttemptForModal.attempt, p.selectedAttemptForModal.quizId);
                    (p.setSelectedAttemptForModal || (() => {}))(null);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.03)" : "#ffffff",
                    borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                    opacity: pressed ? 0.8 : 1
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <Text style={{ fontSize: 24 }}>📝</Text>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#111827" }}>
                        Review Answers
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 4 }}>
                        See your answers and explanations
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={p.settingsDarkMode ? "#6e727a" : "#94a3b8"} />
                </Pressable>

                {/* Delete Attempt Action */}
                <Pressable
                  onPress={() => {
                    (p.handleDeleteAttemptOnMobile || (() => {}))(p.selectedAttemptForModal.quizId, p.selectedAttemptForModal.attempt.id);
                    (p.setSelectedAttemptForModal || (() => {}))(null);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: p.settingsDarkMode ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.05)",
                    borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.15)",
                    opacity: pressed ? 0.8 : 1
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <Text style={{ fontSize: 24 }}>🗑️</Text>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#ef4444" }}>
                      {t('profile.delete_attempt') || "Delete Attempt"}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
      )}

    </>
  );
}
