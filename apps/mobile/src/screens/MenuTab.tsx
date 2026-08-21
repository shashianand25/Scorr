import i18n from "../lib/i18n";
import { getUserInitial, getUserFullName } from "../utils/user";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * MenuTab — Menu/settings tab.
 * Extracted from MainContentScreen/menu case (~199 lines).
 * Receives all state and handlers via p: any.
 */
export function MenuTab({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const {
    settingsDarkMode, setSettingsDarkMode,
    firebaseUser, signOutLoading, handleSignOut,
    openAuthScreen, setShowLanguageModal,
    setActiveTab, setShowFeedbackPage,
    setShowPrivacyPolicy, setShowTermsOfService,
    setShowLogoutConfirm, setShowDeleteAccountConfirm,
  } = p;

  // --- verbatim from case "menu" in MainContentScreen ---
        return (() => {
          const isDark  = true; // Forced dark theme
          const bg      = "#0B0F1E";
          const cardBg  = "#141930";
          const border  = "rgba(255,255,255,0.07)";
          const muted   = "#8B8FA8";
          const txt     = "#ffffff";

          const Row = ({ icon, iconBg, iconColor, title, sub, onPress, right }: any) => (
            <AnimatedPressable onPress={onPress}
              style={{
                backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                borderRadius: 14, padding: 14, paddingHorizontal: 16,
                flexDirection: "row", alignItems: "center", gap: 12,
              }}>
              <View style={{ width: 32, height: 32, borderRadius: 10,
                backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={icon} size={16} color={iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: title === "Reset statistics" ? "#e24b4a" : txt }}>
                  {title}
                </Text>
                {sub ? <Text style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)", marginTop: 2, fontWeight: "400" }}>{sub}</Text> : null}
              </View>
              {right}
            </AnimatedPressable>
          );

          const Chevron = () => <Ionicons name="chevron-forward" size={16} color={muted} />;

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              {/* Sign-out loading overlay */}
              {signOutLoading && (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
                  backgroundColor: "rgba(10,10,15,0.92)", alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="large" color="#6366f1" />
                  <Text style={{ marginTop: 14, fontSize: 14, color: muted }}>{t('profile.signing_out') || "Signing out…"}</Text>
                </View>
              )}


              <ScrollView showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}>

                {/* ── Top bar ── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>
                    {t('profile.title') || "Profile"}
                  </Text>
                </View>

                {/* ── Identity card ── */}
                <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: cardBg,
                  borderWidth: 1, borderColor: border, borderRadius: 20, padding: 20,
                  flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden" }}>
                  {/* Top accent line */}
                  <View style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1,
                    backgroundColor: isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.15)" }} />

                  {/* Avatar */}
                  <View style={{ width: 52, height: 52, borderRadius: 16,
                    backgroundColor: firebaseUser ? "#6366f1" : "rgba(99,102,241,0.1)",
                    borderWidth: 1, borderColor: isDark ? "#2a2a4a" : "rgba(99,102,241,0.2)",
                    alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {firebaseUser?.photoURL
                      ? <Image source={{ uri: firebaseUser.photoURL }} style={{ width: 52, height: 52 }} />
                      : firebaseUser
                        ? <Text style={{ fontSize: 20, fontWeight: "700", color: "#fff" }}>{getUserInitial(firebaseUser)}</Text>
                        : <Ionicons name="person-outline" size={24} color="#6366f1" />
                    }
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "500", color: txt }} numberOfLines={1}>
                      {firebaseUser ? getUserFullName(firebaseUser) : (t('profile.guest') || "Guest")}
                    </Text>
                    <Text style={{ fontSize: 11, color: muted, marginTop: 3, fontWeight: "300" }} numberOfLines={1}>
                      {firebaseUser ? firebaseUser.email ?? "" : (t('profile.guest_sub') || "// sign in to sync your data")}
                    </Text>
                  </View>

                  {/* Sign in / synced */}
                  {firebaseUser ? (
                    <View style={{ backgroundColor: "rgba(99,102,241,0.1)", borderRadius: 8,
                      paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(99,102,241,0.2)" }}>
                      <Text style={{ fontSize: 10, color: "#6366f1", fontWeight: "600", letterSpacing: 0.5 }}>{t('profile.synced') || "SYNCED"}</Text>
                    </View>
                  ) : (
                    <Pressable onPress={openAuthScreen}
                      style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 10,
                        paddingHorizontal: 14, paddingVertical: 8 }, pressed && styles.pressedScale]}>
                      <Text style={{ fontSize: 11, fontWeight: "500", color: "#fff" }}>{t('profile.signin') || "Sign in"}</Text>
                    </Pressable>
                  )}
                </View>

                {/* ── Preferences ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>{t('profile.preferences') || 'Preferences'}</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>

                  {/* Language selector */}
                  <AnimatedPressable
                    onPress={() => setShowLanguageModal(true)}
                    style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                      borderRadius: 14, padding: 14, paddingHorizontal: 16,
                      flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 10,
                      backgroundColor: "rgba(99,102,241,0.1)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="language-outline" size={16} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>{t('profile.language') || 'Language'}</Text>
                      <Text style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.7)", marginTop: 2, fontWeight: "400" }}>
                        {i18n.language === 'en' ? 'English' : 
                         i18n.language === 'es' ? 'Spanish' : 
                         i18n.language === 'fr' ? 'French' : 
                         i18n.language === 'hi' ? 'Hindi' : 
                         i18n.language === 'ru' ? 'Russian' : 
                         i18n.language === 'kk' ? 'Kazakh' : 'System language'}
                      </Text>
                    </View>
                    <Chevron />
                  </AnimatedPressable>
                </View>

                {/* ── Support ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>{t('profile.support') || 'Support'}</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>
                  <Row icon="book-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={t('profile.guide') || "How to format quiz (.txt, .docx)"} sub={t('profile.guide_sub') || "Formatting guide"}
                    onPress={() => setActiveTab("guide")} right={<Chevron />} />
                  <Row icon="chatbubble-ellipses-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={t('profile.feedback') || "Feedback"} sub={t('profile.feedback_sub') || "Help improve Scorr"}
                    onPress={() => setShowFeedbackPage(true)} right={<Chevron />} />
                </View>

                {/* ── About ── */}
                <Text style={{ fontSize: 10, color: muted, letterSpacing: 1.2, textTransform: "uppercase",
                  paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>{t('profile.about') || 'About'}</Text>

                <View style={{ paddingHorizontal: 20, gap: 6 }}>
                  <Row icon="lock-closed-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={t('profile.privacy_policy') || "Privacy policy"} 
                    onPress={() => setShowPrivacyPolicy(true)} right={<Chevron />} />
                  <Row icon="document-text-outline" iconBg="rgba(99,102,241,0.1)" iconColor="#6366f1"
                    title={t('profile.terms_of_service') || "Terms of service"} 
                    onPress={() => setShowTermsOfService(true)} right={<Chevron />} />
                </View>

                {/* ── Danger zone ── */}
                <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 6 }}>
                  {firebaseUser && (
                    <AnimatedPressable
                      onPress={() => setShowLogoutConfirm(true)}
                      disabled={signOutLoading}
                      style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="log-out-outline" size={16} color={txt} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: txt }}>{t('profile.logout') || "Logout"}</Text>
                      </View>
                    </AnimatedPressable>
                  )}

                  {firebaseUser && (
                    <AnimatedPressable
                      onPress={() => setShowDeleteAccountConfirm(true)}
                      style={{ backgroundColor: cardBg, borderWidth: 1, borderColor: border,
                        borderRadius: 14, padding: 14, paddingHorizontal: 16,
                        flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10,
                        backgroundColor: "rgba(226,75,74,0.1)", alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name="trash-bin-outline" size={16} color="#e24b4a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: "500", color: "#e24b4a" }}>{t('profile.delete_account') || "Delete account"}</Text>
                      </View>
                    </AnimatedPressable>
                  )}
                </View>

              </ScrollView>
            </View>
          );
        })();



}
