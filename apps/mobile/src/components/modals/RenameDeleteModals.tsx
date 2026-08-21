import React from 'react';
import { Modal, View, Text, Pressable, Platform, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { styles } from '../../styles/shared';
import type { HomeScreenProps } from "../../types/HomeScreenProps";

const KeyboardWrapper = Platform.OS === 'ios'
  ? require('react-native').KeyboardAvoidingView
  : require('react-native').View;

// ── Rename Quiz Modal ──
export function RenameQuizModal({ p }: { p: any }) {
  const { t } = useTranslation();
  if (p.renamingQuiz == null) return null;
  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {
        const dismiss = () => (p.setRenamingQuiz || (() => {}))(null);
        const { Keyboard } = require('react-native');
        if (Keyboard.isVisible()) { Keyboard.dismiss(); } else { dismiss(); }
      }}
    >
      <KeyboardWrapper behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setRenamingQuiz || (() => {}))(null)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: 'rgba(99, 102, 241, 0.12)' }]}>
              <Ionicons name="create-outline" size={28} color="#6366f1" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>
              {t('actions.rename_quiz') || 'Rename Quiz'}
            </Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', marginBottom: 16 }]}>
              {t('actions.enter_new_title') || 'Enter a new title'}
            </Text>
            <Pressable style={[styles.webInputDummy, { width: '100%', marginBottom: 20 }, !p.settingsDarkMode && styles.lightInput]}>
              <TextInput
                autoFocus
                placeholder={t('actions.rename_quiz') || 'Quiz Title'}
                placeholderTextColor="#666"
                style={[styles.formInput, !p.settingsDarkMode && styles.lightText]}
                value={p.renameTitle}
                onChangeText={p.setRenameTitle}
              />
            </Pressable>
            <View style={styles.dialogButtons}>
              <Pressable
                onPress={() => (p.setRenamingQuiz || (() => {}))(null)}
                style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0, 0, 0, 0.15)' }, pressed && styles.pressedScale]}
              >
                <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>{t('common.cancel') || 'Cancel'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if ((p.renameTitle || '').trim() && p.renamingQuiz) {
                    const newTitle = (p.renameTitle || '').trim();
                    (p.setQuizzes || (() => {}))((p.quizzes || []).map((q: any) => q.id === p.renamingQuiz.id ? { ...q, title: newTitle } : q));
                    const neonId = p.renamingQuiz.neonId ?? p.renamingQuiz.id;
                    if (p.firebaseUser && neonId && !String(neonId).startsWith('local_')) {
                      (p.updateMobileQuiz || (() => {}))({
                        userId: p.firebaseUser?.uid,
                        quizId: neonId,
                        title: newTitle,
                      }).catch((err: any) => console.warn('[NeonSync] quiz rename failed:', err));
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
                    (p.setRenameTitle || (() => {}))('');
                  }
                }}
                style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: '#00e5a0' }, pressed && styles.pressedScale]}
              >
                <Text style={styles.dialogConfirmText}>{t('common.save') || 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </KeyboardWrapper>
    </Modal>
  );
}

// ── Importing Loading Overlay ──
export function ImportLoadingModal({ p }: { p: any }) {
  if (!p.isImporting) return null;
  return (
    <Modal visible={true} animationType="fade" transparent={true}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#1a1b2e', borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, minWidth: 200 }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>Importing Quiz...</Text>
          <Text style={{ color: '#888', fontSize: 13, textAlign: 'center' }}>Parsing your questions</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Import Error Modal ──
export function ImportErrorModal({ p }: { p: any }) {
  const { t } = useTranslation();
  if (p.importErrorDetails == null) return null;
  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={() => (p.setImportErrorDetails || (() => {}))(null)}
    >
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setImportErrorDetails || (() => {}))(null)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="warning-outline" size={28} color="#ef4444" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: '#ef4444' }]}>
            {p.importErrorDetails?.title}
          </Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', marginBottom: 12, lineHeight: 18 }]}>
            {p.importErrorDetails?.message}
          </Text>
          {p.importErrorDetails?.details ? (
            <Text style={[{ fontSize: 11, color: '#888888', fontStyle: 'italic', marginBottom: 16, textAlign: 'center' }, !p.settingsDarkMode && styles.lightTextSub]}>
              (Error: {p.importErrorDetails?.details})
            </Text>
          ) : null}
          <View style={styles.dialogButtons}>
            <Pressable
              onPress={() => (p.setImportErrorDetails || (() => {}))(null)}
              style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0, 0, 0, 0.15)' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightTextSub]}>No Thanks</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                (p.setImportErrorDetails || (() => {}))(null);
                (p.setActiveTab || (() => {}))('guide');
              }}
              style={({ pressed }) => [styles.dialogConfirm, pressed && styles.pressedScale]}
            >
              <Text style={styles.dialogConfirmText}>Watch Video</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Delete Quiz Confirmation Modal ──
export function DeleteQuizModal({ p }: { p: any }) {
  const insets = useSafeAreaInsets();
  if (p.deletingQuizConfirm == null) return null;
  return (
    <Modal
      visible={true}
      animationType="fade"
      transparent={true}
      onRequestClose={() => (p.setDeletingQuizConfirm || (() => {}))(null)}
    >
      <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setDeletingQuizConfirm || (() => {}))(null)}>
        <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal]} onStartShouldSetResponder={() => true}>
          <View style={[styles.dialogIcon, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Ionicons name="trash-outline" size={28} color="#ef4444" />
          </View>
          <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText, { color: '#ef4444' }]}>Delete Quiz</Text>
          <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: 'center', marginBottom: 20, lineHeight: 18 }]}>
            Are you sure you want to delete this quiz?
          </Text>
          <View style={styles.dialogButtons}>
            <Pressable
              onPress={() => (p.setDeletingQuizConfirm || (() => {}))(null)}
              style={({ pressed }) => [styles.dialogCancel, !p.settingsDarkMode && { borderColor: 'rgba(0, 0, 0, 0.15)' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogCancelText, !p.settingsDarkMode && styles.lightText]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (p.deletingQuizConfirm) {
                  if (p.deletingQuizConfirm.id === 'sample_quiz') {
                    (p.setSampleDismissed || (() => {}))(true);
                    AsyncStorage.setItem('quizforge_sample_dismissed', '1');
                    (p.setDeletingQuizConfirm || (() => {}))(null);
                    return;
                  }
                  AsyncStorage.getItem(`quiz_file_${p.deletingQuizConfirm.id}`).then(uri => {
                    if (uri) { FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); }
                    AsyncStorage.removeItem(`quiz_file_${p.deletingQuizConfirm.id}`).catch(() => {});
                  }).catch(() => {});
                  (p.setQuizzes || (() => {}))((p.quizzes || []).filter((q: any) => q.id !== p.deletingQuizConfirm.id));
                  (p.setViewingInsightsQuiz || (() => {}))(null);
                  (p.setActiveTab || (() => {}))(p.viewingInsightsQuizFromTab as any || 'home');
                  (p.setDeletingQuizConfirm || (() => {}))(null);
                  const neonId = p.deletingQuizConfirm.neonId ?? p.deletingQuizConfirm.id;
                  if (p.firebaseUser && neonId && !String(neonId).startsWith('local_')) {
                    (p.deleteMobileQuiz || (() => {}))(p.firebaseUser?.uid, neonId).catch((err: any) =>
                      console.warn('[NeonSync] quiz delete failed:', err)
                    );
                  }
                }
              }}
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: '#ef4444', shadowColor: '#ef4444' }, pressed && styles.pressedScale]}
            >
              <Text style={[styles.dialogConfirmText, { color: '#ffffff' }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
