import React from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { styles } from '../../styles/shared';
import type { HomeScreenProps } from "../../types/HomeScreenProps";

// ── Reset Statistics Confirmation Modal ──
export function ResetStatsModal({ p }: { p: HomeScreenProps }) {
  if (!p.showResetConfirm) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowResetConfirm || (() => {}))(false)}>
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowResetConfirm || (() => {}))(false)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="refresh-circle-outline" size={28} color="#ef4444" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: '#ef4444' }]}>Reset Statistics</Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', marginBottom: 20, lineHeight: 20 }]}>
            Are you sure you want to clear all attempt history and statistics? This cannot be undone.
          </Text>
          <View style={styles.dialogButtons}>
            <Pressable
              onPress={() => (p.setShowResetConfirm || (() => {}))(false)}
              style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0,0,0,0.15)' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                (p.setQuizzes || (() => {}))((p.quizzes || []).map((q: any) => ({ ...q, attempts: [], wrongQuestions: [], uniqueCorrectIds: [] })));
                if (p.firebaseUser) {
                  (p.quizzes || []).forEach((q: any) => {
                    const neonId = q.neonId ?? q.id;
                    if (neonId && !String(neonId).startsWith('local_')) {
                      ((p.updateMobileQuiz || (async () => {})) as (payload: any) => Promise<void>)({
                        userId: p.firebaseUser?.uid,
                        quizId: neonId,
                        attempts: [],
                        wrongQuestions: [],
                        uniqueCorrectIds: [],
                      }).catch((err: any) => console.warn('[NeonSync] quiz reset failed:', err));
                    }
                  });
                }
                (p.setShowResetConfirm || (() => {}))(false);
              }}
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogConfirmText, { color: '#ffffff' }]}>Reset</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Logout Confirm ──
export function LogoutConfirmModal({ p }: { p: HomeScreenProps }) {
  if (!p.showLogoutConfirm) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowLogoutConfirm || (() => {}))(false)}>
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowLogoutConfirm || (() => {}))(false)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
            <Ionicons name="log-out-outline" size={28} color="#6366f1" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Log Out</Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', marginBottom: 20, lineHeight: 20 }]}>
            Are you sure you want to log out of your account?
          </Text>
          <View style={styles.dialogButtons}>
            <AnimatedPressable
              onPress={() => (p.setShowLogoutConfirm || (() => {}))(false)}
              style={[styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0,0,0,0.15)' }]}
            >
              <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                (p.setShowLogoutConfirm || (() => {}))(false);
                if (p.handleLogout) p.handleLogout();
              }}
              style={[styles.dialogConfirm, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]}
            >
              <Text style={[styles.dialogConfirmText, { color: '#ffffff' }]}>Log Out</Text>
            </AnimatedPressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Delete Account Confirm ──
export function DeleteAccountModal({ p }: { p: HomeScreenProps }) {
  if (!p.showDeleteAccountConfirm) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowDeleteAccountConfirm || (() => {}))(false)}>
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowDeleteAccountConfirm || (() => {}))(false)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="warning-outline" size={28} color="#ef4444" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: '#ef4444' }]}>Delete Account</Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', marginBottom: 20, lineHeight: 20 }]}>
            Are you sure you want to permanently delete your account and all associated data? This action cannot be undone.
          </Text>
          <View style={styles.dialogButtons}>
            <AnimatedPressable
              onPress={() => (p.setShowDeleteAccountConfirm || (() => {}))(false)}
              disabled={p.deleteAccountLoading}
              style={[styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0,0,0,0.15)' }]}
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
                    (p.setActiveTab || (() => {}))('home');
                  } catch (e) {
                    console.warn('Failed to delete account', e);
                    alert('Please re-authenticate and try again. For security, you must have signed in recently to delete your account.');
                    (p.setShowDeleteAccountConfirm || (() => {}))(false);
                  } finally {
                    (p.setDeleteAccountLoading || (() => {}))(false);
                  }
                }
              }}
              disabled={p.deleteAccountLoading}
              style={[styles.dialogConfirm, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }]}
            >
              {p.deleteAccountLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.dialogConfirmText, { color: '#ffffff' }]}>Delete</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Quit Quiz Confirm ──
export function QuitQuizModal({ p }: { p: HomeScreenProps }) {
  if (!p.showQuitConfirm) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowQuitConfirm || (() => {}))(false)}>
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowQuitConfirm || (() => {}))(false)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 24 }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
            <Ionicons name="warning-outline" size={30} color="#f59e0b" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>
            {p.activeSession?.isBattle ? 'Submit and Exit Now?' : 'Quit Quiz?'}
          </Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', lineHeight: 20, marginBottom: 24 }]}>
            {p.activeSession?.isBattle ? 'Your current score will be submitted to the battle.' : 'Your attempted questions will be saved as a completed session.'}
          </Text>
          <View style={styles.dialogButtons}>
            <Pressable
              onPress={() => (p.setShowQuitConfirm || (() => {}))(false)}
              style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0,0,0,0.15)' }, pressed && styles.pressedScale]}
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
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: p.activeSession?.isBattle ? '#10b981' : '#f59e0b' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogConfirmText, { color: p.activeSession?.isBattle ? '#ffffff' : '#000' }]}>
                {p.activeSession?.isBattle ? 'Submit & Exit' : 'Save & Exit'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Restart Quiz Confirm ──
export function RestartQuizModal({ p }: { p: HomeScreenProps }) {
  if (!p.showRestartConfirm) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowRestartConfirm || (() => {}))(false)}>
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowRestartConfirm || (() => {}))(false)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 24 }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(99,102,241,0.12)' }]}>
            <Ionicons name="refresh" size={30} color="#6366f1" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Restart Quiz?</Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', lineHeight: 20, marginBottom: 24 }]}>
            This will erase all your current answers and let you start over.
          </Text>
          <View style={styles.dialogButtons}>
            <Pressable
              onPress={() => (p.setShowRestartConfirm || (() => {}))(false)}
              style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0,0,0,0.15)' }, pressed && styles.pressedScale]}
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
                  startedAt: Date.now(),
                });
                p.quizFlatListRef?.current?.scrollToIndex({ index: 0, animated: false });
                p.quizNumbersScrollRef?.current?.scrollTo({ x: 0, animated: false });
              }}
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: '#6366f1' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogConfirmText, { color: '#ffffff' }]}>Restart</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Quiz Created Success Modal ──
export function QuizCreatedModal({ p }: { p: HomeScreenProps }) {
  if (p.showQuizCreatedModal == null) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowQuizCreatedModal || (() => {}))(null)}>
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowQuizCreatedModal || (() => {}))(null)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 28 }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(0, 229, 160, 0.12)' }]}>
            <Ionicons name="checkmark-circle" size={36} color="#00e5a0" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Quiz Created!</Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', lineHeight: 20, marginBottom: 20 }]}>
            <Text style={{ color: p.settingsDarkMode ? '#ffffff' : '#0d0f14', fontWeight: '700' }}>"{p.showQuizCreatedModal?.title}"</Text>
            {' '}was created successfully with{' '}
            <Text style={{ color: '#00e5a0', fontWeight: '700' }}>{p.showQuizCreatedModal?.count} questions</Text>
            . Ready to practice!
          </Text>
          <Pressable
            onPress={() => (p.setShowQuizCreatedModal || (() => {}))(null)}
            style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: '#00e5a0', width: '100%' }, pressed && styles.pressedScale]}
          >
            <Text style={styles.dialogConfirmText}>Start Practicing →</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
