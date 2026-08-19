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
 * Feedback, privacy policy, terms of service
 * Extracted from AppModals.tsx god-file.
 */
export function FeedbackLegalModals({ p }: { p: any }) {
  const { t } = useTranslation();
  return (
    <>
      {/* ── Feedback — full-screen slide-up page ── */}
      {!!p.showFeedbackPage && (
      <Modal visible={true} animationType="slide" transparent={true} statusBarTranslucent={true} onRequestClose={() => closeOrDismiss(() => (p.setShowFeedbackPage || (() => {}))(false))}>
        <KeyboardWrapper
          style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0B0F1E" : "#f4f4f8" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: 20 }}>
            <Pressable
              onPress={() => { (p.setShowFeedbackPage || (() => {}))(false); (p.setFeedbackText || (() => {}))(""); }}
              style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                backgroundColor: p.settingsDarkMode ? "#141930" : "rgba(0,0,0,0.06)", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "transparent" }, pressed && styles.pressedScale]}
            >
              <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: p.settingsDarkMode ? "#fff" : "#0d0f14", marginLeft: 14 }}>Feedback</Text>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 16) + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{
              borderRadius: 24, padding: 24, marginBottom: 20,
              backgroundColor: p.settingsDarkMode ? "#141930" : "#ffffff",
              borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "#e5e5ea",
            }}>
              <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(99,102,241,0.15)",
                alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color="#818cf8" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: p.settingsDarkMode ? "#fff" : "#0d0f14", marginBottom: 6, letterSpacing: -0.3 }}>
                {t('profile.feedback_title') || "Share your thoughts"}
              </Text>
              <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "#666677", lineHeight: 20 }}>
                {t('profile.feedback_desc') || "Found a bug? Have a suggestion? Want a new feature? We're all ears."}
              </Text>
            </View>

            {/* Text area */}
            <TextInput
              multiline
              placeholder={t('profile.feedback_placeholder') || "Tell us what you think…"}
              placeholderTextColor={p.settingsDarkMode ? "#555555" : "#c0c0d0"}
              style={{
                backgroundColor: p.settingsDarkMode ? "#141930" : "#ffffff",
                borderRadius: 18, padding: 18,
                color: p.settingsDarkMode ? "#fff" : "#0d0f14", fontSize: 15,
                minHeight: 180, textAlignVertical: "top",
                borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "#e5e5ea",
                marginBottom: 20,
              }}
              value={p.feedbackText}
              onChangeText={p.setFeedbackText}
            />

            <AnimatedPressable
              onPress={async () => { 
                if ((p.feedbackText || "").trim().length === 0) {
                  Alert.alert("Empty Feedback", "Please write something before sending.");
                  return;
                }
                (p.setFeedbackLoading || (() => {}))(true);
                const { ok, error } = await (p.sendFeedback || (() => {}))({
                  userId: p.firebaseUser?.uid,
                  userEmail: p.firebaseUser?.email || undefined,
                  message: p.feedbackText
                });
                (p.setFeedbackLoading || (() => {}))(false);
                if (ok) {
                  Alert.alert("Thank You!", "Your feedback has been sent directly to the developer.");
                  (p.setShowFeedbackPage || (() => {}))(false); 
                  (p.setFeedbackText || (() => {}))("");
                } else {
                  console.warn("Failed to send feedback", error);
                  Alert.alert("Error", "Could not send feedback. Please try again later.");
                }
              }}
              disabled={p.feedbackLoading}
              style={{
                height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center",
                backgroundColor: p.feedbackLoading ? "#818cf8" : "#6366f1",
              }}
            >
              {p.feedbackLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>{t('profile.send_feedback') || "Send Feedback"}</Text>
              )}
            </AnimatedPressable>
          </ScrollView>
        </KeyboardWrapper>
      </Modal>
      )}

      {/* ── Privacy Policy Modal ── */}
      {!!p.showPrivacyPolicy && (
      <Modal visible={true} animationType="slide" transparent={true} statusBarTranslucent={true} onRequestClose={() => (p.setShowPrivacyPolicy || (() => {}))(false)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb" }}>

          {/* Sticky header */}
          <View style={{ paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: 16, paddingHorizontal: 20,
            backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb",
            borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => (p.setShowPrivacyPolicy || (() => {}))(false)}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.3 }}>Privacy Policy</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}>

            {/* Hero banner */}
            <LinearGradient colors={p.settingsDarkMode ? ["#1a1040", "#0d1535"] : ["#ebe9ff", "#f0f4ff"]}
              style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 22,
                backgroundColor: p.settingsDarkMode ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.12)",
                borderWidth: 1.5, borderColor: p.settingsDarkMode ? "rgba(99,102,241,0.4)" : "rgba(99,102,241,0.2)",
                alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="lock-closed" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14",
                letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>Privacy Policy</Text>
              <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#818cf8" : "#6366f1", fontWeight: "600",
                textAlign: "center", marginBottom: 12 }}>Scorr App · Last updated August 2026</Text>
              <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                We believe your data belongs to you. Here's exactly what we collect, why, and how we keep it safe.
              </Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              {[
                { num: "01", icon: "person-outline" as const, accent: "#6366f1", title: "Information We Collect",
                  body: "When you sign in with Google or Email, we collect your name, email address, and profile photo solely to create and authenticate your Scorr account. If you use the app without signing in, we collect no personal data whatsoever." },
                { num: "02", icon: "school-outline" as const, accent: "#8b5cf6", title: "Quiz & Flashcard Data",
                  body: "Your quizzes, flashcard decks, attempt history, correct/wrong answers, and study streaks are stored in our secure database and linked to your account. This enables your study progress to sync seamlessly across your devices." },
                { num: "03", icon: "sparkles-outline" as const, accent: "#ec4899", title: "AI Processing (Google Gemini)",
                  body: "When you use AI Quiz Generation from text, PDFs, or PPTs, the content is securely processed via Google Gemini APIs exclusively to extract questions and flashcards. We do not sell or use your uploaded study materials to train public AI models." },
                { num: "04", icon: "people-outline" as const, accent: "#a855f7", title: "Multiplayer Battles & Sharing",
                  body: "When you participate in multiplayer Battle Mode or share a quiz, your public display name and in-game match scores are visible to other participants in that battle room or to anyone with your shared quiz link." },
                { num: "05", icon: "phone-portrait-outline" as const, accent: "#06b6d4", title: "Local Storage",
                  body: "Your device uses secure local storage to cache quizzes, settings, and session data for quick access. This data lives only on your device and is never shared with third parties." },
                { num: "06", icon: "analytics-outline" as const, accent: "#10b981", title: "How We Use Your Data",
                  body: "Your data is used exclusively to power the Scorr experience — syncing your progress, generating study stats, and personalizing your review sessions. We do not sell, rent, or monetize your data with advertisers, ever." },
                { num: "07", icon: "shield-checkmark-outline" as const, accent: "#f59e0b", title: "Data Security",
                  body: "All data in transit is protected by industry-standard HTTPS/TLS encryption. Authentication is managed securely by Firebase. We never store or have access to raw user passwords." },
                { num: "08", icon: "trash-outline" as const, accent: "#ef4444", title: "Deleting Your Data",
                  body: "You can permanently delete your account and all associated data at any time from Profile → Delete account, or via our web deletion portal. Deletion immediately removes your profile, quizzes, flashcards, and history from our servers." },
                { num: "09", icon: "mail-outline" as const, accent: "#6366f1", title: "Contact Us",
                  body: "Questions about this policy or requests for data deletion? Reach us at shashianand2005@gmail.com and we will respond promptly." },
              ].map((s, i, arr) => (
                <View key={i}>
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 20 }}>
                    {/* Left accent + number */}
                    <View style={{ alignItems: "center", width: 44 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14,
                        backgroundColor: `${s.accent}18`, borderWidth: 1.5,
                        borderColor: `${s.accent}30`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={s.icon} size={20} color={s.accent} />
                      </View>
                      {i < arr.length - 1 && (
                        <View style={{ width: 1.5, flex: 1, marginTop: 8,
                          backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: s.accent, letterSpacing: 1.2 }}>{s.num}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "700",
                          color: p.settingsDarkMode ? "#e2e8f0" : "#0d0f14", letterSpacing: -0.2 }}>{s.title}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                        lineHeight: 22 }}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
              {/* Footer */}
              <View style={{ marginTop: 8, padding: 20, borderRadius: 16,
                backgroundColor: p.settingsDarkMode ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.06)",
                borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.12)",
                alignItems: "center" }}>
                <Ionicons name="shield-checkmark" size={24} color="#6366f1" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#818cf8" : "#4f46e5",
                  textAlign: "center", lineHeight: 20 }}>Your privacy is our priority.{"\n"}Scorr will never misuse your data.</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
      )}

      {/* ── Terms of Service Modal ── */}
      {!!p.showTermsOfService && (
      <Modal visible={true} animationType="slide" transparent={true} statusBarTranslucent={true} onRequestClose={() => (p.setShowTermsOfService || (() => {}))(false)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb" }}>

          {/* Sticky header */}
          <View style={{ paddingTop: Math.max(insets.top, 16) + 12, paddingBottom: 16, paddingHorizontal: 20,
            backgroundColor: p.settingsDarkMode ? "#0a0f1e" : "#f6f7fb",
            borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable onPress={() => (p.setShowTermsOfService || (() => {}))(false)}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#fff" : "#0d0f14"} />
            </Pressable>
            <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#fff" : "#0d0f14", letterSpacing: -0.3 }}>Terms of Service</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 40 }}>

            {/* Hero banner */}
            <LinearGradient colors={p.settingsDarkMode ? ["#0d2010", "#0d1535"] : ["#e6fff5", "#f0f9ff"]}
              style={{ paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, alignItems: "center" }}>
              <View style={{ width: 72, height: 72, borderRadius: 22,
                backgroundColor: p.settingsDarkMode ? "rgba(0,229,160,0.2)" : "rgba(0,229,160,0.12)",
                borderWidth: 1.5, borderColor: p.settingsDarkMode ? "rgba(0,229,160,0.35)" : "rgba(0,229,160,0.25)",
                alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="document-text" size={32} color="#00e5a0" />
              </View>
              <Text style={{ fontSize: 26, fontWeight: "900", color: p.settingsDarkMode ? "#fff" : "#0d0f14",
                letterSpacing: -0.5, textAlign: "center", marginBottom: 10 }}>Terms of Service</Text>
              <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#34d399" : "#059669", fontWeight: "600",
                textAlign: "center", marginBottom: 12 }}>Scorr App · Last updated August 2026</Text>
              <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                textAlign: "center", lineHeight: 22, maxWidth: 300 }}>
                Simple, fair terms for using Scorr. By using the app, you agree to these.
              </Text>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, paddingTop: 28 }}>
              {[
                { num: "01", icon: "checkmark-circle-outline" as const, accent: "#00e5a0", title: "Acceptance of Terms",
                  body: "By downloading or using Scorr, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue using the app." },
                { num: "02", icon: "phone-portrait-outline" as const, accent: "#06b6d4", title: "Use of the App",
                  body: "Scorr is a study platform for creating quizzes, studying flashcards, and participating in learning battles. You may not use Scorr for any unlawful purpose or to distribute abusive, harmful, or infringing material." },
                { num: "03", icon: "sparkles-outline" as const, accent: "#ec4899", title: "AI-Generated Content",
                  body: "Scorr utilizes AI to generate quizzes and flashcards from your provided materials. While we strive for high educational accuracy, AI outputs may occasionally contain errors. Always verify critical facts with official study materials." },
                { num: "04", icon: "document-outline" as const, accent: "#8b5cf6", title: "Your Content & Ownership",
                  body: "You retain full ownership of all notes, quizzes, and flashcards you create or upload. You grant Scorr a limited license solely to store, process, and display your content to provide the service to you." },
                { num: "05", icon: "people-outline" as const, accent: "#6366f1", title: "Multiplayer & Fair Play",
                  body: "When using Battle Mode, you agree to play fairly, avoid offensive display names, and respect other players. We reserve the right to restrict access for users who harass or disrupt the community." },
                { num: "06", icon: "cloud-outline" as const, accent: "#3b82f6", title: "Cloud Sync & Service Availability",
                  body: "Your study data syncs to our cloud infrastructure when online. While we aim for maximum uptime, Scorr is provided on a best-effort basis and we cannot guarantee 100% uninterrupted access." },
                { num: "07", icon: "ban-outline" as const, accent: "#ef4444", title: "Prohibited Activities",
                  body: "You agree not to: reverse-engineer or attempt to decompile the app, abuse or spam API endpoints, exploit automated bots, or attempt unauthorized access to our servers or other users' data." },
                { num: "08", icon: "construct-outline" as const, accent: "#f59e0b", title: "Modifications to Service",
                  body: "We may update features, policies, or system requirements from time to time to improve Scorr. Continued use of Scorr following any updates constitutes acceptance of the revised terms." },
                { num: "09", icon: "mail-outline" as const, accent: "#00e5a0", title: "Contact Us",
                  body: "Have questions about these terms? Contact our team at shashianand2005@gmail.com and we will assist you." },
              ].map((s, i, arr) => (
                <View key={i}>
                  <View style={{ flexDirection: "row", gap: 14, paddingVertical: 20 }}>
                    {/* Left accent icon with connector line */}
                    <View style={{ alignItems: "center", width: 44 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 14,
                        backgroundColor: `${s.accent}18`, borderWidth: 1.5,
                        borderColor: `${s.accent}30`, alignItems: "center", justifyContent: "center" }}>
                        <Ionicons name={s.icon} size={20} color={s.accent} />
                      </View>
                      {i < arr.length - 1 && (
                        <View style={{ width: 1.5, flex: 1, marginTop: 8,
                          backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)" }} />
                      )}
                    </View>
                    {/* Content */}
                    <View style={{ flex: 1, paddingTop: 4 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: s.accent, letterSpacing: 1.2 }}>{s.num}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "700",
                          color: p.settingsDarkMode ? "#e2e8f0" : "#0d0f14", letterSpacing: -0.2 }}>{s.title}</Text>
                      </View>
                      <Text style={{ fontSize: 13.5, color: p.settingsDarkMode ? "#94a3b8" : "#555577",
                        lineHeight: 22 }}>{s.body}</Text>
                    </View>
                  </View>
                </View>
              ))}
              {/* Footer */}
              <View style={{ marginTop: 8, padding: 20, borderRadius: 16,
                backgroundColor: p.settingsDarkMode ? "rgba(0,229,160,0.06)" : "rgba(0,229,160,0.07)",
                borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(0,229,160,0.15)" : "rgba(0,229,160,0.15)",
                alignItems: "center" }}>
                <Ionicons name="document-text" size={24} color="#00e5a0" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#34d399" : "#059669",
                  textAlign: "center", lineHeight: 20 }}>These terms are designed to be fair and transparent.{"\n"}Thank you for using Scorr.</Text>
              </View>
              <View style={{ height: 40 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
      )}

    </>
  );
}
