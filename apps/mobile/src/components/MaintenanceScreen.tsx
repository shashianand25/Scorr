import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  /** Pass a retry callback so the user can re-check after you flip the flag back. */
  onRetry?: () => void;
}

export default function MaintenanceScreen({ onRetry }: Props) {
  const [retrying, setRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    await onRetry();
    setRetrying(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Text style={styles.iconEmoji}>🔧</Text>
        </View>

        <Text style={styles.title}>Down for Maintenance</Text>
        <Text style={styles.message}>
          We're making some improvements to Scorr.{'\n'}
          We'll be back very shortly — thank you for your patience!
        </Text>

        {onRetry && (
          <TouchableOpacity
            style={[styles.button, retrying && { opacity: 0.6 }]}
            onPress={handleRetry}
            disabled={retrying}
          >
            {retrying
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Check Again</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1E',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 14,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#8B8FA8',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
