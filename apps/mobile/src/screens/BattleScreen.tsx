import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * BattleLobbyScreen — multiplayer battle room UI.
 * Extracted from HomeScreen god-file (renderBattleLobbyView).
 */
export function BattleLobbyScreen({ p }: { p: HomeScreenProps }) {
  const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;
  const { t } = useTranslation();
  const {
    settingsDarkMode, firebaseUser, setShowAuthScreen,
    battleRoomCode, setBattleRoomCode,
    battleRoomState,
    isConnected,
    setActiveTab,
  } = p;

  // Optional battle fields with safe defaults — always provided when battle screen is active
  const battleUnsubscribeRef = p.battleUnsubscribeRef;
  const setBattleRoomState = p.setBattleRoomState || ((_v: any) => {});
  const isHost = (p as any).isHost;
  const setIsHost = (p as any).setIsHost || ((_v: boolean) => {});
  const joinCodeInput = p.joinCodeInput ?? "";
  const setJoinCodeInput = p.setJoinCodeInput || ((_v: string) => {});
  const battleError = p.battleError;
  const setBattleError = p.setBattleError || ((_v: string | null) => {});
  const showBattleQuizSelector = p.showBattleQuizSelector;
  const setShowBattleQuizSelector = p.setShowBattleQuizSelector || ((_v: boolean) => {});
  const showBattleOptions = p.showBattleOptions;
  const setShowBattleOptions = p.setShowBattleOptions || ((_v: boolean) => {});
  const battleOptionsQuiz = p.battleOptionsQuiz;
  const battleOptionsSource = (p as any).battleOptionsSource;
  const battleShuffleQ = p.battleShuffleQ;
  const setBattleShuffleQ = p.setBattleShuffleQ || ((_v: boolean) => {});
  const battleShuffleA = p.battleShuffleA;
  const setBattleShuffleA = p.setBattleShuffleA || ((_v: boolean) => {});
  const battleRandomCount = p.battleRandomCount;
  const setBattleRandomCount = p.setBattleRandomCount || ((_v: number) => {});
  const battleSelectionMode = p.battleSelectionMode;
  const setBattleSelectionMode = p.setBattleSelectionMode || ((_v: string) => {});
  const battleRangeStart = p.battleRangeStart;
  const setBattleRangeStart = p.setBattleRangeStart || ((_v: number) => {});
  const battleRangeEnd = p.battleRangeEnd;
  const setBattleRangeEnd = p.setBattleRangeEnd || ((_v: number) => {});
  const showBattleHistory = p.showBattleHistory;
  const setShowBattleHistory = p.setShowBattleHistory || ((_v: boolean) => {});
  const battleHistory = p.battleHistory || [];
  const battleConnError = (p as any).battleConnError;
  const battleCreating = p.battleCreating;
  const battleTimePerQuestion = p.battleTimePerQuestion;
  const setBattleTimePerQuestion = p.setBattleTimePerQuestion || ((_v: number | null) => {});
  const battleCountdown = p.battleCountdown;
  const quizzes = p.quizzes || [];
  const handleCreateBattle = (p as any).handleCreateBattle || (() => {});
  const handleJoinBattle = p.handleJoinBattle || (async () => {});
  const handleStartBattle = p.handleStartBattle || (async () => {});
  const showBottomPillToast = (p as any).showBottomPillToast;

    const isDark = settingsDarkMode;

    // ── Sign-in gate ────────────────────────────────────────────────
    if (!firebaseUser) {
      return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
            borderWidth: 1.5, borderColor: isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.2)",
            alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Text style={{ fontSize: 44 }}>⚔️</Text>
          </View>
          <Text style={{ fontSize: 26, fontWeight: "900", color: isDark ? "#fff" : "#0d0f14", letterSpacing: -0.5, marginBottom: 10, textAlign: "center" }}>{t('battle.signin_title') || "Sign in to Battle"}</Text>
          <Text style={{ fontSize: 15, color: isDark ? "#94a3b8" : "#64748b", textAlign: "center", lineHeight: 22, marginBottom: 36 }}>
            {t('battle.signin_desc') || "Quiz Clash requires an account so your identity is verified and results are saved fairly."}
          </Text>
          <Pressable
            onPress={() => setShowAuthScreen(true)}
            style={({ pressed }) => [{
              backgroundColor: "#6366f1", paddingVertical: 16, paddingHorizontal: 40,
              borderRadius: 16, alignItems: "center", width: "100%",
            }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>{t('battle.signin_btn') || "Sign In / Create Account"}</Text>
          </Pressable>
        </View>
      );
    }

    const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
    const cardBg  = isDark ? "#141930" : "#ffffff";
    const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
    const txt     = isDark ? "#ffffff" : "#0d0f14";
    const muted   = isDark ? "#71717a" : "#64748b";
    const mutedSub = isDark ? "#3f3f46" : "#94a3b8";
    const sepColor = isDark ? "rgba(255,255,255,0.07)" : "#e2e8f0";

    // ── Dynamic stats from history ────────────────────────────────────
    const totalWins = battleHistory.filter((h: any) => h.won).length;
    const totalBattles = battleHistory.length;
    const winRate = totalBattles > 0 ? Math.round((totalWins / totalBattles) * 100) : 0;
    // Compute current day streak (consecutive days played)
    let dayStreak = 0;
    if (battleHistory.length > 0) {
      const sortedHistory = [...battleHistory].sort((a, b) => b.date - a.date);
      const uniqueDays = new Set(sortedHistory.map((h: any) => new Date(h.date).toDateString()));
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const todayStr = today.toDateString();
      const yesterdayStr = yesterday.toDateString();
      
      if (uniqueDays.has(todayStr) || uniqueDays.has(yesterdayStr)) {
        let checkDate = uniqueDays.has(todayStr) ? today : yesterday;
        while (uniqueDays.has(checkDate.toDateString())) {
          dayStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    return (
      <KeyboardWrapper
        style={{ flex: 1, backgroundColor: bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* No orbs - clean background matches rest of app */}

        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header row with history button */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 28 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <AnimatedPressable
                onPress={() => setActiveTab("home" as any)}
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center"
                }}
              >
                <Ionicons name="chevron-back" size={20} color={isDark ? "#ffffff" : "#000000"} />
              </AnimatedPressable>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="sword-cross" size={19} color={isDark ? "#818cf8" : "#6366f1"} />
                <Text style={{ fontSize: 15, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "700" }}>{t('battle.title') || "Battle Arena"}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AnimatedPressable
                onPress={() => setShowBattleHistory(true)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  borderRadius: 16, paddingHorizontal: 11, paddingVertical: 6,
                }}
              >
                <Ionicons name="time-outline" size={13} color={muted} />
                <Text style={{ fontSize: 12, fontWeight: "500", color: muted }}>{t('battle.history') || "History"}</Text>
              </AnimatedPressable>
              
              <AnimatedPressable
                onPress={() => setActiveTab("menu")}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  alignItems: "center", justifyContent: "center"
                }}
              >
                <Ionicons name="settings-outline" size={15} color={muted} />
              </AnimatedPressable>
            </View>
          </View>

          {/* Hero title */}
          <View style={{ alignItems: "center", marginBottom: 4 }}>
            <Text style={{ fontSize: 28, fontWeight: "500", color: txt, letterSpacing: -0.5 }}>
              Quiz<Text style={{ color: isDark ? "#818cf8" : "#6366f1" }}>Clash</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: muted, fontWeight: "400", textAlign: "center", marginBottom: 20 }}>
            {t('battle.subtitle') || "Challenge friends in real-time matches"}
          </Text>

          {/* Error banner removed to use inline errors */}

          {!battleRoomCode ? (
            <>
              {/* HOST CARD */}
              <AnimatedPressable
                onPress={() => setShowBattleQuizSelector(true)}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 11,
                  backgroundColor: isDark ? "#2a2410" : "#fef3c7",
                  alignItems: "center", justifyContent: "center"
                }}>
                  <Ionicons name="trophy" size={19} color={isDark ? "#f0b429" : "#d97706"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: txt, marginBottom: 1 }}>{t('battle.host_battle') || "Host a battle"}</Text>
                  <Text style={{ fontSize: 12, color: muted }}>{t('battle.host_desc') || "Pick your quiz & invite opponents"}</Text>
                </View>
                <Feather name="chevron-right" size={17} color={mutedSub} />
              </AnimatedPressable>

              {/* Divider */}
              <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 10 }}>
                <View style={{ flex: 1, height: 0.5, backgroundColor: sepColor }} />
                <Text style={{ color: mutedSub, fontSize: 11 }}>{t('common.or') || "or"}</Text>
                <View style={{ flex: 1, height: 0.5, backgroundColor: sepColor }} />
              </View>

              {/* JOIN CARD */}
              <View style={{
                backgroundColor: cardBg,
                borderRadius: 14, padding: 14, marginBottom: 20,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 11,
                    backgroundColor: isDark ? "#0f2620" : "#ccfbf1",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Ionicons name="locate" size={19} color={isDark ? "#2dd4a7" : "#0d9488"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: txt, marginBottom: 1 }}>{t('battle.join_battle') || "Join a battle"}</Text>
                    <Text style={{ fontSize: 12, color: muted }}>{t('battle.join_desc') || "Enter your friend's room code"}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={{
                      flex: 1, height: 40,
                      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                      borderWidth: battleError ? 1 : 0.5,
                      borderColor: battleError ? (isDark ? "#f87171" : "#ef4444") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
                      borderRadius: 10, paddingHorizontal: 12,
                      fontSize: 13, color: txt, letterSpacing: 2
                    }}
                    placeholder={t('battle.code_placeholder') || "CODE"}
                    placeholderTextColor={mutedSub}
                    maxLength={5}
                    value={joinCodeInput}
                    onChangeText={(text: any) => {
                      setJoinCodeInput(text);
                      if (battleError) setBattleError("");
                    }}
                    autoCapitalize="characters"
                  />
                  <AnimatedPressable
                    onPress={handleJoinBattle}
                    disabled={(joinCodeInput || "").length !== 5 || battleCreating}
                    style={() => {
                      const isReady = joinCodeInput.length === 5 && !battleCreating;
                      return {
                        height: 40, paddingHorizontal: 18, borderRadius: 10,
                        backgroundColor: isReady ? (isDark ? "#2dd4a7" : "#0d9488") : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"),
                        borderWidth: 0.5,
                        borderColor: isReady ? (isDark ? "#2dd4a7" : "#0d9488") : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"),
                        justifyContent: "center", alignItems: "center",
                      };
                    }}
                  >
                    {battleCreating ? (
                      <ActivityIndicator size="small" color={isDark ? "#ffffff" : "#ffffff"} />
                    ) : (
                      <Text style={{ color: (joinCodeInput.length === 5 && !battleCreating) ? "#ffffff" : (isDark ? "#777d99" : "#64748b"), fontSize: 13, fontWeight: (joinCodeInput.length === 5) ? "700" : "500" }}>{t('battle.join_btn') || "Join"}</Text>
                    )}
                  </AnimatedPressable>
                </View>
                {!!battleError && (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 6, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 13 }}>⚠️</Text>
                    <Text style={{ color: isDark ? "#f87171" : "#ef4444", fontSize: 13, fontWeight: "500", flex: 1 }}>{battleError}</Text>
                  </View>
                )}
              </View>

              {/* Dynamic Stats Row 1: Win Rate Circular */}
              {totalBattles > 0 && (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 14 }}>
                    <View style={{ 
                      width: 80, height: 80, borderRadius: 40,
                      borderWidth: 6, borderColor: isDark ? "rgba(139,143,240,0.3)" : "rgba(99,102,241,0.2)",
                      alignItems: "center", justifyContent: "center"
                    }}>
                      <Text style={{ fontSize: 17, fontWeight: "500", color: txt }}>{winRate}%</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt, marginBottom: 2 }}>{t('battle.win_rate') || "Win rate"}</Text>
                      <Text style={{ fontSize: 11, color: muted }}>{totalWins} win{totalWins !== 1 ? 's' : ''} out of {totalBattles} battle{totalBattles !== 1 ? 's' : ''} played</Text>
                    </View>
                  </View>

                  {/* Dynamic Stats Row 2: Streaks & Total */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "rgba(232,130,90,0.12)" : "rgba(232,130,90,0.08)", borderRadius: 14, padding: 10 }}>
                      <Ionicons name="flame" size={19} color="#e8825a" />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: "500", color: txt }}>{dayStreak}</Text>
                        <Text style={{ fontSize: 10, color: isDark ? "#c98e75" : "#e8825a" }}>{t('battle.day_streak') || "day streak"}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: isDark ? "rgba(240,180,41,0.12)" : "rgba(240,180,41,0.08)", borderRadius: 14, padding: 10 }}>
                      <Ionicons name="trophy" size={19} color="#f0b429" />
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: "500", color: txt }}>{totalWins}</Text>
                        <Text style={{ fontSize: 10, color: isDark ? "#cda85f" : "#f0b429" }}>{t('battle.total_wins') || "total wins"}</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </>
          ) : (
            /* ── Waiting Room ── */
            <View style={{ alignItems: "center", paddingTop: 20 }}>
              {/* Avatar VS layout */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 28, marginBottom: 36 }}>
                <View style={{ alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
                    borderWidth: 2, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 36 }}>🦊</Text>
                  </View>
                  <Text style={{ color: muted, fontSize: 13, fontWeight: "700" }}>{firebaseUser?.displayName?.split(" ")[0] || "You"}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: "#ec4899" }}>VS</Text>
                </View>
                <View style={{ alignItems: "center", gap: 10 }}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 40,
                    backgroundColor: isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)",
                    borderWidth: 2, borderColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 36, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "900" }}>?</Text>
                  </View>
                  <Text style={{ color: muted, fontSize: 13, fontWeight: "700" }}>
                    {battleRoomState?.status === "playing" ? (isHost ? battleRoomState?.guestName : battleRoomState?.hostName) || "Rival" : (t('battle.waiting') || "Waiting...")}
                  </Text>
                </View>
              </View>

              {/* Room code display */}
              {isHost && (
                <View style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  borderWidth: 1, borderColor: cardBorder,
                  borderRadius: 20, padding: 24, width: "100%", alignItems: "center", marginBottom: 24
                }}>
                  <Text style={{ fontSize: 11, color: mutedSub, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14 }}>{t('battle.share_code') || "Share This Code"}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    {battleRoomCode.split("").map((ch: any, i: any) => (
                      <View key={i} style={{
                        width: 44, height: 54, borderRadius: 12,
                        backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)",
                        borderWidth: 2, borderColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.3)",
                        alignItems: "center", justifyContent: "center"
                      }}>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: isDark ? "#818cf8" : "#6366f1" }}>{ch}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, color: muted, fontWeight: "500" }}>{t('battle.waiting_opponent') || "Waiting for opponent to join..."}</Text>
                </View>
              )}

              {battleCountdown !== null ? (
                <View style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
                  <Text style={{ fontSize: 72, color: isDark ? "#818cf8" : "#6366f1", fontWeight: "900" }}>{battleCountdown}</Text>
                  <Text style={{ fontSize: 20, color: txt, fontWeight: "800", marginTop: -10 }}>{t('battle.get_ready') || "Get Ready!"}</Text>
                </View>
              ) : battleRoomState?.status === "playing" ? (
                <View style={{ alignItems: "center", gap: 10, marginBottom: 28 }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)",
                    borderWidth: 2, borderColor: isDark ? "rgba(34,197,94,0.4)" : "rgba(34,197,94,0.3)",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Text style={{ fontSize: 26 }}>✓</Text>
                  </View>
                  <Text style={{ fontSize: 18, color: "#22c55e", fontWeight: "800" }}>Opponent joined!</Text>
                  <Text style={{ fontSize: 14, color: muted }}>Starting match...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 28 }}>
                  {[0,1,2].map((i: any) => (
                    <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isDark ? "#818cf8" : "#6366f1", opacity: 0.6 }} />
                  ))}
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (battleUnsubscribeRef?.current) battleUnsubscribeRef.current();
                  setBattleRoomCode("");
                  setBattleRoomState(null);
                }}
                style={({ pressed }) => [{ paddingVertical: 10, paddingHorizontal: 20 }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ color: "#ef4444", fontSize: 15, fontWeight: "700" }}>✕ {t('common.cancel') || "Cancel"}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

      </KeyboardWrapper>
    );
}

/**
 * FlashcardsScreen — flashcard study and deck management UI.
 * Extracted from HomeScreen god-file (renderFlashcardsView).
 */
