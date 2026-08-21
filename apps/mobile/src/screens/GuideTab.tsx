import YoutubeIframe from "react-native-youtube-iframe";
import { Linking } from "react-native";
import React from "react";
import { View, Text, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * GuideTab — Guide tab — how-to content.
 * Extracted from MainContentScreen/guide case (~100 lines).
 * Receives all state and handlers via p: any.
 */
export function GuideTab({ p }: { p: HomeScreenProps }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const { settingsDarkMode, setActiveTab, appConfig } = p;

  // --- verbatim from case "guide" in MainContentScreen ---
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Pressable onPress={() => setActiveTab("menu")} style={({ pressed }) => [{ padding: 8, borderRadius: 10,
                backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }, pressed && styles.pressedScale]}>
                <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#fff" : "#000"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText, { fontSize: 20, marginBottom: 2 }]}>How to Create a Quiz</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub, { fontSize: 12 }]}>Learn how to build, format, and load custom MCQ quizzes</Text>
              </View>
            </View>

            {/* Tutorial Video — react-native-youtube-iframe handles IFrame API properly */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Watch Tutorial Video</Text>
            <View style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, backgroundColor: "#000" }}>
              <YoutubeIframe
                videoId="jLiU-vW5EuA"
                height={220}
                play={false}
                webViewStyle={{ backgroundColor: "#000" }}
                initialPlayerParams={{
                  modestbranding: true,
                  rel: false,
                  controls: true,
                }}
                onError={() => {
                  const url = appConfig?.appLinks?.tutorialUrl || "https://youtu.be/jLiU-vW5EuA";
                  Linking.openURL(url);
                }}
              />
            </View>

            {/* Format Instructions */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Step 1: Format Your Text File (.qst)</Text>
            <View style={[styles.guideStepCard, !settingsDarkMode && styles.lightCard]}>
              <Text style={[styles.guideStepText, !settingsDarkMode && styles.lightTextSub]}>
                Scorr reads custom quizzes written in a simple text format. Create a plain text file ending in <Text style={{ color: "#00e5a0", fontWeight: "bold" }}>.qst</Text> and follow this layout:
              </Text>

              <View style={[styles.codeBlockContainer, !settingsDarkMode && styles.lightCodeBlock]}>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>@title</Text>: World Geography Quiz</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>@category</Text>: Geography</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}></Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeComment}># This is a comment</Text></Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>?</Text> What is the capital of France?</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> Berlin</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> Madrid</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeAnswer}>+</Text> Paris</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> Rome</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}></Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeTag}>?</Text> Name the muscle tone characteristic of children in the first months of life:</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> physiological hypotension of flexor muscles</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> decreased muscle tone in the hands</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeAnswer}>+</Text> physiological hypertension of flexor muscles</Text>
                <Text style={[styles.codeLine, !settingsDarkMode && styles.lightCodeLine]}><Text style={styles.codeWrong}>-</Text> decreased muscle tone in the legs</Text>
              </View>
              
              <Text style={[styles.guideStepTip, !settingsDarkMode && styles.lightTextSub]}>
                <Ionicons name="bulb-outline" size={13} color="#00e5a0" style={{ marginRight: 4 }} /> Tip: Use '@key: value' for quiz parameters. Start questions with '?' and prefix answer choices with '+' (correct) and '-' (incorrect).
              </Text>
            </View>

            {/* Import Instructions */}
            <Text style={[styles.sectionHeading, !settingsDarkMode && styles.lightText]}>Step 2: Create or Load in App</Text>
            <View style={[styles.guideStepCard, !settingsDarkMode && styles.lightCard]}>
              <View style={[styles.stepItemRow, !settingsDarkMode && styles.lightBorder]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, !settingsDarkMode && styles.lightText]}>Tap the Add (+) Button</Text>
                  <Text style={[styles.stepItemDesc, !settingsDarkMode && styles.lightTextSub]}>Go to the center tab on the bottom menu to open the Quiz Creator.</Text>
                </View>
              </View>

              <View style={[styles.stepItemRow, !settingsDarkMode && styles.lightBorder]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, !settingsDarkMode && styles.lightText]}>Define Quiz Settings</Text>
                  <Text style={[styles.stepItemDesc, !settingsDarkMode && styles.lightTextSub]}>Type in the title, choose a category, and specify the number of questions to draft your structure.</Text>
                </View>
              </View>

              <View style={[styles.stepItemRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepItemTitle, !settingsDarkMode && styles.lightText]}>Play & Customize</Text>
                  <Text style={[styles.stepItemDesc, !settingsDarkMode && styles.lightTextSub]}>Select your quiz on the Home screen to configure options like Shuffle, range selection, or question timers, then play!</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );


}
