import React, { useRef } from "react";
import { Modal, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Image, FlatList, Platform, Keyboard, KeyboardAvoidingView, Alert, Dimensions, LayoutAnimation } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Buffer } from "buffer";
import * as mammoth from "mammoth/mammoth.browser.js";


import { deleteMobileQuiz } from "../../lib/api";
import { getUserErrorMessage } from "../../utils/errors";
import { styles } from "../../styles/shared";
import { AnimatedPressable } from "../ui/AnimatedPressable";
import { Stepper } from "../ui/Stepper";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { CustomChartIcon } from "../ui/CustomChartIcon";
import { renderFormattedText } from "../../utils/text";
import { generateMockQuestionsForQuiz } from "../../utils/quiz";
import { APP_LANGUAGES, SAMPLE_QUIZ } from "../../constants/sample-quiz";

const closeOrDismiss = (closeAction: () => void) => {
  if (Keyboard.isVisible()) { Keyboard.dismiss(); } else { closeAction(); }
};
const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;



export function AppModals({ p }: { p: any }) {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const pendingAiFile = useRef<{ text: string; fileName: string } | null>(null);
  const totalQuestions = p.selectedQuiz?.questions ?? 0;
  const wrongCount = p.selectedQuiz?.wrongQuestions?.length ?? 0;
  const attemptedIds: Set<string> = new Set((p.selectedQuiz?.attempts || []).flatMap((a: any) => a.questionIds || []));
  const unansweredCount = p.selectedQuiz ? (p.selectedQuiz.questionsList || []).filter((q: any) => !attemptedIds.has(q.id)).length : totalQuestions;
  const questionCount = (() => {
    switch (p.selectionMode) {
      case "random": return Math.min(p.randomCount, totalQuestions);
      case "range": return Math.max(0, Math.min(p.rangeEnd, totalQuestions) - Math.max(p.rangeStart - 1, 0));
      case "unanswered": return unansweredCount;
      case "wrong": return wrongCount;
      default: return totalQuestions;
    }
  })();

  const [showMoreQuizOptions, setShowMoreQuizOptions] = React.useState(false);
  const [quizPreset, setQuizPreset] = React.useState<"marathon"|"timed"|"pop"|"exam"|"mistakes"|"custom">("marathon");
  const [quizSetupStep, setQuizSetupStep] = React.useState<"presets"|"custom">("presets");

  React.useEffect(() => {
    if (!p.showQuizActions) setShowMoreQuizOptions(false);
  }, [p.showQuizActions]);

  React.useEffect(() => {
    if (p.selectedQuiz) {
      setQuizSetupStep("presets");
      setQuizPreset("marathon");
    }
  }, [p.selectedQuiz]);

  return (

    <>
      {/* Quiz Actions bottom sheet */}
        {p.showQuizActions != null && (
      <Modal
        visible={true}
        animationType="slide"
        transparent={true}
        onRequestClose={() => (p.setShowQuizActions || (() => {}))(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}
          onPress={() => (p.setShowQuizActions || (() => {}))(null)}
        >
          <View style={{
            backgroundColor: p.settingsDarkMode ? "#0d1a2e" : "#ffffff",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>
            {/* Drag handle + title */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, marginBottom: 14,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}
                numberOfLines={1}>
                {p.showQuizActions?.title}
              </Text>
              <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 3 }}>
                {p.showQuizActions?.questions} {t('actions.questions') || "Questions"}
              </Text>
            </View>

            <View style={{ height: 0.5, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", marginTop: 12 }} />

            {/* View (PDF Mode) */}
            <AnimatedPressable
              onPress={() => {
                const quiz = p.showQuizActions;
                (p.setPdfViewQuiz || (() => {}))(quiz);
                (p.setShowQuizActions || (() => {}))(null);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="eye-outline" size={22} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1,
                color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>View</Text>
            </AnimatedPressable>

            {/* Rename */}
            <AnimatedPressable
              onPress={() => {
                const quiz = p.showQuizActions;
                (p.setShowQuizActions || (() => {}))(null);
                (p.setRenamingQuiz || (() => {}))(quiz);
                (p.setRenameTitle || (() => {}))(quiz.title);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="pencil-outline" size={22} color={p.settingsDarkMode ? "#ccccdd" : "#555566"} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1,
                color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('actions.rename') || "Rename"}</Text>
            </AnimatedPressable>

            {/* Share */}
            <AnimatedPressable
              onPress={() => {
                const quiz = p.showQuizActions;
                (p.setShowQuizActions || (() => {}))(null);
                (p.handleShareQuiz || (() => {}))(quiz);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="share-outline" size={22} color="#10b981" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1, color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                Share
              </Text>
            </AnimatedPressable>
            
            {/* Clear Attempts */}
            <AnimatedPressable
              onPress={() => {
                const quiz = p.showQuizActions;
                (p.setShowQuizActions || (() => {}))(null);
                if (Platform.OS === "web") {
                  if (confirm("Reset attempts for this quiz?")) {
                    (p.handleClearHistoryOnMobile || (() => {}))(quiz.id);
                  }
                } else {
                  Alert.alert("Reset", "Reset history for this quiz?", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Reset", style: "destructive", onPress: () => (p.handleClearHistoryOnMobile || (() => {}))(quiz.id) }
                  ]);
                }
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(251, 146, 60, 0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="refresh-outline" size={22} color="#fb923c" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1, color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                Clear attempts
              </Text>
            </AnimatedPressable>

            <View style={{ height: 0.5, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", marginHorizontal: 24 }} />

            {/* Delete */}
            <AnimatedPressable
              onPress={() => {
                (p.setDeletingQuizConfirm || (() => {}))(p.showQuizActions);
                (p.setShowQuizActions || (() => {}))(null);
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 17, paddingHorizontal: 24,
                marginBottom: insets.bottom + 10
              }}
              scaleTo={0.97}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12,
                backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", flex: 1, color: "#ef4444" }}>{t('actions.delete') || "Delete"}</Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Modal>
        )}

      {/* Rename Quiz Modal */}
        {p.renamingQuiz != null && (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={() => closeOrDismiss(() => (p.setRenamingQuiz || (() => {}))(null))}
      >
        <KeyboardWrapper
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Pressable 
            style={styles.centerModalBackdrop} 
            onPress={() => (p.setRenamingQuiz || (() => {}))(null)}
          >
            <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
              <View style={[styles.dialogIcon, { backgroundColor: "rgba(99, 102, 241, 0.12)" }]}>
                <Ionicons name="create-outline" size={28} color="#6366f1" />
              </View>
              <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>
                Rename Quiz
              </Text>
              <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 16 }]}>
                Enter a new title for "{p.renamingQuiz?.title}"
              </Text>

              <Pressable style={[styles.webInputDummy, { width: "100%", marginBottom: 20 }, !p.settingsDarkMode && styles.lightInput]}>
                <TextInput
                  autoFocus
                  placeholder="Quiz Title"
                  placeholderTextColor="#666"
                  style={[styles.formInput, !p.settingsDarkMode && styles.lightText]}
                  value={p.renameTitle}
                  onChangeText={p.setRenameTitle}
                />
              </Pressable>

              <View style={styles.dialogButtons}>
                <Pressable
                  onPress={() => (p.setRenamingQuiz || (() => {}))(null)}
                  style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" }, pressed && styles.pressedScale]}
                >
                  <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if ((p.renameTitle || "").trim() && p.renamingQuiz) {
                      (p.setQuizzes || (() => {}))((p.quizzes || []).map((q: any) => q.id === p.renamingQuiz.id ? { ...q, title: (p.renameTitle || "").trim() } : q));
                      // Sync rename to Neon if logged in
                      const neonId = p.renamingQuiz.neonId ?? p.renamingQuiz.id;
                      if (p.firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                        (p.updateMobileQuiz || (() => {}))({
                          userId: p.firebaseUser?.uid,
                          quizId: neonId,
                          title: (p.renameTitle || "").trim()
                        }).catch((err: any) => console.warn("[NeonSync] quiz rename failed:", err));
                      }
                      (p.setRenamingQuiz || (() => {}))(null);
                      (p.setRenameTitle || (() => {}))("");
                    }
                  }}
                  style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#00e5a0" }, pressed && styles.pressedScale]}
                >
                  <Text style={styles.dialogConfirmText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardWrapper>
      </Modal>
        )}

      {/* Importing Loading Overlay */}
      {!!p.isImporting && (
      <Modal visible={true} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1a1b2e', borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, minWidth: 200 }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Importing Quiz...</Text>
            <Text style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Parsing your questions</Text>
          </View>
        </View>
      </Modal>
      )}

      {/* Import Error Modal */}
        {p.importErrorDetails != null && (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={() => (p.setImportErrorDetails || (() => {}))(null)}
      >
        <Pressable 
          style={styles.centerModalBackdrop} 
          onPress={() => (p.setImportErrorDetails || (() => {}))(null)}
        >
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="warning-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>
              {p.importErrorDetails?.title}
            </Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 12, lineHeight: 18 }]}>
              {p.importErrorDetails?.message}
            </Text>
            {p.importErrorDetails?.details ? (
              <Text style={[{ fontSize: 11, color: "#888888", fontStyle: "italic", marginBottom: 16, textAlign: "center" }, !p.settingsDarkMode && styles.lightTextSub]}>
                (Error: {p.importErrorDetails?.details})
              </Text>
            ) : null}

            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => (p.setImportErrorDetails || (() => {}))(null)}
                style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightTextSub]}>No Thanks</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  (p.setImportErrorDetails || (() => {}))(null);
                  (p.setActiveTab || (() => {}))("guide");
                }}
                style={({ pressed }) => [styles.dialogConfirm, pressed && styles.pressedScale]}
              >
                <Text style={styles.dialogConfirmText}>Watch Video</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
        )}

      {/* Delete Quiz Confirmation Modal */}
        {p.deletingQuizConfirm != null && (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={() => (p.setDeletingQuizConfirm || (() => {}))(null)}
      >
        <Pressable 
          style={styles.centerModalBackdrop} 
          onPress={() => (p.setDeletingQuizConfirm || (() => {}))(null)}
        >
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: "#ef4444" }]}>
              Delete Quiz
            </Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 20, lineHeight: 18 }]}>
              Are you sure you want to delete "{p.deletingQuizConfirm?.title}"? This action is permanent and cannot be undone.
            </Text>

            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => (p.setDeletingQuizConfirm || (() => {}))(null)}
                style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (p.deletingQuizConfirm) {
                    if (p.deletingQuizConfirm.id === "sample_quiz") {
                      (p.setSampleDismissed || (() => {}))(true);
                      AsyncStorage.setItem("quizforge_sample_dismissed", "1");
                      (p.setDeletingQuizConfirm || (() => {}))(null);
                      return;
                    }

                    AsyncStorage.getItem(`quiz_file_${p.deletingQuizConfirm.id}`).then(uri => {
                      if (uri) {
                        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
                      }
                      AsyncStorage.removeItem(`quiz_file_${p.deletingQuizConfirm.id}`).catch(() => {});
                    }).catch(() => {});

                    (p.setQuizzes || (() => {}))((p.quizzes || []).filter((q: any) => q.id !== p.deletingQuizConfirm.id));
                    (p.setViewingInsightsQuiz || (() => {}))(null);
                    (p.setActiveTab || (() => {}))(p.viewingInsightsQuizFromTab as any || "home");
                    (p.setDeletingQuizConfirm || (() => {}))(null);
                    // Delete from Neon if logged in and quiz is synced
                    const neonId = p.deletingQuizConfirm.neonId ?? p.deletingQuizConfirm.id;
                    if (p.firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                      (p.deleteMobileQuiz || (() => {}))(p.firebaseUser?.uid, neonId).catch((err: any) =>
                        console.warn("[NeonSync] quiz delete failed:", err)
                      );
                    }
                  }
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#ef4444", shadowColor: "#ef4444" }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
        )}

      {/* ── Reset Statistics Confirmation Modal ── */}
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
            <View style={{ backgroundColor: p.settingsDarkMode ? "#16162a" : "#ffffff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }} onStartShouldSetResponder={() => true}>
              {/* Drag Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)", borderRadius: 2, alignSelf: "center", marginBottom: 24 }} />
              
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(99,102,241,0.3)", shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}>
                  <Text style={{ fontSize: 28 }}>🎯</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", letterSpacing: -0.5 }}>
                    Attempt #{p.selectedAttemptForModal.attemptNum}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 4 }}>
                    Score: {p.selectedAttemptForModal.attempt.score}% • {p.selectedAttemptForModal.attempt.correct} correct
                  </Text>
                </View>
              </View>
              
              <View style={{ gap: 12, width: "100%" }}>
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
                            shuffleAnswers: false,
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
                      borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
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
                {/* Delete Attempt Action */}
                <Pressable
                  onPress={() => {
                    (p.handleDeleteAttemptOnMobile || (() => {}))(p.selectedAttemptForModal.quizId, p.selectedAttemptForModal.attempt.id);
                    (p.setSelectedAttemptForModal || (() => {}))(null);
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: p.settingsDarkMode ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.05)",
                    borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
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

      {/* ── Feedback — full-screen slide-up page ── */}
      {!!p.showFeedbackPage && (
      <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => closeOrDismiss(() => (p.setShowFeedbackPage || (() => {}))(false))}>
        <KeyboardWrapper
          style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0B0F1E" : "#f4f4f8" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 }}>
            <Pressable
              onPress={() => { (p.setShowFeedbackPage || (() => {}))(false); (p.setFeedbackText || (() => {}))(""); }}
              style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                backgroundColor: p.settingsDarkMode ? "#141930" : "rgba(0,0,0,0.06)", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "transparent" }, pressed && styles.pressedScale]}
            >
              <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: p.settingsDarkMode ? "#fff" : "#0d0f14", marginLeft: 14 }}>Feedback</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{
              borderRadius: 24, padding: 24, marginBottom: 20,
              backgroundColor: p.settingsDarkMode ? "#141930" : "#ffffff",
              borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "#e5e5ea",
            }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(99,102,241,0.15)",
                alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#818cf8" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: p.settingsDarkMode ? "#fff" : "#0d0f14", marginBottom: 6, letterSpacing: -0.3 }}>
                {t('profile.feedback_title') || "Share your thoughts"}
              </Text>
              <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "#666677", lineHeight: 20 }}>
                {t('profile.feedback_desc') || "Found a bug? Have a suggestion? Want a new feature? We're all ears."}
              </Text>
            </View>

            {/* Text area */}
            <TextInput
              multiline
              placeholder={t('profile.feedback_placeholder') || "Tell us what you think…"}
              placeholderTextColor={p.settingsDarkMode ? "#555555" : "#c0c0d0"}
              style={{
                backgroundColor: p.settingsDarkMode ? "#141930" : "#ffffff",
                borderRadius: 18, padding: 18,
                color: p.settingsDarkMode ? "#fff" : "#0d0f14", fontSize: 15,
                minHeight: 180, textAlignVertical: "top",
                borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "#e5e5ea",
                marginBottom: 20,
              }}
              value={p.feedbackText}
              onChangeText={p.setFeedbackText}
            />

            <AnimatedPressable
              onPress={async () => { 
                if ((p.feedbackText || "").trim().length === 0) {
                  Alert.alert("Empty Feedback", "Please write something before sending.");
                  return;
                }
                (p.setFeedbackLoading || (() => {}))(true);
                const { ok, error } = await (p.sendFeedback || (() => {}))({
                  userId: p.firebaseUser?.uid,
                  userEmail: p.firebaseUser?.email || undefined,
                  message: p.feedbackText
                });
                (p.setFeedbackLoading || (() => {}))(false);
                if (ok) {
                  Alert.alert("Thank You!", "Your feedback has been sent directly to the developer.");
                  (p.setShowFeedbackPage || (() => {}))(false); 
                  (p.setFeedbackText || (() => {}))("");
                } else {
                  console.warn("Failed to send feedback", error);
                  Alert.alert("Error", "Could not send feedback. Please try again later.");
                }
              }}
              disabled={p.feedbackLoading}
              style={{
                height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center",
                backgroundColor: p.feedbackLoading ? "#818cf8" : "#6366f1",
              }}
            >
              {p.feedbackLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t('profile.send_feedback') || "Send Feedback"}</Text>
              )}
            </AnimatedPressable>
          </ScrollView>
        </KeyboardWrapper>
      </Modal>
      )}

      {/* ── Privacy Policy Modal ── */}
      {!!p.showPrivacyPolicy && (
      <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => (p.setShowPrivacyPolicy || (() => {}))(false)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb" }}>

          {/* Sticky header */}
          <View style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
            backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb",
            borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => (p.setShowPrivacyPolicy || (() => {}))(false)}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.3 }}>Privacy Policy</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

            {/* Hero banner */}
            <LinearGradient colors={p.settingsDarkMode ? ["#1a1040", "#0d1535"] : ["#ebe9ff", "#f0f4ff"]}
              style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 22,
                backgroundColor: p.settingsDarkMode ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)",
                borderWidth: 1.5, borderColor: p.settingsDarkMode ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.2)",
                alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="lock-closed" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14",
                letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>Privacy Policy</Text>
              <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#818cf8" : "#6366f1", fontWeight: "600",
                textAlign: "center", marginBottom: 12 }}>Scorr App · Last updated June 2025</Text>
              <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                We believe your data belongs to you. Here's exactly what we collect, why, and how we keep it safe.
              </Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              {[
                { num: "01", icon: "person-outline" as const, accent: "#6366f1", title: "Information We Collect",
                  body: "When you sign in with Google or Email, we collect your name, email address, and profile photo solely to create your Scorr account. If you use the app without signing in, we collect no personal data whatsoever." },
                { num: "02", icon: "school-outline" as const, accent: "#8b5cf6", title: "Quiz & Flashcard Data",
                  body: "Your p.quizzes, flashcard decks, attempt history, correct/wrong answers, and study streaks are stored in our secure Neon (PostgreSQL) database and linked to your account. This enables your progress to sync seamlessly across devices." },
                { num: "03", icon: "phone-portrait-outline" as const, accent: "#06b6d4", title: "Local Storage",
                  body: "Your device uses AsyncStorage to cache p.quizzes and session data for offline access. This data lives only on your device and is never transmitted to or shared with any third party." },
                { num: "04", icon: "analytics-outline" as const, accent: "#10b981", title: "How We Use Your Data",
                  body: "Your data is used exclusively to power the Scorr experience — syncing your progress, displaying your stats, and personalising your study sessions. We do not sell, rent, or share your data with advertisers or any third parties, ever." },
                { num: "05", icon: "shield-checkmark-outline" as const, accent: "#f59e0b", title: "Data Security",
                  body: "All data in transit is protected by HTTPS/TLS encryption. Our Neon database sits behind authenticated API endpoints. Firebase Authentication handles all sign-in security. We never store raw passwords." },
                { num: "06", icon: "trash-outline" as const, accent: "#ef4444", title: "Deleting Your Data",
                  body: "You can permanently delete your account and all associated data at any time from Settings → Reset Statistics or by contacting us. Deletion removes your profile, p.quizzes, flashcards, and full attempt history from our servers immediately." },
                { num: "07", icon: "mail-outline" as const, accent: "#6366f1", title: "Contact Us",
                  body: "Questions about this policy or requests for data deletion? Reach us at recall.support@example.com and we'll respond within 48 hours." },
              ].map((s, i, arr) => (
                <View key={i}>
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 20 }}>
                    {/* Left accent + number */}
                    <View style={{ alignItems: "center", width: 44 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14,
                        backgroundColor: `${s.accent}18`, borderWidth: 1.5,
                        borderColor: `${s.accent}30`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={s.icon} size={20} color={s.accent} />
                      </View>
                      {i < arr.length - 1 && (
                        <View style={{ width: 1.5, flex: 1, marginTop: 8,
                          backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: s.accent, letterSpacing: 1.2 }}>{s.num}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "700",
                          color: p.settingsDarkMode ? "#e2e8f0" : "#0d0f14", letterSpacing: -0.2 }}>{s.title}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                        lineHeight: 22 }}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
              {/* Footer */}
              <View style={{ marginTop: 8, padding: 20, borderRadius: 16,
                backgroundColor: p.settingsDarkMode ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.06)",
                borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)",
                alignItems: "center" }}>
                <Ionicons name="shield-checkmark" size={24} color="#6366f1" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#818cf8" : "#4f46e5",
                  textAlign: "center", lineHeight: 20 }}>Your privacy is our priority.{"\n"}Scorr will never misuse your data.</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
      )}

      {/* ── Terms of Service Modal ── */}
      {!!p.showTermsOfService && (
      <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => (p.setShowTermsOfService || (() => {}))(false)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb" }}>

          {/* Sticky header */}
          <View style={{ paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
            backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb",
            borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => (p.setShowTermsOfService || (() => {}))(false)}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.3 }}>Terms of Service</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

            {/* Hero banner */}
            <LinearGradient colors={p.settingsDarkMode ? ["#0d2010", "#0d1535"] : ["#e6fff5", "#f0f9ff"]}
              style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 22,
                backgroundColor: p.settingsDarkMode ? "rgba(0,229,160,0.2)" : "rgba(0,229,160,0.12)",
                borderWidth: 1.5, borderColor: p.settingsDarkMode ? "rgba(0,229,160,0.35)" : "rgba(0,229,160,0.25)",
                alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="document-text" size={32} color="#00e5a0" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14",
                letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>Terms of Service</Text>
              <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#34d399" : "#059669", fontWeight: "600",
                textAlign: "center", marginBottom: 12 }}>Scorr App · Last updated June 2025</Text>
              <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                Simple, fair terms for using Scorr. By using the app, you agree to these.
              </Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              {[
                { num: "01", icon: "checkmark-circle-outline" as const, accent: "#00e5a0", title: "Acceptance of Terms",
                  body: "By downloading or using Scorr, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please uninstall the app and discontinue use." },
                { num: "02", icon: "phone-portrait-outline" as const, accent: "#06b6d4", title: "Use of the App",
                  body: "Scorr is a personal study tool for creating p.quizzes, studying flashcards, and tracking learning progress. You may not use Scorr for any unlawful purpose or to distribute harmful, abusive, or infringing content." },
                { num: "03", icon: "person-outline" as const, accent: "#6366f1", title: "User Accounts",
                  body: "You are responsible for maintaining the security of your account credentials. Notify us immediately of any unauthorised use. We are not liable for losses resulting from unauthorised access due to your negligence." },
                { num: "04", icon: "document-outline" as const, accent: "#8b5cf6", title: "Your Content",
                  body: "You own all quiz content, notes, and flashcards you create in Scorr. By using the app, you grant us a limited licence to store and process your content solely to provide the Scorr service back to you." },
                { num: "05", icon: "cloud-outline" as const, accent: "#3b82f6", title: "Cloud Sync & Data",
                  body: "When signed in, your p.quizzes and progress sync to our servers on a best-effort basis. While we work hard to ensure reliability, we cannot guarantee 100% uninterrupted access to cloud-synced data." },
                { num: "06", icon: "ban-outline" as const, accent: "#ef4444", title: "Prohibited Activities",
                  body: "You agree not to: reverse-engineer or decompile the app, attempt to gain unauthorised access to our servers or databases, use automated tools to scrape or abuse the service, or impersonate other users or Scorr staff." },
                { num: "07", icon: "construct-outline" as const, accent: "#f59e0b", title: "Modifications & Availability",
                  body: "We reserve the right to update, modify, or discontinue any features of Scorr at any time. We will notify users of significant changes where possible. Continued use after changes constitutes acceptance of the new terms." },
                { num: "08", icon: "shield-outline" as const, accent: "#94a3b8", title: "Disclaimer of Warranties",
                  body: "Scorr is provided \"as is\" without warranties of any kind. We do not guarantee that the app will be error-free or that AI-generated quiz content will always be 100% accurate. Always verify critical information from authoritative sources." },
                { num: "09", icon: "mail-outline" as const, accent: "#00e5a0", title: "Contact",
                  body: "Questions about these terms? Contact us at recall.support@example.com and we will respond within 48 hours." },
              ].map((s, i, arr) => (
                <View key={i}>
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 20 }}>
                    {/* Left accent icon with connector line */}
                    <View style={{ alignItems: "center", width: 44 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14,
                        backgroundColor: `${s.accent}18`, borderWidth: 1.5,
                        borderColor: `${s.accent}30`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={s.icon} size={20} color={s.accent} />
                      </View>
                      {i < arr.length - 1 && (
                        <View style={{ width: 1.5, flex: 1, marginTop: 8,
                          backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: s.accent, letterSpacing: 1.2 }}>{s.num}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "700",
                          color: p.settingsDarkMode ? "#e2e8f0" : "#0d0f14", letterSpacing: -0.2 }}>{s.title}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                        lineHeight: 22 }}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
              {/* Footer */}
              <View style={{ marginTop: 8, padding: 20, borderRadius: 16,
                backgroundColor: p.settingsDarkMode ? "rgba(0,229,160,0.06)" : "rgba(0,229,160,0.07)",
                borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(0,229,160,0.15)" : "rgba(0,229,160,0.15)",
                alignItems: "center" }}>
                <Ionicons name="document-text" size={24} color="#00e5a0" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#34d399" : "#059669",
                  textAlign: "center", lineHeight: 20 }}>These terms are designed to be fair and transparent.{"\n"}Thank you for using Scorr.</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
      )}

      {/* ── Quiz Created Success Modal ── */}
      {p.showQuizCreatedModal != null && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowQuizCreatedModal || (() => {}))(null)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowQuizCreatedModal || (() => {}))(null)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 28 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(0, 229, 160, 0.12)" }]}>
              <Ionicons name="checkmark-circle" size={36} color="#00e5a0" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Quiz Created!</Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 20 }]}>
              <Text style={{ color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontWeight: "700" }}>"{p.showQuizCreatedModal?.title}"</Text>
              {" "}was created successfully with{" "}
              <Text style={{ color: "#00e5a0", fontWeight: "700" }}>{p.showQuizCreatedModal?.count} questions</Text>
              . Ready to practice!
            </Text>
            <Pressable
              onPress={() => (p.setShowQuizCreatedModal || (() => {}))(null)}
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#00e5a0", width: "100%" }, pressed && styles.pressedScale]}
            >
              <Text style={styles.dialogConfirmText}>Start Practicing →</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      )}

      
      {/* Quiz Options Popup Modal (Sleek Compact Format) */}
      {p.selectedQuiz != null && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={false}
          onRequestClose={() => closeOrDismiss(() => { (p.setSelectedQuiz || (() => {}))(null); setQuizSetupStep("presets"); })}
        >
          <KeyboardWrapper style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 64 }}>
              
              
              {/* ── UNIFIED OPTIONS SCREEN ── */}
              <>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 24, fontWeight: "500", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontFamily: "serif" }}>How would you like to study?</Text>
                  </View>
                  <Pressable onPress={() => closeOrDismiss(() => { (p.setSelectedQuiz || (() => {}))(null); setQuizSetupStep("presets"); })} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}>
                    <Feather name="x" size={24} color={p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"} />
                  </Pressable>
                </View>

                <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 100 }}>
                  {[
                    { id: "marathon", title: "Marathon", sub: "All questions, no timer", icon: "help-circle", color: "#3b82f6" },
                    { id: "timed", title: "Timed", sub: "60s per question", icon: "hourglass-outline", color: "#f59e0b" },
                    { id: "pop", title: "Pop Quiz", sub: "10 random questions", icon: "flash", color: "#ef4444" },
                    { id: "exam", title: "Exam", sub: "Timed, shuffled, no feedback", icon: "document-text", color: "#eab308" },
                    { id: "mistakes", title: "Mistakes", sub: "Review incorrect answers", icon: "bandage", color: "#f97316" },
                    { id: "custom", title: "Custom", sub: "Configure your own settings", icon: "build", color: "#6366f1" },
                  ].map((preset) => {
                    const isActive = quizPreset === preset.id;
                    return (
                      <React.Fragment key={preset.id}>
                        <Pressable
                          onPress={() => {
                            setQuizPreset(preset.id as any);
                            if (preset.id === "marathon") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(false);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "timed") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setQuizPerQuestionTimer || (()=>{}))(60);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(false);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "pop") {
                              (p.setSelectionMode || (()=>{}))("random");
                              (p.setRandomCount || (()=>{}))(Math.min(10, totalQuestions));
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                            } else if (preset.id === "exam") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(Math.ceil(totalQuestions));
                              (p.setTimeLimitText || (()=>{}))(String(Math.ceil(totalQuestions)));
                              (p.setShuffleQuestions || (()=>{}))(true);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(false);
                            } else if (preset.id === "mistakes") {
                              (p.setSelectionMode || (()=>{}))("wrong");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                            } else if (preset.id === "custom") {
                              (p.setSelectionMode || (()=>{}))("range");
                            }
                          }}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center",
                            backgroundColor: "transparent",
                            borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10,
                            borderWidth: 2,
                            borderColor: isActive ? "#34d399" : (p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                            opacity: pressed ? 0.85 : 1,
                          })}
                        >
                          <View style={{ width: 40, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                            <Ionicons name={preset.icon as any} size={32} color={preset.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", marginBottom: 3 }}>{preset.title}</Text>
                            <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>{preset.sub}</Text>
                          </View>
                          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isActive ? "#34d399" : (p.settingsDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"), alignItems: "center", justifyContent: "center" }}>
                            {isActive && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#34d399" }} />}
                          </View>
                        </Pressable>

                        {/* Expandable Custom Settings */}
                        {isActive && preset.id === "custom" && (
                          <View style={{ marginTop: 4, marginBottom: 24, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 16 }}>
                              Question Selection
                            </Text>

                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                              {[
                                { value: "all" as const, label: "All" },
                                { value: "wrong" as const, label: "Wrong", disabled: wrongCount === 0 },
                                { value: "range" as const, label: "Range" },
                                { value: "unanswered" as const, label: "Unanswered", disabled: unansweredCount === 0 },
                                { value: "random" as const, label: "Random" },
                              ].map(({ value, label, disabled }) => {
                                const isActiveSel = p.selectionMode === value;
                                return (
                                  <Pressable
                                    key={value}
                                    disabled={disabled}
                                    onPress={() => (p.setSelectionMode || (() => {}))(value)}
                                    style={[
                                      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderWidth: 1, borderColor: "transparent" },
                                      isActiveSel && { backgroundColor: p.settingsDarkMode ? "#475569" : "#334155", borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)" },
                                      disabled && { opacity: 0.4 },
                                      !isActiveSel && p.settingsDarkMode && { backgroundColor: "#1e293b" },
                                      !isActiveSel && !p.settingsDarkMode && { borderColor: "#e5e7eb" }
                                    ]}
                                  >
                                    <Text style={[
                                      { fontSize: 14, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" },
                                      isActiveSel && { color: "#ffffff" },
                                    ]}>
                                      {label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>

                            <View style={{ padding: 16, borderRadius: 16, marginBottom: 32, backgroundColor: p.settingsDarkMode ? "#171f33" : "#ffffff", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              {p.selectionMode === "random" ? (
                                <>
                                  <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Random Count</Text>
                                  <Stepper value={p.randomCount} min={1} max={totalQuestions} onChange={(v) => (p.setRandomCount || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                                </>
                              ) : p.selectionMode === "range" ? (
                                <>
                                  <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Set Range</Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Stepper value={p.rangeStart} min={1} max={p.rangeEnd} onChange={(v) => (p.setRangeStart || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                                    <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#94a3b8" : "#64748b" }}>to</Text>
                                    <Stepper value={p.rangeEnd} min={p.rangeStart} max={totalQuestions} onChange={(v) => (p.setRangeEnd || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                                  </View>
                                </>
                              ) : (
                                <>
                                  <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>
                                    {p.selectionMode === "all" ? "Total Questions" : p.selectionMode === "wrong" ? "Wrong Answers" : "Unanswered"}
                                  </Text>
                                  <Stepper value={p.selectionMode === "all" ? totalQuestions : p.selectionMode === "wrong" ? wrongCount : unansweredCount} min={1} max={totalQuestions} onChange={() => {}} darkMode={p.settingsDarkMode} disabled={true} />
                                </>
                              )}
                            </View>

                            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 16 }}>
                              Gameplay Configurations
                            </Text>

                            <View style={{ borderRadius: 20, backgroundColor: p.settingsDarkMode ? "#171f33" : "#ffffff", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", paddingVertical: 8 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, zIndex: 10 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b", marginBottom: 2 }}>Quiz time limit</Text>
                                  <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#64748b" : "#64748b" }}>
                                    {p.timeLimitText ? `${p.timeLimitText} min` : (p.quizTimeLimit !== null ? `${p.quizTimeLimit} min` : "No time limit")}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#f1f5f9", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                                    <TextInput
                                      value={p.timeLimitText}
                                      onChangeText={(t) => {
                                        const clean = t.replace(/[^0-9]/g, "").slice(0, 3);
                                        (p.setTimeLimitText || (()=>{}))(clean);
                                      }}
                                      onBlur={() => {
                                        const n = parseInt(p.timeLimitText, 10);
                                        if (!p.timeLimitText || isNaN(n) || n < 1) {
                                          (p.setQuizTimeLimit || (()=>{}))(null);
                                          (p.setTimeLimitText || (()=>{}))("");
                                        } else if (n > 180) {
                                          (p.setQuizTimeLimit || (()=>{}))(180);
                                          (p.setTimeLimitText || (()=>{}))("180");
                                        } else {
                                          (p.setQuizTimeLimit || (()=>{}))(n);
                                        }
                                      }}
                                      placeholder="—"
                                      placeholderTextColor={p.settingsDarkMode ? "#475569" : "#94a3b8"}
                                      keyboardType="number-pad"
                                      maxLength={3}
                                      style={{ color: p.settingsDarkMode ? "#e2e8f0" : "#334155", fontSize: 15, fontWeight: "600", width: 30, textAlign: "center", padding: 0, margin: 0 }}
                                    />
                                    <Text style={{ color: p.settingsDarkMode ? "#475569" : "#64748b", fontSize: 13, fontWeight: "600" }}>min</Text>
                                  </View>
                                  <Pressable onPress={() => (p.setShowTimeLimitDropdown || (()=>{}))((v: any) => !v)} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
                                    <Feather name={p.showTimeLimitDropdown ? "chevron-up" : "chevron-down"} size={20} color={p.settingsDarkMode ? "#64748b" : "#64748b"} />
                                  </Pressable>
                                </View>
                                {p.showTimeLimitDropdown && (
                                  <>
                                    <Pressable style={{ position: "absolute", top: -1000, bottom: -1000, left: -1000, right: -1000, zIndex: 90 }} onPress={() => (p.setShowTimeLimitDropdown || (()=>{}))(false)} />
                                    <View style={{ position: "absolute", top: "100%", right: 16, marginTop: 4, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderRadius: 12, width: 150, maxHeight: 240, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: p.settingsDarkMode ? 0.4 : 0.1, shadowRadius: 16, elevation: 20, borderWidth: 1, borderColor: p.settingsDarkMode ? "#334155" : "#eaecf0", zIndex: 100 }}>
                                      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 6 }} nestedScrollEnabled={true} scrollEnabled={true}>
                                        {[null, 5, 10, 15, 30, 60].map((presetTime) => {
                                          const isTimeActive = p.quizTimeLimit === presetTime;
                                          const label = presetTime === null ? "No limit" : `${presetTime} min`;
                                          return (
                                            <Pressable key={String(presetTime)} onPress={() => { (p.setQuizTimeLimit || (()=>{}))(presetTime); (p.setTimeLimitText || (()=>{}))(presetTime !== null ? String(presetTime) : ""); (p.setShowTimeLimitDropdown || (()=>{}))(false); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: isTimeActive ? (p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : (pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") : "transparent"), flexDirection: "row", alignItems: "center", justifyContent: "space-between" })}>
                                              <Text style={{ fontSize: 14, fontWeight: isTimeActive ? "700" : "500", color: isTimeActive ? (p.settingsDarkMode ? "#818cf8" : "#4f46e5") : (p.settingsDarkMode ? "#cbd5e1" : "#475569") }}>{label}</Text>
                                              {isTimeActive && <Ionicons name="checkmark" size={16} color={p.settingsDarkMode ? "#818cf8" : "#4f46e5"} />}
                                            </Pressable>
                                          );
                                        })}
                                      </ScrollView>
                                    </View>
                                  </>
                                )}
                              </View>
                              
                              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>Shuffle question order</Text>
                                <ToggleSwitch checked={p.shuffleQuestions} onChange={p.setShuffleQuestions} darkMode={p.settingsDarkMode} />
                              </View>
                              
                              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>Shuffle answer options</Text>
                                <ToggleSwitch checked={p.shuffleAnswers} onChange={p.setShuffleAnswers} darkMode={p.settingsDarkMode} />
                              </View>
                              
                              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>Show answer after submit</Text>
                                <ToggleSwitch checked={p.showAnswerOnSubmit} onChange={p.setShowAnswerOnSubmit} darkMode={p.settingsDarkMode} />
                              </View>
                            </View>
                          </View>
                        )}
                      </React.Fragment>
                    );
                  })}
                </ScrollView>

                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 44 : 36, paddingTop: 16, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
                  <Pressable
                    disabled={questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)}
                    onPress={() => { (p.handleStartQuiz || (() => {}))(); setQuizSetupStep("presets"); }}
                    style={({ pressed }) => [
                      { backgroundColor: "#ffffff", borderRadius: 30, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
                      (questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) && { backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons name="play" size={18} color={(questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) ? (p.settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#000000"} />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: (questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) ? (p.settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#000000" }}>Start Quiz ({questionCount} Qs)</Text>
                  </Pressable>
                </View>
              </>
            </View>
          </KeyboardWrapper>
      </Modal>
      )}

{/* ── View Mode Modal ── */}
      {!!p.pdfViewQuiz && (
      <Modal visible={true} animationType="slide" transparent={false} onRequestClose={() => (p.setPdfViewQuiz || (() => {}))(null)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", backgroundColor: p.settingsDarkMode ? "#0f172a" : "#ffffff" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <Pressable onPress={() => (p.setPdfViewQuiz || (() => {}))(null)} style={({ pressed }) => [{ padding: 8, borderRadius: 10, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }, pressed && styles.opacityPress]}>
                <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.settingsDarkMode ? "#6366f1" : "#6366f1", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 }}>Questions</Text>
                <Text style={{ color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 17, fontWeight: "700" }} numberOfLines={1}>{p.pdfViewQuiz?.title}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {(() => {
                const bookmarkCount = (p.pdfViewQuiz?.questionsList || []).filter((q: any) => p.starredQuestions?.has(q.id)).length;
                return bookmarkCount > 0 ? (
                  <View style={{ backgroundColor: "rgba(99,102,241,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="bookmark" size={13} color="#6366f1" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#6366f1" }}>{bookmarkCount}</Text>
                  </View>
                ) : null;
              })()}
              <Text style={{ color: p.settingsDarkMode ? "#6e727a" : "#999", fontSize: 12 }}>{(p.pdfViewQuiz?.questionsList || []).length} Qs</Text>
            </View>
          </View>

          <FlatList
            data={(() => {
              if (!p.pdfViewQuiz) return [];
              return p.pdfViewQuiz?.questionsList || [];
            })()}
            keyExtractor={(item, index) => String(item.id || index)}
            contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 12, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}
            renderItem={({ item, index }) => (
              <View style={{
                backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff",
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: p.settingsDarkMode ? 0.15 : 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <Text style={{ flex: 1, color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 16, fontWeight: "600", lineHeight: 24 }}>
                    <Text style={{ color: p.settingsDarkMode ? "#888888" : "#888888" }}>#{index + 1} </Text>
                    {item.prompt}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const qId = item.id;
                      if (!qId) return;
                      (p.setStarredQuestions || (() => {}))((prev: any) => {
                        const next = new Set(prev);
                        if (next.has(qId)) next.delete(qId);
                        else next.add(qId);
                        return next;
                      });
                    }}
                    style={({ pressed }) => [{ padding: 6, marginLeft: 8, marginTop: -2, borderRadius: 8 }, pressed && styles.opacityPress]}
                  >
                    <Ionicons
                      name={p.starredQuestions?.has(item.id) ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={p.starredQuestions?.has(item.id) ? "#6366f1" : (p.settingsDarkMode ? "#6e727a" : "#aaaaaa")}
                    />
                  </Pressable>
                </View>

                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 16, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} resizeMode="contain" />
                )}
                <View style={{ gap: 4 }}>
                  {(item.answers || []).map((ans: any, aIndex: number) => {
                    const isCorrect = ans.isCorrect;
                    return (
                      <View key={aIndex} style={{
                        backgroundColor: isCorrect 
                          ? (p.settingsDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)")
                          : "transparent",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          color: isCorrect 
                            ? (p.settingsDarkMode ? "#34d399" : "#059669")
                            : (p.settingsDarkMode ? "#a1a1aa" : "#475569"),
                          fontSize: 15,
                          lineHeight: 22,
                        }}>
                          {ans.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
                <Ionicons name="document-text-outline" size={48} color={p.settingsDarkMode ? "#333333" : "#cccccc"} />
                <Text style={{ marginTop: 12, color: p.settingsDarkMode ? "#888888" : "#666677", fontSize: 16 }}>No questions to display.</Text>
              </View>
            }
          />
        </View>
      </Modal>
      )}




      {/* Add Test Bottom Sheet Modal */}
        {!!p.showAddMenu && (
      <Modal
        visible={true}
        animationType="slide"
        transparent={true}
        onRequestClose={() => (p.setShowAddMenu || (() => {}))(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => (p.setShowAddMenu || (() => {}))(false)}
        >
          <View style={{
            backgroundColor: p.settingsDarkMode ? "#090A0F" : "#F4F4F8",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 44 : 24,
            paddingHorizontal: 16,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>

            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
            </View>

            {/* Block 1 (Main Actions) */}
            <View style={{
              backgroundColor: p.settingsDarkMode ? "#20253B" : "#ffffff",
              borderRadius: 20,
              paddingVertical: 12,
              marginBottom: 16,
            }}>
              {/* Generate with AI */}
              <AnimatedPressable
                onPress={() => {
                (p.setShowAddMenu || (() => {}))(false);
                if (Platform.OS === "web") {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = ".txt,.qst,.pdf,.docx,.md";
                  input.onchange = async (e: any) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      console.log("[Web-Extraction] Extracted raw text length:", text ? text.length : 0);
                      (p.setShowAddMenu || (() => {}))(false);
                      setTimeout(() => (p.handleGenerateWithAI || (() => {}))(text, file.name), 150);
                    };
                    reader.readAsText(file);
                  };
                  input.click();
                } else {
                  setTimeout(async () => {
                    try {
                      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
                      if (!result.canceled && result.assets?.[0]) {
                        const { uri: fileUri, name: fileName, size: fileSize = 0 } = result.assets[0];
                         const ext = fileName.split(".").pop()?.toLowerCase();
                        if (ext === "pdf" && !p.isConnected) { (p.setOfflineModalParams || (() => {}))({ title: "Can't Generate", message: "PDF conversion requires internet." }); return; }
                        if (ext && !["txt", "qst", "md", "docx", "pdf", "ppt", "pptx"].includes(ext)) { Alert.alert("Unsupported File", `Supported: .txt, .docx, .pdf, .ppt, .pptx. Got .${ext}`); return; }
                        (p.setAiGenPhase || (() => {}))("generating");
                        setTimeout(async () => {
                          try {
                            let text = "";
                            if (ext === "pdf") {
                              const pr = await (p.parsePdfFromBackend || (() => {}))(fileUri, fileName, fileSize);
                              if (pr.error) throw new Error(pr.error);
                              text = pr.text;
                            } else if (ext === "ppt" || ext === "pptx") {
                              const pr = await (p.parsePptFromBackend || (() => {}))(fileUri, fileName);
                              if (pr.error) throw new Error(pr.error);
                              text = pr.text;
                            } else if (ext === "docx") {
                              const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                              const res = await mammoth.convertToHtml({ arrayBuffer: Buffer.from(b64, "base64") });
                              text = res.value.replace(/<\/p>/gi, "\n").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
                            } else {
                              text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                            }
                            console.log("[Mobile-Extraction] Extracted raw text length:", text ? text.length : 0);
                            (p.setShowAddMenu || (() => {}))(false);
                            setTimeout(() => (p.handleGenerateWithAI || (() => {}))(text, fileName), 150);
                          } catch (err: any) {
                            (p.setAiGenPhase || (() => {}))(null);
                            Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : getUserErrorMessage(err));
                          }
                        }, 50);
                      }
                    } catch (err: any) { Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : getUserErrorMessage(err)); }
                  }, 350);
                }
              }}
                style={{ paddingVertical: 16, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="albums-outline" size={28} color="#a855f7" />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Create flashcard and quiz</Text>
                  </View>
                </View>
              </AnimatedPressable>

              {/* Create quiz manually */}
              <AnimatedPressable
                onPress={() => {
                (p.setShowAddMenu || (() => {}))(false);
                (p.setCreationMode || (() => {}))("quiz");
                (p.setCreationStep || (() => {}))("setup");
                (p.setActiveTab || (() => {}))("add");
              }}
                style={{ paddingVertical: 16, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="create-outline" size={30} color="#3b82f6" />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.create_manual') || "Create quiz manually"}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </View>

            {/* Block 2 (Folder/Import) */}
            <View style={{
              backgroundColor: p.settingsDarkMode ? "#20253B" : "#ffffff",
              borderRadius: 20,
              paddingVertical: 12,
            }}>
              {/* Import from File */}
              <AnimatedPressable
                onPress={() => {
                (p.setShowAddMenu || (() => {}))(false);
                if (Platform.OS === "web") {
                  if (p.fileInputRef?.current) { p.fileInputRef?.current.click(); }
                } else {
                  // Wait for bottom sheet close animation before launching picker.
                  // Without this, Android swallows/delays the intent on most ROMs.
                  setTimeout(async () => {
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: "*/*",
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled && result.assets && result.assets[0]) {
                        const fileUri = result.assets[0].uri;
                        const fileName = result.assets[0].name;
                        const ext = fileName.split('.').pop()?.toLowerCase();
                        const fileSize = result.assets[0].size || 0;
                        if (ext === 'pdf' && !p.isConnected) {
                          (p.setOfflineModalParams || (() => {}))({
                            title: "Can't Convert PDF",
                            message: "PDF conversion requires an internet connection."
                          });
                          return;
                        }
                        if (ext && !['txt', 'qst', 'md', 'docx', 'pdf', 'ppt', 'pptx'].includes(ext)) {
                          Alert.alert(
                            "Unsupported File",
                            `You can upload only .txt, .docx, .pdf, .ppt, and .pptx files. Your uploaded file is .${ext}`
                          );
                          return;
                        }
                        (p.setIsImporting || (() => {}))(true);
                        setTimeout(async () => {
                          try {
                            let text = "";
                            if (ext === "pdf") {
                              const pdfResult = await (p.parsePdfFromBackend || (() => {}))(fileUri, fileName, fileSize);
                              if (pdfResult.error) {
                                throw new Error(`Backend PDF parsing failed: ${pdfResult.error}`);
                              }
                              text = pdfResult.text;
                            } else if (ext === "ppt" || ext === "pptx") {
                              const pptResult = await (p.parsePptFromBackend || (() => {}))(fileUri, fileName);
                              if (pptResult.error) {
                                if (String(pptResult.error).includes('PAYLOAD_TOO_LARGE') || String(pptResult.error).includes('413')) {
                                  throw new Error("PPT upload limit 4.5 mb, try uploading pdf for a larger size");
                                }
                                throw new Error(`Backend PPT parsing failed: ${pptResult.error}`);
                              }
                              text = pptResult.text;
                            } else if (ext === "docx") {
                              const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                              const buff = Buffer.from(b64, "base64");
                              const result = await mammoth.convertToHtml({ arrayBuffer: buff });
                              let htmlStr = result.value;
                              
                              // Extract images
                              const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
                              let match;
                              let processedHtml = htmlStr;
                              while ((match = imgRegex.exec(htmlStr)) !== null) {
                                const extName = match[1];
                                const base64Data = match[2];
                                const localFileName = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.${extName}`;
                                const localUri = (FileSystem.documentDirectory || "") + localFileName;
                                await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                                processedHtml = processedHtml.replace(match[0], `\n[Image: ${localUri}]\n`);
                              }
                              
                              // Convert remaining HTML to plain text
                              processedHtml = processedHtml.replace(/<\/p>/gi, '\n');
                              processedHtml = processedHtml.replace(/<br\s*\/?>/gi, '\n');
                              processedHtml = processedHtml.replace(/<[^>]+>/g, '');
                              text = processedHtml;
                            } else {
                              text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                            }
                            // Close the overlay FIRST, wait for it to fully dismiss,
                            // THEN show the quiz — otherwise the quiz options panel
                            // gets swallowed by the still-animating loading Modal on Android.
                            (p.setIsImporting || (() => {}))(false);
                            setTimeout(() => (p.handleImportQst || (() => {}))(text, fileName, fileUri), 150);
                          } catch (err: any) {
                            if (ext === "pdf" || ext === "docx" || ext === "ppt" || ext === "pptx") {
                              (p.setIsImporting || (() => {}))(false);
                              Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? `Failed to parse ${ext.toUpperCase()} file.\n\n${err.message}` : getUserErrorMessage(err));
                              return;
                            }
                            try {
                              const textFallback = await FileSystem.readAsStringAsync(fileUri);
                              (p.setIsImporting || (() => {}))(false);
                              setTimeout(() => (p.handleImportQst || (() => {}))(textFallback, fileName, fileUri), 150);
                            } catch (err2: any) {
                              (p.setIsImporting || (() => {}))(false);
                              Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? `Could not read the file. Make sure it is a valid .txt, .docx, or .pdf file.\n\n${err.message}` : getUserErrorMessage(err));
                            }
                          }
                        }, 50);
                      }
                    } catch (err: any) {
                      Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? "Failed to open file picker: " + err.message : getUserErrorMessage(err));
                    }
                  }, 350);
                }
              }}
                style={{ paddingVertical: 16, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="folder-outline" size={28} color={p.settingsDarkMode ? "#e2e8f0" : "#64748b"} />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.import_txt') || "Import file (.txt, .docx, .pdf)"}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </Pressable>
      </Modal>
        )}




      {p.confettiParticles?.length > 0 && (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          {p.confettiParticles?.map((p: any) => {
            let shapeStyle: any = { width: p.size, height: p.size, backgroundColor: p.color };
            if (p.shape === "circle") {
              shapeStyle.borderRadius = p.size / 2;
            } else if (p.shape === "triangle") {
              shapeStyle = {
                width: 0,
                height: 0,
                backgroundColor: "transparent",
                borderStyle: "solid",
                borderLeftWidth: p.size / 2,
                borderRightWidth: p.size / 2,
                borderBottomWidth: p.size,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderBottomColor: p.color,
              };
            }
            
            return (
              <View
                key={p.id}
                style={[
                  {
                    position: "absolute",
                    left: p.x,
                    top: p.y,
                    transform: [{ rotate: `${p.rotation}deg` }],
                  },
                  shapeStyle
                ]}
              />
            );
          })}
        </View>
      )}
      {/* Deck Report Modal */}
      {p.showDeckReport != null && (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => (p.setShowDeckReport || (() => {}))(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { width: "90%", padding: 28 }]}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="trophy-outline" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", textAlign: "center" }}>
                Deck Completed!
              </Text>
              <Text style={{ fontSize: 15, color: p.settingsDarkMode ? "#888899" : "#666677", marginTop: 6, textAlign: "center" }}>
                {p.showDeckReport?.deck?.title}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.2)" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#22c55e", marginBottom: 4 }}>{p.showDeckReport?.attempt?.known || 0}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#22c55e", letterSpacing: 0.5 }}>KNOWN</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#ef4444", marginBottom: 4 }}>{p.showDeckReport?.attempt?.unknown || 0}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#ef4444", letterSpacing: 0.5 }}>STILL LEARNING</Text>
              </View>
            </View>

            <Pressable onPress={() => (p.setShowDeckReport || (() => {}))(null)}
              style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 16, paddingVertical: 16, alignItems: "center", width: "100%" }, pressed && styles.pressedScale]}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      )}

      {/* Flashcard Options Modal */}
      {p.showFlashcardOptions != null && (
      <Modal visible={true} transparent animationType="slide" onRequestClose={() => (p.setShowFlashcardOptions || (() => {}))(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => (p.setShowFlashcardOptions || (() => {}))(null)}>
          <View style={{ backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: 36 }} onStartShouldSetResponder={() => true}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", paddingHorizontal: 20, marginBottom: 12 }}>
              {p.showFlashcardOptions?.title}
            </Text>
            
            <Pressable onPress={() => {
              const deck = p.showFlashcardOptions;
              (p.setEditingDeckId || (() => {}))(deck.id);
              (p.setFcTitle || (() => {}))(deck.title);
              (p.setFcCards || (() => {}))(deck.cards?.length > 0 ? JSON.parse(JSON.stringify(deck.cards)) : [{ front: "", back: "" }]);
              (p.setFcCurrentIdx || (() => {}))(0);
              (p.setCardType || (() => {}))(deck.cardType || "Basic");
              (p.setCreationMode || (() => {}))("pick");
              (p.setActiveTab || (() => {}))("add");
              (p.setShowFlashcardOptions || (() => {}))(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="pencil" size={20} color={p.settingsDarkMode ? "#fff" : "#000"} />
              </View>
              <Text style={{ fontSize: 15, color: p.settingsDarkMode ? "#fff" : "#000" }}>Edit Deck</Text>
            </Pressable>

            <Pressable onPress={() => {
              (p.setViewingInsightsDeck || (() => {}))(p.showFlashcardOptions);
              (p.setActiveTab || (() => {}))("dashboard");
              (p.setShowFlashcardOptions || (() => {}))(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bar-chart-outline" size={20} color={p.settingsDarkMode ? "#fff" : "#000"} />
              </View>
              <Text style={{ fontSize: 15, color: p.settingsDarkMode ? "#fff" : "#000" }}>Statistics</Text>
            </Pressable>

            <Pressable onPress={() => {
              const deckId = p.showFlashcardOptions?.id;
              const neonId = p.showFlashcardOptions?.neonId;
              (p.setFlashcardDecks || (() => {}))((p.flashcardDecks || []).filter((d: any) => d.id !== deckId));
              if (p.firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                (p.deleteFlashcardDeck || (() => {}))(p.firebaseUser?.uid, neonId).catch((err: any) => console.warn("[NeonSync] deck delete failed:", err));
              }
              (p.setShowFlashcardOptions || (() => {}))(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 15, color: "#ef4444" }}>Delete Deck</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      )}

      {!!p.showLanguageModal && (
      <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => (p.setShowLanguageModal || (() => {}))(false)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0B0F1E" : "#f0f2f5" }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "600", color: p.settingsDarkMode ? "#fff" : "#111" }}>Language</Text>
              <Pressable onPress={() => (p.setShowLanguageModal || (() => {}))(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={p.settingsDarkMode ? "#fff" : "#111"} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: p.settingsDarkMode ? "#141930" : "#ffffff", borderRadius: 8, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)" }}>
                <TextInput
                  placeholder="Search"
                  placeholderTextColor={p.settingsDarkMode ? "#64748b" : "#94a3b8"}
                  style={{ flex: 1, color: p.settingsDarkMode ? "#fff" : "#000", fontSize: 15 }}
                  value={p.languageSearch}
                  onChangeText={p.setLanguageSearch}
                />
              </View>
              <View style={{ height: 2, backgroundColor: "#6366f1", marginTop: -2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
            </View>

            {/* List */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
              {APP_LANGUAGES.filter(l => l.name.toLowerCase().includes((p.languageSearch || "").toLowerCase()) || l.nativeName.toLowerCase().includes((p.languageSearch || "").toLowerCase())).map((l, idx) => {
                const isSelected = (l.id === 'system' && !p.savedAppLanguage) || (p.savedAppLanguage === l.code && l.id !== 'system');
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      if (l.id === "system") {
                        AsyncStorage.removeItem("user-language");
                        (p.setSavedAppLanguage || (() => {}))(null);
                        i18n.changeLanguage("en"); // fallback to en or device locale
                      } else {
                        i18n.changeLanguage(l.code);
                        AsyncStorage.setItem("user-language", l.code);
                        (p.setSavedAppLanguage || (() => {}))(l.code);
                      }
                      (p.setShowLanguageModal || (() => {}))(false);
                    }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      {l.id === 'system' ? (
                        <View style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: p.settingsDarkMode ? "#334155" : "#cbd5e1", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "bold", color: p.settingsDarkMode ? "#fff" : "#000" }}>A文</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                      )}
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>
                          {l.id === 'system' ? l.name : l.nativeName || l.name}
                        </Text>
                        {l.id !== 'system' && (
                          <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>{l.name}</Text>
                        )}
                      </View>
                    </View>
                    {/* Radio Button */}
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? "#6366f1" : (p.settingsDarkMode ? "#64748b" : "#cbd5e1"), alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#6366f1" }} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Bottom Info Card */}
            <View style={{ margin: 20, padding: 16, borderRadius: 16, backgroundColor: p.settingsDarkMode ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.1)", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(217,119,6,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="information" size={18} color="#d97706" />
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: p.settingsDarkMode ? "#fbbf24" : "#b45309", lineHeight: 18 }}>
                If you have remarks on the translations, please feel free to write to the mail with suggestions for improvement.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      )}

      {/* ── Battle Result Modal ── */}
      {!!p.battlePopup && (
      <Modal visible={true} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          {p.battlePopup && (
            <View style={{
              width: "100%", maxWidth: 360,
              backgroundColor: p.settingsDarkMode ? "#1e1e2e" : "#ffffff",
              borderRadius: 24, padding: 32, alignItems: "center",
              borderWidth: 1, borderColor: p.battlePopup?.won ? "rgba(34,197,94,0.4)" : (p.settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")
            }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: p.battlePopup?.won ? "rgba(34,197,94,0.15)" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "rgba(99,102,241,0.15)" : "rgba(239,68,68,0.15)"),
                alignItems: "center", justifyContent: "center", marginBottom: 20
              }}>
                <Text style={{ fontSize: 40 }}>{p.battlePopup?.won ? "🏆" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "🤝" : "💀")}</Text>
              </View>
              
              <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8,
                color: p.battlePopup?.won ? "#22c55e" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "#6366f1" : "#ef4444") }}>
                {p.battlePopup?.won ? "VICTORY!" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "DRAW!" : "DEFEATED")}
              </Text>
              
              <Text style={{ fontSize: 16, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginBottom: 24, textAlign: "center" }}>
                Battle against <Text style={{ fontWeight: "700", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{p.battlePopup?.opponentName}</Text>
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", marginBottom: (p.battlePopup?.myScore === p.battlePopup?.opponentScore) ? 16 : 32 }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 12, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" }}>You</Text>
                  <Text style={{ fontSize: 36, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14" }}>{p.battlePopup?.myScore}</Text>
                </View>
                <View style={{ paddingHorizontal: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: p.settingsDarkMode ? "#475569" : "#cbd5e1" }}>VS</Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 12, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" }}>Opponent</Text>
                  <Text style={{ fontSize: 36, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14" }}>{p.battlePopup?.opponentScore}</Text>
                </View>
              </View>

              {p.battlePopup?.myScore === p.battlePopup?.opponentScore && p.battlePopup.myTime !== undefined && p.battlePopup.opponentTime !== undefined && (
                <View style={{ backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 24, width: "100%", alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: p.battlePopup?.won ? "#22c55e" : "#ef4444", marginBottom: 4 }}>
                    Tie Breaker
                  </Text>
                  <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#cbd5e1" : "#475569", textAlign: "center" }}>
                    You finished in <Text style={{ fontWeight: "700", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{(p.battlePopup.myTime / 1000).toFixed(1)}s</Text>,
                    while they took <Text style={{ fontWeight: "700", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{(p.battlePopup.opponentTime / 1000).toFixed(1)}s</Text>.
                  </Text>
                </View>
              )}
              
              <Pressable
                onPress={() => (p.setBattlePopup || (() => {}))(null)}
                style={({ pressed }) => [{
                  backgroundColor: p.battlePopup?.won ? "#22c55e" : (p.settingsDarkMode ? "#334155" : "#e2e8f0"),
                  paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center"
                }, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: p.battlePopup?.won ? "#fff" : (p.settingsDarkMode ? "#fff" : "#0f172a") }}>{p.battlePopup?.won ? "Awesome!" : "Close"}</Text>
              </Pressable>
            </View>
          )}
          {p.confettiParticles?.length > 0 && p.battlePopup && (
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
              {p.confettiParticles?.map((p: any) => {
                let shapeStyle: any = { width: p.size, height: p.size, backgroundColor: p.color };
                if (p.shape === "circle") {
                  shapeStyle.borderRadius = p.size / 2;
                } else if (p.shape === "triangle") {
                  shapeStyle = {
                    width: 0, height: 0, backgroundColor: "transparent", borderStyle: "solid",
                    borderLeftWidth: p.size / 2, borderRightWidth: p.size / 2, borderBottomWidth: p.size,
                    borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: p.color
                  };
                }
                return (
                  <View key={p.id} style={[
                    { position: "absolute", left: "50%", top: p.y, marginLeft: p.x - p.size / 2 },
                    shapeStyle, { transform: [{ rotate: `${p.rotation}deg` }] }
                  ]} />
                );
              })}
            </View>
          )}
        </View>
      </Modal>
      )}

    </>
  );
}
