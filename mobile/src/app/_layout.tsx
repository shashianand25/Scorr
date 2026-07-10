import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { useColorScheme, Platform } from "react-native";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAppUpdater } from "../hooks/useAppUpdater";
import ForceUpdateScreen from "../components/ForceUpdateScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { forceUpdateRequired } = useAppUpdater();

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
