import React from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, ActivityIndicator, Animated, Platform, FlatList, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../../styles/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import type { HomeScreenProps } from "../../types/HomeScreenProps";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const closeOrDismiss = (fn: () => void) => fn();
const KeyboardWrapper = Platform.OS === "ios" ? require("react-native").KeyboardAvoidingView : View;

/**
 * Quiz actions bottom sheet + import loading modal
 */
export function QuizActionsSheet({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  return (
    <>
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
                paddingVertical: 14, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <Ionicons name="eye-outline" size={22} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              <Text style={{ fontSize: 15, fontWeight: "500", flex: 1,
                color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('actions.view') || "View"}</Text>
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
                paddingVertical: 14, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <Ionicons name="pencil-outline" size={22} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              <Text style={{ fontSize: 15, fontWeight: "500", flex: 1,
                color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('actions.rename') || "Rename"}</Text>
            </AnimatedPressable>

            {/* Challenge a friend */}
            <AnimatedPressable
              onPress={() => {
                const quiz = p.showQuizActions;
                (p.setShowQuizActions || (() => {}))(null);
                if (p.appConfig?.featureFlags?.disableBattles) {
                  Alert.alert(
                    t('battle.cant_join') || "Battles Temporarily Unavailable",
                    t('battle.battles_disabled') || "Battle Arena is currently disabled while we perform maintenance. Please try again shortly."
                  );
                  return;
                }
                (p.handleHostBattle || (() => {}))(quiz.id, "insights");
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 14, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <Ionicons name="flame-outline" size={22} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              <Text style={{ fontSize: 15, fontWeight: "500", flex: 1, color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                {t('battle.challenge_friend') || "Challenge a friend"}
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
                    { text: t('common.cancel') || "Cancel", style: "cancel" },
                    { text: "Reset", style: "destructive", onPress: () => (p.handleClearHistoryOnMobile || (() => {}))(quiz.id) }
                  ]);
                }
              }}
              style={{
                flexDirection: "row", alignItems: "center", gap: 16,
                paddingVertical: 14, paddingHorizontal: 24,
              }}
              scaleTo={0.97}
            >
              <Ionicons name="refresh-outline" size={22} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              <Text style={{ fontSize: 15, fontWeight: "500", flex: 1, color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>
                {t('actions.clear_attempts') || "Clear attempts"}
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
                paddingVertical: 14, paddingHorizontal: 24,
                marginBottom: insets.bottom + 10
              }}
              scaleTo={0.97}
            >
              <Ionicons name="trash-outline" size={22} color="#ef4444" />
              <Text style={{ fontSize: 15, fontWeight: "500", flex: 1, color: "#ef4444" }}>{t('actions.delete') || "Delete"}</Text>
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
                {t('actions.rename_quiz') || "Rename Quiz"}
              </Text>
              <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", marginBottom: 16 }]}>
                {t('actions.enter_new_title') || "Enter a new title"}
              </Text>

              <Pressable style={[styles.webInputDummy, { width: "100%", marginBottom: 20 }, !p.settingsDarkMode && styles.lightInput]}>
                <TextInput
                  autoFocus
                  placeholder={t('actions.rename_quiz') || "Quiz Title"}
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
                  <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>{t('common.cancel') || "Cancel"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if ((p.renameTitle || "").trim() && p.renamingQuiz) {
                      const newTitle = (p.renameTitle || "").trim();
                      (p.setQuizzes || (() => {}))((p.quizzes || []).map((q: any) => q.id === p.renamingQuiz.id ? { ...q, title: newTitle } : q));
                      // Sync rename to Neon if logged in
                      const neonId = p.renamingQuiz.neonId ?? p.renamingQuiz.id;
                      if (p.firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                        (p.updateMobileQuiz || (() => {}))({
                          userId: p.firebaseUser?.uid,
                          quizId: neonId,
                          title: newTitle
                        }).catch((err: any) => console.warn("[NeonSync] quiz rename failed:", err));
                      }
                      if (p.setViewingInsightsQuiz) {
                        p.setViewingInsightsQuiz((prev: any) => prev && (prev.id === p.renamingQuiz.id || prev.id === neonId) ? { ...prev, title: newTitle } : prev);
                      }
                      if (p.setActiveSession) {
                        p.setActiveSession((prev: any) => prev && (prev.quizId === p.renamingQuiz.id || prev.quizId === neonId) ? { ...prev, quizTitle: newTitle } : prev);
                      }
                      if (p.setSelectedQuiz) {
                        p.setSelectedQuiz((prev: any) => prev && (prev.id === p.renamingQuiz.id || prev.id === neonId) ? { ...prev, title: newTitle } : prev);
                      }
                      (p.setRenamingQuiz || (() => {}))(null);
                      (p.setRenameTitle || (() => {}))("");
                    }
                  }}
                  style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#00e5a0" }, pressed && styles.pressedScale]}
                >
                  <Text style={styles.dialogConfirmText}>{t('common.save') || "Save"}</Text>
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
              Are you sure you want to delete this quiz?
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
    </>
  );
}
