const createFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null, neonDeck: null });
const updateFlashcardDeck = async (..._args: any[]) => ({ deck: null, error: null });
import React, { useState } from "react";
import {
  View, Text, Pressable, ScrollView, FlatList, Modal,
  TextInput, ActivityIndicator, Animated, Image, Platform,
  Share, Dimensions, Alert, KeyboardAvoidingView,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import { AnimatedPressable } from "../components/ui/AnimatedPressable";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");


/**
 * QuizDraftingView — Question-by-question quiz drafting editor.
 * Extracted from AddTab.tsx to reduce file size.
 */
export function QuizDraftingView({ p }: { p: any }) {
  const {
    settingsDarkMode, updateDraftOptionText, deleteDraftOption, addDraftOption,
    handleDraftBack, draftCurrentIndex, setDraftCurrentIndex,
    handleSaveDraftedQuiz, nameDeckAction, showEllipsisMenu, setShowEllipsisMenu,
    insets, setDeckNameInput, fcTitle, setNameDeckAction, setShowNameDeckModal,
    fcCards, fcCurrentIdx, setFcCards, setFcCurrentIdx, editingDeckId,
    setFlashcardDecks, flashcardDecks, firebaseUser, deleteFlashcardDeck,
    setEditingDeckId, setFcTitle, setCreationMode, setActiveTab,
    showPreviewModal, setShowPreviewModal, renderFormattedText, creationMode,
    creationStep, newTitle, setNewTitle, newQuestionsCount, setNewQuestionsCount,
    setNewQuizLanguage, newQuizLanguage, handleProceedToDrafting, draftQuestions,
    updateDraftPrompt, selectDraftOptionCorrect,
    setCardType, cardType, fcCategory, setFcCategory,
  } = p;

  const [showDeckPicker, setShowDeckPicker] = useState(false);
  const [isFrontFocused, setIsFrontFocused] = useState(false);
  const [isFrontCollapsed, setIsFrontCollapsed] = useState(false);
  const [isBackFocused, setIsBackFocused] = useState(false);
  const [isBackCollapsed, setIsBackCollapsed] = useState(false);
  const [showNameDeckModal, setShowNameDeckModalLocal] = useState(false);
  const [deckNameInput, setDeckNameInputLocal] = useState("");
  const [activeInput, setActiveInput] = useState<"front" | "back">("front");

  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;
        if (creationMode === "quiz" && creationStep === "drafting") {
        const currentDraftQuestion = draftQuestions[draftCurrentIndex];
        const totalDraftCount = parseInt(newQuestionsCount) || 0;
        // Layout tracking refs for precise scroll-to-option behaviour
        const draftFormContainerY = (globalThis as any)._draftFormContainerY ?? 0;
        const draftOptionsContainerY = (globalThis as any)._draftOptionsContainerY ?? 0;
        const draftOptionRowYs: number[] = (globalThis as any)._draftOptionRowYs ?? [];

        return (
          <KeyboardWrapper
            behavior={Platform.OS === "ios" ? "padding" : "padding"}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 80}
          >
            <ScrollView
              ref={(ref) => { (globalThis as any)._draftScrollRef = ref; }}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(80, insets.bottom + 60) }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>{t('create.draft_title') || "Draft Questions"}</Text>
                <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>
                  Question {draftCurrentIndex + 1} of {totalDraftCount}
                </Text>
              </View>

              {currentDraftQuestion && (
                <View
                style={styles.formContainer}
                onLayout={(e) => { (globalThis as any)._draftFormContainerY = e.nativeEvent.layout.y; }}
              >
                  {/* Visual Progress Bar */}
                  <View style={{ width: "100%", height: 6, backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: 3, marginBottom: 20, overflow: "hidden" }}>
                    <View style={{ width: `${((draftCurrentIndex + 1) / totalDraftCount) * 100}%`, height: "100%", backgroundColor: "#00e5a0" }} />
                  </View>

                  {/* Question Prompt */}
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.question_prompt') || "Question Prompt"}</Text>
                  <View style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput, { height: 100, paddingVertical: 8 }]}>
                    <TextInput
                      placeholder={t('create.question_placeholder') || "Enter your question prompt here..."}
                      placeholderTextColor="#666"
                      multiline
                      style={[styles.formInput, !settingsDarkMode && styles.lightText, { height: "100%", textAlignVertical: "top" }]}
                      value={currentDraftQuestion.prompt}
                      onChangeText={updateDraftPrompt}
                    />
                  </View>

                  {/* Question Options/Answers */}
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText, { marginTop: 15, marginBottom: 4 }]}>
                    {t('create.options') || "Options / Choices"}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#888888", marginBottom: 12 }}>
                    {t('create.options_desc') || "Type answer texts below and select the correct answer amongst them."}
                  </Text>

                  <View
                    style={{ gap: 10, marginBottom: 15 }}
                    onLayout={(e) => { (globalThis as any)._draftOptionsContainerY = e.nativeEvent.layout.y; }}
                  >
                    {currentDraftQuestion.answers.map((ans: any, optIdx: number) => {
                      const isOptionCorrect = ans.isCorrect;
                      return (
                        <View
                          key={ans.id || String(optIdx)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                          onLayout={(e) => {
                            if (!(globalThis as any)._draftOptionRowYs) (globalThis as any)._draftOptionRowYs = [];
                            (globalThis as any)._draftOptionRowYs[optIdx] = e.nativeEvent.layout.y;
                          }}
                        >
                          {/* Radio selection indicator */}
                          <Pressable 
                            onPress={() => selectDraftOptionCorrect(optIdx)}
                            style={({ pressed }) => [
                              {
                                width: 22,
                                height: 22,
                                borderRadius: 11,
                                borderWidth: 2,
                                borderColor: isOptionCorrect ? "#00e5a0" : (settingsDarkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)"),
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: isOptionCorrect ? "rgba(0, 229, 160, 0.1)" : "transparent"
                              },
                              pressed && styles.opacityPress
                            ]}
                          >
                            {isOptionCorrect && (
                              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#00e5a0" }} />
                            )}
                          </Pressable>

                          {/* Text input for option */}
                          <View style={[{ flex: 1, height: 44, borderRadius: 10, backgroundColor: "rgba(255, 255, 255, 0.05)", borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingHorizontal: 12, justifyContent: "center" }, !settingsDarkMode && styles.lightInput]}>
                            <TextInput
                              placeholder={`Option ${optIdx + 1}`}
                              placeholderTextColor="#666"
                              style={[styles.formInput, !settingsDarkMode && styles.lightText, { fontSize: 13 }]}
                              value={ans.text}
                              onChangeText={(text: any) => updateDraftOptionText(optIdx, text)}
                              onFocus={() => {
                                if (optIdx >= 2) {
                                  setTimeout(() => {
                                    const rowY =
                                      ((globalThis as any)._draftFormContainerY ?? 0) +
                                      ((globalThis as any)._draftOptionsContainerY ?? 0) +
                                      (((globalThis as any)._draftOptionRowYs ?? [])[optIdx] ?? 0);
                                    // Scroll so the focused option sits ~80px below the top — not all the way down
                                    (globalThis as any)._draftScrollRef?.scrollTo({ y: Math.max(0, rowY - 80), animated: true });
                                  }, 300);
                                }
                              }}
                            />
                          </View>

                          {/* Delete option button */}
                          {currentDraftQuestion.answers.length > 2 && (
                            <Pressable 
                              onPress={() => deleteDraftOption(optIdx)}
                              style={({ pressed }) => [
                                { padding: 8 },
                                pressed && styles.opacityPress
                              ]}
                            >
                              <Feather name="trash-2" size={16} color="#ef4444" />
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Add Option button */}
                  <Pressable
                    onPress={addDraftOption}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        alignSelf: "flex-start",
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.15)",
                        marginBottom: 20
                      },
                      !settingsDarkMode && { borderColor: "rgba(0, 0, 0, 0.15)" },
                      pressed && styles.opacityPress
                    ]}
                  >
                    <Feather name="plus" size={14} color="#00e5a0" />
                    <Text style={[{ fontSize: 12, fontWeight: "bold", color: "#00e5a0" }]}>{t('create.add_option') || "Add Option"}</Text>
                  </Pressable>

                  {/* Navigation Footer Row */}
                  <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
                    <Pressable 
                      onPress={handleDraftBack}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          height: 48,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: settingsDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
                          alignItems: "center",
                          justifyContent: "center"
                        },
                        pressed && styles.opacityPress
                      ]}
                    >
                      <Text style={[{ fontSize: 14, fontWeight: "bold", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }]}>
                        {draftCurrentIndex === 0 ? "Back to Setup" : "Previous Q"}
                      </Text>
                    </Pressable>

                    {draftCurrentIndex < totalDraftCount - 1 ? (
                      <Pressable 
                        onPress={() => {
                          // Validate current question prompt before moving on
                          if (!currentDraftQuestion.prompt.trim()) {
                            if (Platform.OS === "web") alert("Please enter a question prompt.");
                            else Alert.alert("Error", "Please enter a question prompt.");
                            return;
                          }
                          const filledOpts = currentDraftQuestion.answers.filter((a: any) => a.text.trim());
                          if (filledOpts.length < 2) {
                            if (Platform.OS === "web") alert("Please enter at least 2 non-empty options.");
                            else Alert.alert("Error", "Please enter at least 2 non-empty options.");
                            return;
                          }
                          const correctFilled = filledOpts.find((a: any) => a.isCorrect);
                          if (!correctFilled) {
                            if (Platform.OS === "web") alert("Please select a correct answer amongst non-empty options.");
                            else Alert.alert("Error", "Please select a correct answer amongst non-empty options.");
                            return;
                          }
                          setDraftCurrentIndex(draftCurrentIndex + 1);
                        }}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: "#00e5a0",
                            alignItems: "center",
                            justifyContent: "center"
                          },
                          pressed && styles.opacityPress
                        ]}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#000000" }}>Next Question</Text>
                      </Pressable>
                    ) : (
                      <Pressable 
                        onPress={handleSaveDraftedQuiz}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            height: 48,
                            borderRadius: 12,
                            backgroundColor: "#00e5a0",
                            alignItems: "center",
                            justifyContent: "center"
                          },
                          pressed && styles.opacityPress
                        ]}
                      >
                        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#000000" }}>Save & Create Quiz</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardWrapper>
        );
}
}
}
