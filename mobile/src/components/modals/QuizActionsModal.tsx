import React from 'react';
import { Modal, View, Text, Pressable, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../ui/AnimatedPressable';
import { styles } from '../../styles/shared';

export function QuizActionsModal({ p }: { p: any }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (p.showQuizActions == null) return null;
  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={() => (p.setShowQuizActions || (() => {}))(null)}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
        onPress={() => (p.setShowQuizActions || (() => {}))(null)}
      >
        <View style={{
          backgroundColor: p.settingsDarkMode ? '#0d1a2e' : '#ffffff',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          paddingBottom: Platform.OS === 'ios' ? 36 : 24,
          overflow: 'hidden',
        }} onStartShouldSetResponder={() => true}>
          {/* Drag handle + title */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, marginBottom: 14,
              backgroundColor: p.settingsDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
            <Text style={{ fontSize: 16, fontWeight: '700', color: p.settingsDarkMode ? '#ffffff' : '#0d0f14' }}
              numberOfLines={1}>
              {p.showQuizActions?.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#6e727a', marginTop: 3 }}>
              {p.showQuizActions?.questions} {t('actions.questions') || 'Questions'}
            </Text>
          </View>

          <View style={{ height: 0.5, backgroundColor: p.settingsDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', marginTop: 12 }} />

          {/* View (PDF Mode) */}
          <AnimatedPressable
            onPress={() => {
              const quiz = p.showQuizActions;
              (p.setPdfViewQuiz || (() => {}))(quiz);
              (p.setShowQuizActions || (() => {}))(null);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24 }}
            scaleTo={0.97}
          >
            <Ionicons name="eye-outline" size={22} color={p.settingsDarkMode ? '#ffffff' : '#0d0f14'} />
            <Text style={{ fontSize: 15, fontWeight: '500', flex: 1, color: p.settingsDarkMode ? '#ffffff' : '#0d0f14' }}>{t('actions.view') || 'View'}</Text>
          </AnimatedPressable>

          {/* Rename */}
          <AnimatedPressable
            onPress={() => {
              const quiz = p.showQuizActions;
              (p.setShowQuizActions || (() => {}))(null);
              (p.setRenamingQuiz || (() => {}))(quiz);
              (p.setRenameTitle || (() => {}))(quiz.title);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24 }}
            scaleTo={0.97}
          >
            <Ionicons name="pencil-outline" size={22} color={p.settingsDarkMode ? '#ffffff' : '#0d0f14'} />
            <Text style={{ fontSize: 15, fontWeight: '500', flex: 1, color: p.settingsDarkMode ? '#ffffff' : '#0d0f14' }}>{t('actions.rename') || 'Rename'}</Text>
          </AnimatedPressable>

          {/* Challenge a friend */}
          <AnimatedPressable
            onPress={() => {
              const quiz = p.showQuizActions;
              (p.setShowQuizActions || (() => {}))(null);
              if (p.appConfig?.featureFlags?.disableBattles) {
                Alert.alert(
                  t('battle.cant_join') || 'Battles Temporarily Unavailable',
                  t('battle.battles_disabled') || 'Battle Arena is currently disabled while we perform maintenance. Please try again shortly.'
                );
                return;
              }
              (p.handleHostBattle || (() => {}))(quiz.id, 'insights');
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24 }}
            scaleTo={0.97}
          >
            <Ionicons name="flame-outline" size={22} color={p.settingsDarkMode ? '#ffffff' : '#0d0f14'} />
            <Text style={{ fontSize: 15, fontWeight: '500', flex: 1, color: p.settingsDarkMode ? '#ffffff' : '#0d0f14' }}>
              {t('battle.challenge_friend') || 'Challenge a friend'}
            </Text>
          </AnimatedPressable>

          {/* Clear Attempts */}
          <AnimatedPressable
            onPress={() => {
              const quiz = p.showQuizActions;
              (p.setShowQuizActions || (() => {}))(null);
              if (Platform.OS === 'web') {
                if (confirm('Reset attempts for this quiz?')) {
                  (p.handleClearHistoryOnMobile || (() => {}))(quiz.id);
                }
              } else {
                Alert.alert('Reset', 'Reset history for this quiz?', [
                  { text: t('common.cancel') || 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => (p.handleClearHistoryOnMobile || (() => {}))(quiz.id) }
                ]);
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24 }}
            scaleTo={0.97}
          >
            <Ionicons name="refresh-outline" size={22} color={p.settingsDarkMode ? '#ffffff' : '#0d0f14'} />
            <Text style={{ fontSize: 15, fontWeight: '500', flex: 1, color: p.settingsDarkMode ? '#ffffff' : '#0d0f14' }}>
              {t('actions.clear_attempts') || 'Clear attempts'}
            </Text>
          </AnimatedPressable>

          <View style={{ height: 0.5, backgroundColor: p.settingsDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', marginHorizontal: 24 }} />

          {/* Delete */}
          <AnimatedPressable
            onPress={() => {
              (p.setDeletingQuizConfirm || (() => {}))(p.showQuizActions);
              (p.setShowQuizActions || (() => {}))(null);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, paddingHorizontal: 24, marginBottom: insets.bottom + 10 }}
            scaleTo={0.97}
          >
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
            <Text style={{ fontSize: 15, fontWeight: '500', flex: 1, color: '#ef4444' }}>{t('actions.delete') || 'Delete'}</Text>
          </AnimatedPressable>
        </View>
      </Pressable>
    </Modal>
  );
}
