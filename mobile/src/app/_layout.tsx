import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme, Platform } from "react-native";
import { Stack } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useAppUpdater } from "../hooks/useAppUpdater";
import ForceUpdateScreen from "../components/ForceUpdateScreen";
import MaintenanceScreen from "../components/MaintenanceScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { fetchAppConfig } from "../lib/api";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { forceUpdateRequired } = useAppUpdater();
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
    return <ForceUpdateScreen />;
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
