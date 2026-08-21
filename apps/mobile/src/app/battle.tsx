import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, SafeAreaView, Platform, StatusBar, KeyboardAvoidingView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function BattleScreen() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={[styles.iconButton, styles.blueBg]} onPress={() => router.back()}>
              <Feather name="square" size={18} color="#7BA4D9" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="square" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Title Area */}
          <View style={styles.titleArea}>
            <Text style={styles.title}>Quiz Clash</Text>
            <Text style={styles.subtitle}>
              Challenge friends to real-time{'\n'}multiplayer battles
            </Text>
          </View>

          {/* Host Match Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, styles.hostIcon]}>
                <Feather name="square" size={18} color="#7BA4D9" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Host a match</Text>
                <Text style={styles.cardSubtitle}>Create a room from your quizzes</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.hostButton}>
              <Text style={styles.hostButtonText}>Select quiz to host</Text>
            </TouchableOpacity>
          </View>

          {/* Separator */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Join Match Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, styles.joinIcon]}>
                <Feather name="user-plus" size={18} color="#5DB564" />
              </View>
              <View>
                <Text style={styles.cardTitle}>Join a match</Text>
                <Text style={styles.cardSubtitle}>Enter a friend's room code</Text>
              </View>
            </View>
            <View style={styles.joinForm}>
              <TextInput
                style={styles.inputField}
                placeholder="5-digit code"
                placeholderTextColor="#737373"
                maxLength={5}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Win streak</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total wins</Text>
              <Text style={styles.statValue}>17</Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#222222',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  blueBg: {
    backgroundColor: '#23344D',
    borderWidth: 0,
  },
  titleArea: {
    marginBottom: 36,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A3A3A3',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hostIcon: {
    backgroundColor: '#23344D',
  },
  joinIcon: {
    backgroundColor: '#18411D',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#A3A3A3',
  },
  hostButton: {
    backgroundColor: '#273C58',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hostButtonText: {
    color: '#7BA4D9',
    fontSize: 16,
    fontWeight: '600',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A3A3A',
  },
  separatorText: {
    color: '#737373',
    marginHorizontal: 16,
    fontSize: 14,
  },
  joinForm: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    height: 48,
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 12,
  },
  joinButton: {
    backgroundColor: '#18411D',
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#5DB564',
    fontSize: 16,
    fontWeight: '600',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8, // Space above stats section
  },
  statCard: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#A3A3A3',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
