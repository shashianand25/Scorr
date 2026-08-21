import React from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Platform,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function AIGeneratingScreen({
  onCancel,
  documentCharCount = 0,
  isDark = true,
  generationTimeoutMs = 60000,
  connectionLost = false,
}: {
  onCancel?: () => void;
  documentCharCount?: number;
  isDark?: boolean;
  generationTimeoutMs?: number;
  connectionLost?: boolean;
}) {
  const { t } = useTranslation();
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);
  const sway = React.useRef(new Animated.Value(0)).current;
  const blink = React.useRef(new Animated.Value(0.3)).current;
  const progress = React.useRef(new Animated.Value(0)).current;
  const progressPausedAt = React.useRef<number | null>(null);
  const [showLongWait, setShowLongWait] = React.useState(false);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: -1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0.3, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(progress, { toValue: 1, duration: 40000, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();

    const timer = setTimeout(() => setShowLongWait(true), 50000);
    return () => clearTimeout(timer);
  }, [blink, progress, sway]);

  React.useEffect(() => {
    if (connectionLost) {
      (progress as any).stopAnimation((val: number) => { progressPausedAt.current = val; });
    } else if (progressPausedAt.current !== null) {
      const remaining = Math.max(0, (1 - progressPausedAt.current) * 40000);
      Animated.timing(progress, { toValue: 1, duration: remaining, easing: Easing.out(Easing.ease), useNativeDriver: false }).start();
      progressPausedAt.current = null;
    }
  }, [connectionLost, progress]);

  const swayRotate = sway.interpolate({ inputRange: [-1, 0], outputRange: ["-6deg", "0deg"] });
  const swayTranslateY = sway.interpolate({ inputRange: [-1, 0], outputRange: [-5, 0] });
  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
  const barColor = connectionLost ? "#F59E0B" : (isDark ? "#5D45A5" : "#6366f1");

  return (
    <Modal visible={true} transparent={false} animationType="none" statusBarTranslucent
      onRequestClose={() => showCancelConfirm ? setShowCancelConfirm(false) : setShowCancelConfirm(true)}>
      <View style={{ flex: 1, backgroundColor: isDark ? "#0B0F1E" : "#f4f4f8", alignItems: "center", justifyContent: "center" }}>

        {!!onCancel && (
          <SafeAreaView style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 20, paddingTop: Platform.OS === "android" ? 24 : 12 }}>
              <Pressable onPress={() => setShowCancelConfirm(true)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name="chevron-back" size={20} color={isDark ? "#FFFFFF" : "#0f172a"} />
                <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#FFFFFF" : "#0f172a" }}>{t("actions.cancel") || "Cancel"}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        )}

        <View style={{ position: "absolute", top: "20%", left: "25%", width: 3, height: 3, borderRadius: 1.5, backgroundColor: isDark ? "#6C7491" : "#cbd5e1", opacity: 0.4 }} />
        <View style={{ position: "absolute", top: "28%", right: "20%", width: 2, height: 2, borderRadius: 1, backgroundColor: isDark ? "#6C7491" : "#cbd5e1", opacity: 0.3 }} />
        <View style={{ position: "absolute", top: "56%", right: "25%", width: 3, height: 3, borderRadius: 1.5, backgroundColor: isDark ? "#6C7491" : "#cbd5e1", opacity: 0.4 }} />

        <View style={{ alignItems: "center", marginTop: -60, width: "100%" }}>
          <View style={{ width: 220, height: 220, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <View style={{ position: "absolute", width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
            <View style={{ position: "absolute", width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
            <Animated.View style={{ width: 90, height: 124, borderRadius: 12, backgroundColor: isDark ? "#20154D" : "#ffffff", borderWidth: 1.5, borderColor: isDark ? "#4C3896" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center", transform: [{ rotate: swayRotate }, { translateY: swayTranslateY }], shadowColor: isDark ? "#4C3896" : "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: isDark ? 0.5 : 0.05, shadowRadius: 20 }}>
              <View style={{ position: "absolute", left: 14, top: 24, width: 30, height: 2, backgroundColor: isDark ? "rgba(229,217,255,0.3)" : "rgba(0,0,0,0.1)" }} />
              <View style={{ position: "absolute", left: 14, top: 44, width: 50, height: 2, backgroundColor: isDark ? "rgba(229,217,255,0.15)" : "rgba(0,0,0,0.05)" }} />
              <View style={{ position: "absolute", left: 14, top: 60, width: 62, height: 2, backgroundColor: isDark ? "rgba(229,217,255,0.15)" : "rgba(0,0,0,0.05)" }} />
            </Animated.View>
          </View>

          {connectionLost ? (
            <View style={{ marginBottom: 20, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: "rgba(245,158,11,0.18)", borderWidth: 1, borderColor: "rgba(245,158,11,0.4)", flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="wifi-outline" size={18} color="#F59E0B" />
              <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 14 }}>Connection lost — waiting to reconnect…</Text>
            </View>
          ) : (
            <Animated.View style={{ marginBottom: 20, opacity: blink }}>
              <MaskedView maskElement={<View style={{ backgroundColor: "transparent", justifyContent: "center", alignItems: "center" }}><Text style={{ fontSize: 30, fontWeight: "800", textAlign: "center", lineHeight: 38 }}>Generating quiz{"\n"}and flashcards...</Text></View>} style={{ width: SCREEN_WIDTH, height: 80 }}>
                <LinearGradient colors={["#5FC9FF", "#C384FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
              </MaskedView>
            </Animated.View>
          )}

          {!connectionLost && <Text style={{ fontSize: 16, color: isDark ? "#7B88A0" : "#64748b", textAlign: "center", fontWeight: "500", lineHeight: 24, paddingHorizontal: 20, marginBottom: 50 }}>The conversion may take a while depending on{"\n"}the size of your upload</Text>}
          {connectionLost && <Text style={{ fontSize: 14, color: isDark ? "#7B88A0" : "#64748b", textAlign: "center", fontWeight: "500", lineHeight: 22, paddingHorizontal: 32, marginBottom: 50, marginTop: 12 }}>Your progress is saved. Generation will resume automatically once you're back online.</Text>}

          <View style={{ width: 220, height: 4, borderRadius: 2, backgroundColor: isDark ? "#201D38" : "#e2e8f0", overflow: "hidden" }}>
            <Animated.View style={{ width: barWidth, height: "100%", backgroundColor: barColor, borderRadius: 2 }} />
          </View>
          {!connectionLost && showLongWait && <Text style={{ marginTop: 12, color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)", fontSize: 14, fontWeight: "500" }}>Still generating questions...</Text>}
        </View>

        {showCancelConfirm && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 9999999 }}>
            <View style={{ width: "100%", maxWidth: 330, backgroundColor: isDark ? "#161c30" : "#ffffff", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? "rgba(239,68,68,0.18)" : "#fee2e2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="alert-circle" size={28} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 8, textAlign: "center" }}>{t("generation.cancel_title") || "Cancel Generation?"}</Text>
              <Text style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.7)" : "#64748b", textAlign: "center", lineHeight: 20, marginBottom: 24 }}>{t("generation.cancel_desc") || "Are you sure you want to stop generating questions?"}</Text>
              <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
                <Pressable onPress={() => setShowCancelConfirm(false)} style={({ pressed }) => [{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)", opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: isDark ? "#ffffff" : "#334155" }}>{t("generation.keep_waiting") || "Keep Waiting"}</Text>
                </Pressable>
                <Pressable onPress={() => { setShowCancelConfirm(false); if (onCancel) onCancel(); }} style={({ pressed }) => [{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", opacity: pressed ? 0.8 : 1 }]}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#ffffff" }}>{t("generation.stop_generation") || "Cancel"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

export function FullscreenBattleCountdown({ count, isDark = true }: { count: number; isDark?: boolean }) {
  const scaleAnim = React.useRef(new Animated.Value(2.4)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    scaleAnim.setValue(2.4);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 140, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [count, opacityAnim, scaleAnim]);

  return (
    <Modal visible={true} transparent={false} animationType="none" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: isDark ? "#090d16" : "#080c17", alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 200, fontWeight: "900", color: "#ffffff", fontVariant: ["tabular-nums"], textShadowColor: "rgba(99,102,241,0.95)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 50 }}>{count}</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
