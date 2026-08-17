import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

/**
 * Handles any unmatched routes or legacy deep links (e.g. scorr://home, scorr://open, etc.)
 * by gracefully redirecting straight to the main app screen.
 */
export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0F1E", alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color="#6366f1" size="large" />
    </View>
  );
}
