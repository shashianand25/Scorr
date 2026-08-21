import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * useNetworkState — owns all network connectivity and toast state.
 * Extracted from HomeScreen god-file (lines ~1507-1528, 1384-1413, 1625-1652).
 */
export function useNetworkState() {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [offlineModalParams, setOfflineModalParams] = useState<{
    title: string;
    message: string;
    buttons?: { text: string; onPress: () => void; isPrimary?: boolean }[];
  } | null>(null);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [customToast, setCustomToast] = useState<{ message: string; icon: any; color: string } | null>(null);
  const [bottomToast, setBottomToast] = useState<{ message: string; icon?: any; color?: string } | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  const bottomToastOpacity = useRef(new Animated.Value(0)).current;
  const bottomToastTranslateY = useRef(new Animated.Value(20)).current;
  const bottomToastTimeoutRef = useRef<any>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── NetInfo subscription ──
  useEffect(() => {
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204 || response.status === 200,
      reachabilityLongTimeout: 8 * 1000,
      reachabilityShortTimeout: 2 * 1000,
      reachabilityRequestTimeout: 2500,
      shouldFetchWiFiSSID: false,
    });
    const unsubscribe = NetInfo.addEventListener(state => {
      const reachable = state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(reachable);
    });
    return () => unsubscribe();
  }, []);

  // ── Bottom Pill Toast ──
  const showBottomPillToast = useCallback((message: string, options?: { icon?: any; color?: string; durationMs?: number }) => {
    const durationMs = options?.durationMs ?? 1800;
    if (bottomToastTimeoutRef.current) clearTimeout(bottomToastTimeoutRef.current);
    setBottomToast({
      message,
      icon: options?.icon ?? 'sparkles',
      color: options?.color ?? '#38bdf8',
    });
    bottomToastOpacity.setValue(0);
    bottomToastTranslateY.setValue(20);

    Animated.parallel([
      Animated.timing(bottomToastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(bottomToastTranslateY, { toValue: 0, friction: 7, tension: 40, useNativeDriver: true }),
    ]).start();

    bottomToastTimeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(bottomToastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(bottomToastTranslateY, { toValue: 12, duration: 200, useNativeDriver: true }),
      ]).start(() => setBottomToast(null));
    }, durationMs);
  }, [bottomToastOpacity, bottomToastTranslateY]);

  return {
    // State
    isConnected, setIsConnected,
    offlineModalParams, setOfflineModalParams,
    syncToastMessage, setSyncToastMessage,
    customToast, setCustomToast,
    bottomToast, setBottomToast,
    pullRefreshing, setPullRefreshing,
    showReconnectedToast, setShowReconnectedToast,
    // Refs
    bottomToastOpacity,
    bottomToastTranslateY,
    bottomToastTimeoutRef,
    disconnectTimerRef,
    // Handlers
    showBottomPillToast,
  };
}
