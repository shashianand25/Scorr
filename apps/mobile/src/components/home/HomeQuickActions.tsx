import { getUserInitial } from "../../utils/user";
import { AnimatedPressable } from "../ui/AnimatedPressable";
import { Alert } from "react-native";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions, RefreshControl } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../../styles/shared";
import type { HomeScreenProps } from "../../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * HomeQuickActions — Battle Arena, Flashcard banner, and More Options sections.
 * Extracted from HomeTab.tsx to reduce file size.
 */
export function HomeQuickActions({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
    settingsDarkMode = true, quizzes = [], flashcardDecks = [],
    sampleDismissed = false, setSampleDismissed = () => {}, sampleQuiz = null,
    firebaseUser = null, homeSearch = "", setHomeSearch = () => {},
    jumpPage = 0, setJumpPage = () => {}, startStudy = () => {},
    appConfig = null, setActiveTab = () => {}, setShowAddMenu = () => {},
    setShowFeedbackPage = () => {}, openAuthScreen = () => {},
    pullRefreshing = false, handlePullRefresh = async () => {},
    setViewingInsightsQuiz = () => {}, setViewingInsightsQuizFromTab = () => {},
    deleteQuiz = () => {}, renameQuiz = () => {},
  } = p || {};

  const bg         = "#0B0F1E";
  const cardBg     = "#141930";
  const searchBg   = "#1A1F38";
  const accentBlue = "#4A6FFF";
  const accentGrn  = "#4ADE80";
  const accentOrng = "#F97316";
  const accentPurp = "#B5A8FF";
  const pillBg     = "#2B2560";
  const muted      = "#8B8FA8";
  const txt        = "#ffffff";
  const border     = "rgba(255,255,255,0.07)";
  const iconBg     = "#1C2448";

  return (
    <>
      {/* ── Battle Arena Banner ── */}
      {!homeSearch && (
        <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 10 }}>{t('home.multiplayer') || "Multiplayer"}</Text>
                    
                    <Pressable
                      onPress={() => {
                        if (appConfig?.featureFlags?.disableBattles) {
                          Alert.alert(
                            t('battle.cant_join') || "Battles Temporarily Unavailable",
                            t('battle.battles_disabled') || "Battle Arena is currently disabled while we perform maintenance. Please try again shortly."
                          );
                          return;
                        }
                        setActiveTab("battle" as any);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(251, 113, 133, 0.15)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        <Ionicons name="flame" size={20} color="#FB7185" />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }} numberOfLines={1}>
                          {t('battle.title') || "Battle Arena"}
                        </Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1} ellipsizeMode="tail">
                          {t('battle.subtitle') || "Challenge friends in real-time matches"}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={muted} />
                    </Pressable>
                  </View>
                )}

                {/* ── Create Flashcards Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 10 }}>{t('home.study_need_title') || "Study exactly what you need"}</Text>
                    
                    <View style={{
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                      }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Ionicons name="albums" size={24} color="#4F46E5" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('home.create_flashcards_title') || "Create your own flashcards"}</Text>
                      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>{t('home.study_need_sub') || "Study exactly what's on your test"}</Text>
                      
                      {/* Image placeholder */}
                      <View style={{ height: 88, backgroundColor: "#E0F2FE", borderRadius: 12, marginBottom: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <Ionicons name="document-text" size={48} color="#4F46E5" style={{ opacity: 0.8 }} />
                      </View>
                      
                      <Pressable
                        onPress={() => setShowAddMenu(true)}
                        style={({ pressed }) => ({
                          backgroundColor: "#4F46E5",
                          borderRadius: 14,
                          paddingVertical: 11,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{t('home.create_flashcards_btn') || "Create flashcards"}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── More Options ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 10 }}>{t('home.more') || "More"}</Text>
                    
                    <Pressable
                      onPress={async () => {
                        try {
                          const downloadLink = appConfig?.appLinks?.downloadUrl || appConfig?.appLinks?.playStoreUrl || "https://scorrapp.com/download";
                          await Share.share({
                            message: `Study smarter with Scorr! Create quizzes and flashcards with AI:\n${downloadLink}`,
                            url: downloadLink,
                          });
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('home.invite_friends') || "Invite your friends"}</Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>{t('home.invite_sub') || "Learn together and grow faster"}</Text>
                      </View>
                      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 26 }}>💌</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setShowFeedbackPage(true)}
                      style={({ pressed }) => ({
                        marginTop: 10,
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('profile.feedback') || "Feedback"}</Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>{t('home.feedback_sub') || "Help us improve"}</Text>
                      </View>
                      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 26 }}>💡</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
    </>
  );
}
