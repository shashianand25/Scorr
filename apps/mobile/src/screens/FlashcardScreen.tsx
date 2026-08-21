import { Easing } from "react-native";
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
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * BattleLobbyScreen — multiplayer battle room UI.
 * Extracted from HomeScreen god-file (renderBattleLobbyView).
 */
export function FlashcardsScreen({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const {
    settingsDarkMode, firebaseUser,
    flashcardDecks, setFlashcardDecks,
    viewingInsightsDeck, setViewingInsightsDeck,
    viewingInsightsQuiz,
    setActiveTab, handleSM2Rating,
    insets,
  } = p;

  // Optional fields with safe defaults — always provided when flashcard screen is active
  const fcIndex = p.fcIndex ?? 0;
  const setFcIndex: (v: number | ((prev: number) => number)) => void =
    p.setFcIndex || ((_v: number | ((prev: number) => number)) => {});
  const fcFlipped = p.fcFlipped ?? false;
  const setFcFlipped = p.setFcFlipped || ((_v: boolean) => {});
  const studyingDeck = (p as any).studyingDeck;
  const setStudyingDeck = (p as any).setStudyingDeck || (() => {});
  const studyQueue = (p as any).studyQueue;
  const setStudyQueue = (p as any).setStudyQueue || (() => {});
  const fcIndexRef = (p as any).fcIndexRef;
  const fcStarredIds = (p as any).fcStarredIds;
  const setFcStarredIds = (p as any).setFcStarredIds || (() => {});
  const showBottomPillToast = (p as any).showBottomPillToast;
  const startStudy = p.startStudy || (() => {});
  const insightsSwipeX = p.insightsSwipeX;
  const insightsSwipeY = p.insightsSwipeY;
  const insightsFlipAnim = p.insightsFlipAnim;
  const insightsPanResponder = p.insightsPanResponder;
  const buttonSlideX = p.buttonSlideX;
  const toggleSpeech = p.toggleSpeech || ((_text: string) => {});
  const speakingText = p.speakingText;
  const renderFormattedText = p.renderFormattedText || ((text: string) => text);

    if (!viewingInsightsQuiz) return null;
    const quiz = viewingInsightsQuiz;
    const cards = quiz.flashcards || [];
    const isDark = settingsDarkMode;

    if (cards.length === 0) {
      return (
        <View style={{ flex: 1, backgroundColor: isDark ? "#0f172a" : "#f4f4f8" }}>
          <View style={{ flexDirection: "row", alignItems: "center", padding: 20, paddingTop: 20 }}>
            <Pressable onPress={() => setActiveTab("insights")} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={isDark ? "#fff" : "#000"} />
            </Pressable>
          </View>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, paddingBottom: 60 }}>
             <Text style={{ fontSize: 50, marginBottom: 20 }}>📭</Text>
             <Text style={{ fontSize: 20, fontWeight: "700", color: isDark ? "#fff" : "#111827", textAlign: "center", marginBottom: 8 }}>{t('flashcards.no_cards') || "No flashcards available."}</Text>
             <Text style={{ fontSize: 15, color: isDark ? "#9ca3af" : "#6b7280", textAlign: "center", lineHeight: 22 }}>{t('flashcards.no_cards_sub') || "This quiz doesn't include flashcards."}</Text>
          </View>
        </View>
      );
    }

    const W = Dimensions.get('window').width;
    const currentCard = cards[fcIndex] || cards[0];
    const nextCard = cards[fcIndex + 1];
    const frontText = currentCard.front;
    const backText  = currentCard.back;

    // Interpolations derived from insightsSwipeX (JS-driven so we can use non-native transforms)
    const rotate = insightsSwipeX.interpolate({ inputRange: [-W, 0, W], outputRange: ["-15deg", "0deg", "15deg"], extrapolate: "clamp" });
    const knowOpacity   = insightsSwipeX.interpolate({ inputRange: [0, 60], outputRange: [0, 1], extrapolate: "clamp" });
    const unknownOpacity = insightsSwipeX.interpolate({ inputRange: [-60, 0], outputRange: [1, 0], extrapolate: "clamp" });
    const nextCardScale  = insightsSwipeX.interpolate({ inputRange: [-W, 0, W], outputRange: [1, 0.94, 1], extrapolate: "clamp" });

    const frontInterpolate = insightsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg", "180deg"] });
    const backInterpolate  = insightsFlipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg", "360deg"] });
    const frontOpacity     = insightsFlipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: "clamp" });
    const backOpacity      = insightsFlipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: "clamp" });

    const flipCard = () => {
      const toVal = fcFlipped ? 0 : 180;
      Animated.spring(insightsFlipAnim, { toValue: toVal, friction: 8, tension: 10, useNativeDriver: true }).start();
      setFcFlipped(!fcFlipped);
    };

    // ── Text helpers ────────────────────────────────────────────────────────
    // Strip QST artefacts (leading "= "), collapse 2+ newlines into one, trim
    const cleanText = (t: string) =>
      t.replace(/^=\s*/gm, '').replace(/\n{2,}/g, '\n').trim();

    const cleanFront = cleanText(frontText);

    // Parse memory tip from back (e.g. "Memory Tip: Cluster = together as one")
    const memoryTipMatch = backText.match(/Memory Tip[:\s]+(.+)/i);
    const mainBackRaw = memoryTipMatch
      ? backText.replace(/Memory Tip[:\s]+.+/i, '')
      : backText;
    const mainBack = cleanText(mainBackRaw);
    const memoryTip = memoryTipMatch ? memoryTipMatch[1].trim() : null;

    // Card colour — same for both faces so the flip just reveals the other side
    const cardBg = isDark ? "#253344" : "#ffffff";

    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8" }}>

        {/* Header Row */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#111827" }}>
            {fcIndex + 1}/{cards.length}
          </Text>
          <Pressable onPress={() => setActiveTab("insights")} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
            <Ionicons name="close" size={26} color={isDark ? "#ffffff" : "#111827"} />
          </Pressable>
        </View>

        {/* Progress bar — full width teal */}
        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e0e0e8" }}>
          <View style={{ height: 4, backgroundColor: "#00d4aa", width: `${((fcIndex + 1) / cards.length) * 100}%` }} />
        </View>

        {/* Card Stack Area */}
        <View style={{ flex: 1, padding: 16, paddingTop: 20, paddingBottom: 40 }}>

          {/* Ghost of next card (commented out for cleaner carousel animation)
          {nextCard ? (
            <Animated.View style={{
              position: "absolute", left: 16, right: 16, top: 20, bottom: 8,
              borderRadius: 24,
              backgroundColor: isDark ? "#1e2b3a" : "#e4e6ef",
              transform: [{ scale: nextCardScale }],
              opacity: insightsFlipAnim.interpolate({ inputRange: [0, 44, 90, 136, 180], outputRange: [1, 0, 0, 0, 1], extrapolate: "clamp" }),
            }} />
          ) : null}
          */}

          {/* Transparent outer wrapper — handles pan + swipe rotate only, NO background */}
          <Animated.View
            {...insightsPanResponder.panHandlers}
            style={{
              flex: 1,
              // Shadow lives here so it wraps both faces
              shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 24, elevation: 10,
              transform: [{ translateX: insightsSwipeX }, { translateX: buttonSlideX }, { translateY: insightsSwipeY }, { rotate }],
            }}
          >
            {/* ── FRONT FACE — full card with own background ── */}
            <Animated.View 
              pointerEvents={fcFlipped ? "none" : "auto"}
              style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 24, backgroundColor: cardBg,
              backfaceVisibility: "hidden", overflow: "hidden",
              opacity: frontOpacity,
              transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
            }}>
              {/* Speaker — top right */}
              <Pressable
                onPress={() => toggleSpeech(cleanFront)}
                style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === cleanFront ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
              >
                <Ionicons name="volume-high-outline" size={22} color={speakingText === cleanFront ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
              </Pressable>

              {/* Term — centred horizontally and vertically */}
              <Pressable onPress={flipCard} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingVertical: 52 }}>
                {renderFormattedText(cleanFront, {
                  fontSize: 22, fontWeight: "500",
                  color: isDark ? "#f1f5f9" : "#111827",
                  lineHeight: 33, letterSpacing: 0.1,
                  textAlign: "center",
                })}
              </Pressable>
            </Animated.View>

            {/* ── BACK FACE — full card with own background ── */}
            <Animated.View 
              pointerEvents={fcFlipped ? "auto" : "none"}
              style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 24, backgroundColor: cardBg,
              backfaceVisibility: "hidden", overflow: "hidden",
              opacity: backOpacity,
              transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
            }}>
              {/* Speaker — top right */}
              <Pressable
                onPress={() => toggleSpeech(mainBack)}
                style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === mainBack ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
              >
                <Ionicons name="volume-high-outline" size={22} color={speakingText === mainBack ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
              </Pressable>

              {/* Definition + Memory Tip — vertically centred in card */}
              <Pressable onPress={flipCard} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40, paddingTop: 52 }}>
                {renderFormattedText(mainBack, {
                  fontSize: 18, fontWeight: "400",
                  color: isDark ? "#ffffff" : "#0f172a",
                  lineHeight: 28, letterSpacing: 0.1,
                })}
                {memoryTip ? (
                  <View style={{
                    marginTop: 24,
                    backgroundColor: isDark ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.05)",
                    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
                  }}>
                    <Text style={{ fontSize: 14, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)", lineHeight: 21 }}>
                      Memory Tip: {memoryTip}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>

          </Animated.View>
        </View>

        {/* Bottom Nav */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 10 }}>
          <Pressable
            onPress={() => { 
              if (fcIndex > 0) { 
                Animated.timing(buttonSlideX, { toValue: W, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
                  setFcIndex((i: any) => i - 1); 
                  setFcFlipped(false); 
                  insightsFlipAnim.setValue(0); 
                  insightsSwipeX.setValue(0); 
                  insightsSwipeY.setValue(0);
                  buttonSlideX.setValue(-W);
                  setTimeout(() => {
                    Animated.timing(buttonSlideX, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
                  }, 16);
                });
              } 
            }}
            disabled={fcIndex === 0}
            style={({ pressed }) => ({ opacity: fcIndex === 0 ? 0.25 : pressed ? 0.6 : 1, width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center" })}
          >
            <Ionicons name="chevron-back" size={24} color={isDark ? "#ffffff" : "#111827"} />
          </Pressable>

          <Text style={{ fontSize: 14, color: isDark ? "#ffffff" : "#111827", fontWeight: "500" }}>
            {t('flashcards.tap_to_flip') || "Tap the card to flip"}
          </Text>

          <Pressable
            onPress={() => { 
              if (fcIndex < cards.length - 1) { 
                Animated.timing(buttonSlideX, { toValue: -W, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
                  setFcIndex((i: any) => i + 1); 
                  setFcFlipped(false); 
                  insightsFlipAnim.setValue(0); 
                  insightsSwipeX.setValue(0); 
                  insightsSwipeY.setValue(0);
                  buttonSlideX.setValue(W);
                  setTimeout(() => {
                    Animated.timing(buttonSlideX, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
                  }, 16);
                });
              } else { 
                setActiveTab("insights"); 
              } 
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, width: 52, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignItems: "center", justifyContent: "center" })}
          >
            <Ionicons name={fcIndex === cards.length - 1 ? "checkmark" : "chevron-forward"} size={24} color={isDark ? "#ffffff" : "#111827"} />
          </Pressable>
        </View>
      </View>
    );
}
