import { AnimatedPressable } from "../ui/AnimatedPressable";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { generateMockQuestionsForQuiz } from "../../utils/quiz";
import { SAMPLE_QUIZ } from "../../constants/sample-quiz";
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
 * AccountConfirmModals — Reset, logout, and delete account confirmation modals.
 * Extracted from SessionConfirmationModals for smaller file size.
 */
export function AccountConfirmModals({ p }: { p: any }) {
  const { t } = useTranslation();
  const insets = p.insets || { top: 0, bottom: 0, left: 0, right: 0 };
  return (
    <>
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
    </>
  );
}
