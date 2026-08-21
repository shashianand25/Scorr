import * as Sentry from "@sentry/react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme, Platform, LogBox } from "react-native";
import { Stack } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useAppUpdater } from "../hooks/useAppUpdater";
import ForceUpdateScreen from "../components/ForceUpdateScreen";
import MaintenanceScreen from "../components/MaintenanceScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { fetchAppConfig } from "../lib/api";

LogBox.ignoreLogs([
  "Error while flushing PostHog",
  "PostHogFetchNetworkError",
  "Network error while fetching PostHog",
]);

// ── Sentry: Initialize before anything else renders ─────────────────────────
Sentry.init({
  dsn: "https://c528db38548b2ded38e5799ab0bbfcca@o4511898780172288.ingest.de.sentry.io/4511898785677392",
  // 20% of sessions are traced for performance; 100% for errors
  tracesSampleRate: 0.2,
  // Track user sessions to calculate crash-free rate
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 10000,
  // Disable in dev — don't pollute Sentry with debug crashes
  enabled: !__DEV__,
  // Attach breadcrumbs for console.warn and console.error
  integrations: [
    Sentry.reactNativeTracingIntegration(),
  ],
});

function RootLayout() {
  const colorScheme = useColorScheme();
  const { forceUpdateRequired, updateConfig } = useAppUpdater();
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const checkFlags = useCallback(async () => {
    try {
      const { config } = await fetchAppConfig();
      setMaintenanceMode(config?.featureFlags?.maintenanceMode === true);
    } catch {
      // If we can't reach the backend, don't block the app
    }
  }, []);

  useEffect(() => {
    checkFlags();
  }, [checkFlags]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  if (forceUpdateRequired) {
    return <ForceUpdateScreen config={updateConfig} />;
  }

  if (maintenanceMode) {
    return <MaintenanceScreen onRetry={checkFlags} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrapping with Sentry.wrap gives you:
// - Automatic JS error boundaries
// - Native crash reporting (via Sentry's native SDKs on Android/iOS)
// - User session tracking for crash-free rate
export default Sentry.wrap(RootLayout);

