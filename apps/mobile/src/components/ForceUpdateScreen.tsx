import React from 'react';
import { View, Text, StyleSheet, Platform, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ForceUpdateScreenProps {
  config?: {
    updateTitle?: string;
    updateMessage?: string;
    updateButtonText?: string;
    latestVersion?: string;
  } | null;
}

export default function ForceUpdateScreen({ config }: ForceUpdateScreenProps) {
  const title = config?.updateTitle || 'Update Required';
  const message =
    config?.updateMessage ||
    'A critical update is available for Scorr. Please update to the latest version to continue using the app.';
  const buttonText = config?.updateButtonText || 'Update Now';

  const handleUpdate = () => {
    if (Platform.OS === 'android') {
      Linking.openURL('market://details?id=com.radium230sorganization.quizforge');
    } else if (Platform.OS === 'ios') {
      Linking.openURL('itms-apps://itunes.apple.com/app/idYOUR_APP_ID');
    } else {
      Linking.openURL('https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={{ fontSize: 48 }}>🚀</Text>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleUpdate}>
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090A0F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
    maxWidth: 320,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
