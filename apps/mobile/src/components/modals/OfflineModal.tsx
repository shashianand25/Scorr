import React from 'react';
import { Modal, View, Text, Pressable, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeScreenProps } from "../../types/HomeScreenProps";

export function OfflineModal({ p }: { p: any }) {
  if (!p.offlineModalParams) return null;
  return (
    <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setOfflineModalParams || (() => {}))(null)}>
      <Pressable
        style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
        onPress={() => (p.setOfflineModalParams || (() => {}))(null)}
      >
        <View style={{
          backgroundColor: p.settingsDarkMode ? 'rgba(22, 24, 31, 0.95)' : '#ffffff',
          borderRadius: 28,
          padding: 32,
          width: Dimensions.get('window').width * 0.85,
          maxWidth: 340,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 10,
          borderWidth: 1,
          borderColor: p.settingsDarkMode ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
        }} onStartShouldSetResponder={() => true}>

          <View style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: p.settingsDarkMode ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
            borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.25)',
          }}>
            <Ionicons name="cloud-offline" size={32} color="#ef4444" />
          </View>

          <Text style={{
            fontSize: 22, fontWeight: '800',
            color: p.settingsDarkMode ? '#ffffff' : '#0f172a',
            letterSpacing: -0.4, marginBottom: 12, textAlign: 'center',
          }}>
            {p.offlineModalParams?.title}
          </Text>

          <Text style={{
            fontSize: 16,
            color: p.settingsDarkMode ? '#cbd5e1' : '#475569',
            textAlign: 'center', marginBottom: 32, lineHeight: 24, fontWeight: '400',
          }}>
            {p.offlineModalParams?.message}
          </Text>

          <View style={{ width: '100%', gap: 12 }}>
            {p.offlineModalParams?.buttons ? (
              p.offlineModalParams?.buttons.map((btn: any, idx: number) => (
                <Pressable
                  key={idx}
                  onPress={() => {
                    (p.setOfflineModalParams || (() => {}))(null);
                    btn.onPress();
                  }}
                  style={({ pressed }) => [
                    { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%' },
                    btn.isPrimary ? { backgroundColor: '#ef4444' } : { backgroundColor: p.settingsDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
                  ]}
                >
                  <Text style={[{ fontSize: 16, fontWeight: '700' }, btn.isPrimary ? { color: '#ffffff' } : { color: p.settingsDarkMode ? '#e2e8f0' : '#334155' }]}>
                    {btn.text}
                  </Text>
                </Pressable>
              ))
            ) : (
              <Pressable
                onPress={() => (p.setOfflineModalParams || (() => {}))(null)}
                style={({ pressed }) => [
                  { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: '#ef4444', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#ffffff', letterSpacing: 0.3 }}>OK</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}
