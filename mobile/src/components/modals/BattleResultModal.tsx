import React from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, FlatList, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../../styles/shared";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const closeOrDismiss = (fn: () => void) => fn();
const KeyboardWrapper = Platform.OS === "ios" ? require("react-native").KeyboardAvoidingView : View;

/**
 * Battle result popup with confetti
 * Extracted from AppModals.tsx god-file.
 */
export function BattleResultModal({ p }: { p: any }) {
  const { t } = useTranslation();
  return (
    <>
      {/* ── Battle Result Modal ── */}
      {!!p.battlePopup && (
      <Modal visible={true} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          {p.battlePopup && (
            <View style={{
              width: "100%", maxWidth: 360,
              backgroundColor: p.settingsDarkMode ? "#1e1e2e" : "#ffffff",
              borderRadius: 24, padding: 32, alignItems: "center",
              borderWidth: 1, borderColor: p.battlePopup?.won ? "rgba(34,197,94,0.4)" : (p.settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)")
            }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: p.battlePopup?.won ? "rgba(34,197,94,0.15)" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "rgba(99,102,241,0.15)" : "rgba(239,68,68,0.15)"),
                alignItems: "center", justifyContent: "center", marginBottom: 20
              }}>
                <Text style={{ fontSize: 40 }}>{p.battlePopup?.won ? "🏆" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "🤝" : "💀")}</Text>
              </View>
              
              <Text style={{ fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginBottom: 8,
                color: p.battlePopup?.won ? "#22c55e" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "#6366f1" : "#ef4444") }}>
                {p.battlePopup?.won ? "VICTORY!" : (p.battlePopup?.myScore === p.battlePopup?.opponentScore ? "DRAW!" : "DEFEATED")}
              </Text>
              
              <Text style={{ fontSize: 16, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginBottom: 24, textAlign: "center" }}>
                Battle against <Text style={{ fontWeight: "700", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{p.battlePopup?.opponentName}</Text>
              </Text>
              
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", marginBottom: (p.battlePopup?.myScore === p.battlePopup?.opponentScore) ? 16 : 32 }}>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 12, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" }}>You</Text>
                  <Text style={{ fontSize: 36, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14" }}>{p.battlePopup?.myScore}</Text>
                </View>
                <View style={{ paddingHorizontal: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: p.settingsDarkMode ? "#475569" : "#cbd5e1" }}>VS</Text>
                </View>
                <View style={{ alignItems: "center", flex: 1 }}>
                  <Text style={{ fontSize: 12, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", fontWeight: "700", marginBottom: 4, textTransform: "uppercase" }}>Opponent</Text>
                  <Text style={{ fontSize: 36, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14" }}>{p.battlePopup?.opponentScore}</Text>
                </View>
              </View>

              {p.battlePopup?.myScore === p.battlePopup?.opponentScore && p.battlePopup.myTime !== undefined && p.battlePopup.opponentTime !== undefined && (
                <View style={{ backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginBottom: 24, width: "100%", alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1, color: p.battlePopup?.won ? "#22c55e" : "#ef4444", marginBottom: 4 }}>
                    Tie Breaker
                  </Text>
                  <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#cbd5e1" : "#475569", textAlign: "center" }}>
                    You finished in <Text style={{ fontWeight: "700", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{(p.battlePopup.myTime / 1000).toFixed(1)}s</Text>,
                    while they took <Text style={{ fontWeight: "700", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>{(p.battlePopup.opponentTime / 1000).toFixed(1)}s</Text>.
                  </Text>
                </View>
              )}
              
              <Pressable
                onPress={() => (p.setBattlePopup || (() => {}))(null)}
                style={({ pressed }) => [{
                  backgroundColor: p.battlePopup?.won ? "#22c55e" : (p.settingsDarkMode ? "#334155" : "#e2e8f0"),
                  paddingVertical: 14, borderRadius: 14, width: "100%", alignItems: "center"
                }, pressed && { opacity: 0.8 }]}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: p.battlePopup?.won ? "#fff" : (p.settingsDarkMode ? "#fff" : "#0f172a") }}>{p.battlePopup?.won ? "Awesome!" : "Close"}</Text>
              </Pressable>
            </View>
          )}
          {p.confettiParticles?.length > 0 && p.battlePopup && (
            <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
              {p.confettiParticles?.map((p: any) => {
                let shapeStyle: any = { width: p.size, height: p.size, backgroundColor: p.color };
                if (p.shape === "circle") {
                  shapeStyle.borderRadius = p.size / 2;
                } else if (p.shape === "triangle") {
                  shapeStyle = {
                    width: 0, height: 0, backgroundColor: "transparent", borderStyle: "solid",
                    borderLeftWidth: p.size / 2, borderRightWidth: p.size / 2, borderBottomWidth: p.size,
                    borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: p.color
                  };
                }
                return (
                  <View key={p.id} style={[
                    { position: "absolute", left: "50%", top: p.y, marginLeft: p.x - p.size / 2 },
                    shapeStyle, { transform: [{ rotate: `${p.rotation}deg` }] }
                  ]} />
                );
              })}
            </View>
          )}
        </View>
      </Modal>
      )}

    </>
  );
    </>
  );
}
