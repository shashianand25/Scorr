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
 * QuizSetupView — Quiz creation setup (title, count, language) form.
 * Extracted from AddTab.tsx to reduce file size.
 */
export function QuizSetupView({ p }: { p: any }) {
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
        // ── Quiz creation flow ─────────────────────────────────────
        if (creationMode === "quiz" && creationStep === "setup") {
          return (
            <KeyboardWrapper
              behavior={Platform.OS === "ios" ? "padding" : "padding"}
              style={{ flex: 1 }}
              keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
            >
              <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(60, insets.bottom + 40) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.tabHeader}>
                  <Text style={[styles.tabTitle, !settingsDarkMode && styles.lightText]}>{t('create.title') || "Create Quiz"}</Text>
                  <Text style={[styles.tabSubtitle, !settingsDarkMode && styles.lightTextSub]}>{t('create.subtitle') || "Setup a new custom MCQ quiz structure"}</Text>
                </View>
  
                <View style={styles.formContainer}>
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.quiz_title') || "Quiz Title"}</Text>
                  <Pressable style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput]}>
                    <TextInput
                      placeholder={t('create.quiz_title_placeholder') || "e.g. Advanced Javascript"}
                      placeholderTextColor="#666"
                      style={[styles.formInput, !settingsDarkMode && styles.lightText]}
                      value={newTitle}
                      onChangeText={setNewTitle}
                    />
                  </Pressable>
  
  
  
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.num_questions') || "Questions Count"}</Text>
                  <Pressable style={[styles.webInputDummy, !settingsDarkMode && styles.lightInput]}>
                    <TextInput
                      placeholder="e.g. 5"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      style={[styles.formInput, !settingsDarkMode && styles.lightText]}
                      value={newQuestionsCount}
                      onChangeText={setNewQuestionsCount}
                    />
                  </Pressable>
  
                  <Text style={[styles.formLabel, !settingsDarkMode && styles.lightText]}>{t('create.language')}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
                    {["English", "Spanish", "French", "Hindi"].map((lang) => (
                      <Pressable
                        key={lang}
                        onPress={() => setNewQuizLanguage(lang)}
                        style={[
                          { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: settingsDarkMode ? "#141930" : "#f0f0f0" },
                          newQuizLanguage === lang && { backgroundColor: "rgba(99, 102, 241, 0.15)", borderWidth: 1, borderColor: "#6366f1" }
                        ]}
                      >
                        <Text style={[
                          { fontSize: 14, color: settingsDarkMode ? "#ccc" : "#666" },
                          newQuizLanguage === lang && { color: "#6366f1", fontWeight: "bold" }
                        ]}>{lang}</Text>
                      </Pressable>
                    ))}
                  </View>
  
                  <Pressable onPress={handleProceedToDrafting} style={styles.createButton}>
                    <Text style={styles.createButtonText}>{t('create.next_btn') || "Next: Draft Questions"}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </KeyboardWrapper>
          );
        }
}
