import { ToggleSwitch } from "../ui/ToggleSwitch";
import React from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, FlatList, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../../styles/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import type { QuizCreationModalProps } from "../../types/QuizCreationModalProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const closeOrDismiss = (fn: () => void) => fn();
const KeyboardWrapper = Platform.OS === "ios" ? require("react-native").KeyboardAvoidingView : View;

/**
 * Quiz created, start quiz settings, time limit, PDF viewer
 * Extracted from AppModals.tsx god-file.
 * Receives typed QuizCreationModalProps interface.
 */
export function QuizCreationModals({ p }: { p: QuizCreationModalProps }) {
  const { t } = useTranslation();
  const insets = p.insets || { top: 0, bottom: 0, left: 0, right: 0 };
  const optionsScrollRef = p.optionsScrollRef || { current: null };
  const setQuizPreset = p.setQuizPreset || (() => {});
  const setQuizSetupStep = p.setQuizSetupStep || (() => {});
  const setShuffleQuestions = p.setShuffleQuestions || (() => {});
  const setShuffleAnswers = p.setShuffleAnswers || (() => {});
  const setShowAnswerOnSubmit = p.setShowAnswerOnSubmit || (() => {});
  const totalQuestions = p.totalQuestions || 10;
  const unansweredCount = p.unansweredCount || 0;
  const Stepper = p.Stepper || (({ value, onValueChange }: any) => null);

  const { questionCount, quizPreset, wrongCount } = p;
  return (
    <>
      {/* ── Quiz Created Success Modal ── */}
      {p.showQuizCreatedModal != null && (
      <Modal visible={true} animationType="fade" transparent onRequestClose={() => (p.setShowQuizCreatedModal || (() => {}))(null)}>
        <Pressable style={styles.centerModalBackdrop} onPress={() => (p.setShowQuizCreatedModal || (() => {}))(null)}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { paddingBottom: 28 }]} onStartShouldSetResponder={() => true}>
            <View style={[styles.dialogIcon, { backgroundColor: "rgba(0, 229, 160, 0.12)" }]}>
              <Ionicons name="checkmark-circle" size={36} color="#00e5a0" />
            </View>
            <Text style={[styles.dialogTitle, !p.settingsDarkMode && styles.lightText]}>Quiz Created!</Text>
            <Text style={[styles.dialogDescription, !p.settingsDarkMode && styles.lightTextSub, { textAlign: "center", lineHeight: 20, marginBottom: 20 }]}>
              <Text style={{ color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontWeight: "700" }}>"{p.showQuizCreatedModal?.title}"</Text>
              {" "}was created successfully with{" "}
              <Text style={{ color: "#00e5a0", fontWeight: "700" }}>{p.showQuizCreatedModal?.count} questions</Text>
              . Ready to practice!
            </Text>
            <Pressable
              onPress={() => (p.setShowQuizCreatedModal || (() => {}))(null)}
              style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#00e5a0", width: "100%" }, pressed && styles.pressedScale]}
            >
              <Text style={styles.dialogConfirmText}>Start Practicing →</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      )}

      
      {/* Quiz Options Popup Modal (Sleek Compact Format) */}
      {p.selectedQuiz != null && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          statusBarTranslucent={true}
          onRequestClose={() => {
            if (p.setSelectedQuiz) p.setSelectedQuiz(null);
            setQuizSetupStep("presets");
          }}
        >
          <KeyboardWrapper style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <SafeAreaView style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }} edges={["top", "left", "right"]}>
              
              {/* ── UNIFIED OPTIONS SCREEN ── */}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 24, fontWeight: "600", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontFamily: "serif" }}>{t('study_modes.how_to_study') || "How would you like to study?"}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      if (p.setSelectedQuiz) p.setSelectedQuiz(null);
                      setQuizSetupStep("presets");
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}
                  >
                    <Feather name="x" size={24} color={p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"} />
                  </Pressable>
                </View>

                <ScrollView ref={optionsScrollRef} style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 140 }} showsVerticalScrollIndicator={true} bounces={true}>
                  {[
                    { id: "marathon", title: t('study_modes.marathon_title') || "Marathon", sub: t('study_modes.marathon_sub') || "All questions, no timer", icon: "help-circle", color: "#3b82f6" },
                    { id: "unanswered", title: t('study_modes.unanswered_title') || "Unanswered", sub: t('study_modes.unanswered_sub') || "Questions you haven't answered yet", icon: "layers-outline", color: "#f59e0b" },
                    { id: "pop", title: t('study_modes.pop_title') || "Pop Quiz", sub: t('study_modes.pop_sub') || "10 random questions", icon: "flash", color: "#ef4444" },
                    { id: "mistakes", title: t('study_modes.mistakes_title') || "Mistakes", sub: t('study_modes.mistakes_sub') || "Review incorrect answers", icon: "bandage", color: "#f97316" },
                    { id: "exam", title: t('study_modes.exam_title') || "Exam", sub: t('study_modes.exam_sub') || "All questions, no feedback, no timer", icon: "document-text", color: "#eab308" },
                    { id: "custom", title: t('study_modes.custom_title') || "Custom", sub: t('study_modes.custom_sub') || "Configure your own settings", icon: "build", color: "#6366f1" },
                  ].map((preset) => {
                    const isActive = quizPreset === preset.id;
                    return (
                      <React.Fragment key={preset.id}>
                        <Pressable
                          onPress={() => {
                            setQuizPreset(preset.id as any);
                            if (preset.id === "marathon") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setQuizPerQuestionTimer || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "unanswered") {
                              (p.setSelectionMode || (()=>{}))("unanswered");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setQuizPerQuestionTimer || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "pop") {
                              (p.setSelectionMode || (()=>{}))("random");
                              (p.setRandomCount || (()=>{}))(Math.min(10, totalQuestions));
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setQuizPerQuestionTimer || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(true);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "exam") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setQuizPerQuestionTimer || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(false);
                              (p.setShowAnswerOnSubmit || (()=>{}))(false);
                            } else if (preset.id === "mistakes") {
                              (p.setSelectionMode || (()=>{}))("wrong");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setQuizPerQuestionTimer || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "custom") {
                              (p.setSelectionMode || (()=>{}))("range");
                              (p.setQuizPerQuestionTimer || (()=>{}))(null);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                              setTimeout(() => {
                                optionsScrollRef.current?.scrollTo({ y: 380, animated: true });
                              }, 300);
                            }
                          }}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center",
                            backgroundColor: "transparent",
                            borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10,
                            borderWidth: 2,
                            borderColor: isActive ? "#34d399" : (p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"),
                            opacity: pressed ? 0.85 : 1,
                          })}
                        >
                          <View style={{ width: 40, alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                            <Ionicons name={preset.icon as any} size={32} color={preset.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", marginBottom: 3 }}>{preset.title}</Text>
                            <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)" }}>{preset.sub}</Text>
                          </View>
                          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isActive ? "#34d399" : (p.settingsDarkMode ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)"), alignItems: "center", justifyContent: "center" }}>
                            {isActive && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: "#34d399" }} />}
                          </View>
                        </Pressable>

                        {/* Expandable Custom Settings */}
                        {isActive && preset.id === "custom" && (
                          <View style={{ marginTop: 4, marginBottom: 24, paddingHorizontal: 4 }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 16 }}>
                              {t('study_modes.question_selection') || "Question Selection"}
                            </Text>

                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                              {[
                                { value: "all" as const, label: t('study_modes.sel_all') || "All" },
                                { value: "wrong" as const, label: t('study_modes.sel_wrong') || "Wrong", disabled: wrongCount === 0 },
                                { value: "range" as const, label: t('study_modes.sel_range') || "Range" },
                                { value: "unanswered" as const, label: t('study_modes.sel_unanswered') || "Unanswered", disabled: unansweredCount === 0 },
                                { value: "random" as const, label: t('study_modes.sel_random') || "Random" },
                              ].map(({ value, label, disabled }) => {
                                const isActiveSel = p.selectionMode === value;
                                return (
                                  <Pressable
                                    key={value}
                                    disabled={disabled}
                                    onPress={() => (p.setSelectionMode || (() => {}))(value)}
                                    style={[
                                      { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderWidth: 1, borderColor: "transparent" },
                                      isActiveSel && { backgroundColor: p.settingsDarkMode ? "#475569" : "#334155", borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)" },
                                      disabled && { opacity: 0.4 },
                                      !isActiveSel && p.settingsDarkMode && { backgroundColor: "#1e293b" },
                                      !isActiveSel && !p.settingsDarkMode && { borderColor: "#e5e7eb" }
                                    ]}
                                  >
                                    <Text style={[
                                      { fontSize: 14, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" },
                                      isActiveSel && { color: "#ffffff" },
                                    ]}>
                                      {label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>

                            <View style={{ paddingHorizontal: 14, paddingVertical: 14, borderRadius: 16, marginBottom: 32, backgroundColor: p.settingsDarkMode ? "#171f33" : "#ffffff", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              {p.selectionMode === "random" ? (
                                <>
                                  <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>{t('study_modes.random_count') || "Random Count"}</Text>
                                  <Stepper value={p.randomCount} min={1} max={totalQuestions} onChange={(v: any) => (p.setRandomCount || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                                </>
                              ) : p.selectionMode === "range" ? (
                                <>
                                  <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155", marginRight: 6 }}>{t('study_modes.set_range') || "Set Range"}</Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 }}>
                                    <Stepper value={p.rangeStart} min={1} max={p.rangeEnd} onChange={(v: any) => (p.setRangeStart || (()=>{ }))(v)} darkMode={p.settingsDarkMode} compact={true} />
                                    <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#94a3b8" : "#64748b" }}>{t('study_modes.to') || "to"}</Text>
                                    <Stepper value={p.rangeEnd} min={p.rangeStart} max={totalQuestions} onChange={(v: any) => (p.setRangeEnd || (()=>{ }))(v)} darkMode={p.settingsDarkMode} compact={true} />
                                  </View>
                                </>
                              ) : (
                                <>
                                  <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>
                                    {p.selectionMode === "all" ? (t('study_modes.total_questions') || "Total Questions") : p.selectionMode === "wrong" ? (t('study_modes.wrong_answers') || "Wrong Answers") : (t('study_modes.sel_unanswered') || "Unanswered")}
                                  </Text>
                                  <Stepper value={p.selectionMode === "all" ? totalQuestions : p.selectionMode === "wrong" ? wrongCount : unansweredCount} min={1} max={totalQuestions} onChange={() => {}} darkMode={p.settingsDarkMode} disabled={true} />
                                </>
                              )}
                            </View>

                            <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 16 }}>
                              {t('study_modes.gameplay_config') || "Gameplay Configurations"}
                            </Text>

                            <View style={{ borderRadius: 20, backgroundColor: p.settingsDarkMode ? "#171f33" : "#ffffff", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", paddingVertical: 8 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, zIndex: 10 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b", marginBottom: 2 }}>{t('study_modes.time_limit') || "Quiz time limit"}</Text>
                                  <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#64748b" : "#64748b" }}>
                                    {p.timeLimitText ? `${p.timeLimitText} ${t('study_modes.min_unit') || "min"}` : (p.quizTimeLimit !== null ? `${p.quizTimeLimit} ${t('study_modes.min_unit') || "min"}` : (t('study_modes.no_time_limit') || "No time limit"))}
                                  </Text>
                                </View>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#f1f5f9", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
                                    <TextInput
                                      value={p.timeLimitText}
                                      onChangeText={(t) => {
                                        const clean = t.replace(/[^0-9]/g, "").slice(0, 3);
                                        (p.setTimeLimitText || (()=>{}))(clean);
                                      }}
                                      onBlur={() => {
                                        const n = parseInt(p.timeLimitText || "", 10);
                                        if (!p.timeLimitText || isNaN(n) || n < 1) {
                                          (p.setQuizTimeLimit || (()=>{}))(null);
                                          (p.setTimeLimitText || (()=>{}))("");
                                        } else if (n > 180) {
                                          (p.setQuizTimeLimit || (()=>{}))(180);
                                          (p.setTimeLimitText || (()=>{}))("180");
                                        } else {
                                          (p.setQuizTimeLimit || (()=>{}))(n);
                                        }
                                      }}
                                      placeholder="—"
                                      placeholderTextColor={p.settingsDarkMode ? "#475569" : "#94a3b8"}
                                      keyboardType="number-pad"
                                      maxLength={3}
                                      style={{ color: p.settingsDarkMode ? "#e2e8f0" : "#334155", fontSize: 15, fontWeight: "600", width: 30, textAlign: "center", padding: 0, margin: 0 }}
                                    />
                                    <Text style={{ color: p.settingsDarkMode ? "#475569" : "#64748b", fontSize: 13, fontWeight: "600" }}>{t('study_modes.min_unit') || "min"}</Text>
                                  </View>
                                  <Pressable onPress={() => (p.setShowTimeLimitDropdown || (()=>{}))((v: any) => !v)} style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}>
                                    <Feather name={p.showTimeLimitDropdown ? "chevron-up" : "chevron-down"} size={20} color={p.settingsDarkMode ? "#64748b" : "#64748b"} />
                                  </Pressable>
                                </View>
                                {p.showTimeLimitDropdown && (
                                  <>
                                    <Pressable style={{ position: "absolute", top: -1000, bottom: -1000, left: -1000, right: -1000, zIndex: 90 }} onPress={() => (p.setShowTimeLimitDropdown || (()=>{}))(false)} />
                                    <View style={{ position: "absolute", top: "100%", right: 16, marginTop: 4, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderRadius: 12, width: 150, maxHeight: 240, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: p.settingsDarkMode ? 0.4 : 0.1, shadowRadius: 16, elevation: 20, borderWidth: 1, borderColor: p.settingsDarkMode ? "#334155" : "#eaecf0", zIndex: 100 }}>
                                      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 6 }} nestedScrollEnabled={true} scrollEnabled={true}>
                                        {[null, 5, 10, 15, 30, 60].map((presetTime) => {
                                          const isTimeActive = p.quizTimeLimit === presetTime;
                                          const label = presetTime === null ? (t('study_modes.no_time_limit') || "No limit") : `${presetTime} ${t('study_modes.min_unit') || "min"}`;
                                          return (
                                            <Pressable key={String(presetTime)} onPress={() => { (p.setQuizTimeLimit || (()=>{}))(presetTime); (p.setTimeLimitText || (()=>{}))(presetTime !== null ? String(presetTime) : ""); (p.setShowTimeLimitDropdown || (()=>{}))(false); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: isTimeActive ? (p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : (pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") : "transparent"), flexDirection: "row", alignItems: "center", justifyContent: "space-between" })}>
                                              <Text style={{ fontSize: 14, fontWeight: isTimeActive ? "700" : "500", color: isTimeActive ? (p.settingsDarkMode ? "#818cf8" : "#4f46e5") : (p.settingsDarkMode ? "#cbd5e1" : "#475569") }}>{label}</Text>
                                              {isTimeActive && <Ionicons name="checkmark" size={16} color={p.settingsDarkMode ? "#818cf8" : "#4f46e5"} />}
                                            </Pressable>
                                          );
                                        })}
                                      </ScrollView>
                                    </View>
                                  </>
                                )}
                              </View>
                              
                              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>{t('study_modes.shuffle_questions') || "Shuffle question order"}</Text>
                                <ToggleSwitch checked={Boolean(p.shuffleQuestions)} onChange={setShuffleQuestions} darkMode={p.settingsDarkMode} />
                              </View>
                              
                              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>{t('study_modes.shuffle_answers') || "Shuffle answer options"}</Text>
                                <ToggleSwitch checked={Boolean(p.shuffleAnswers)} onChange={setShuffleAnswers} darkMode={p.settingsDarkMode} />
                              </View>
                              
                              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                                <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>{t('study_modes.show_answer') || "Show answer after submit"}</Text>
                                <ToggleSwitch checked={Boolean(p.showAnswerOnSubmit)} onChange={setShowAnswerOnSubmit} darkMode={p.settingsDarkMode} />
                              </View>
                            </View>
                          </View>
                        )}
                      </React.Fragment>
                    );
                  })}
                </ScrollView>

                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + (p.selectedQuiz?.category === "AI Generated" ? 10 : 14), paddingTop: 14, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
                  <Pressable
                    disabled={questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)}
                    onPress={() => {
                      if (p.handleStartQuiz) p.handleStartQuiz();
                      setQuizSetupStep("presets");
                    }}
                    style={({ pressed }) => [
                      { backgroundColor: "#ffffff", borderRadius: 30, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
                      (questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) && { backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons name="play" size={18} color={(questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) ? (p.settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#000000"} />
                    <Text style={{ fontSize: 16, fontWeight: "700", color: (questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) ? (p.settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#000000" }}>{String(t('study_modes.start_quiz_btn') || "Start Quiz")} ({questionCount || 0} Qs)</Text>
                  </Pressable>
                  {p.selectedQuiz?.category === "AI Generated" && (
                    <Text style={{ textAlign: "center", fontSize: 11, color: p.settingsDarkMode ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.4)", marginTop: 8 }}>
                      {t('study_modes.ai_disclaimer') || "AI-generated content may contain errors. Please verify important information."}
                    </Text>
                  )}
                </View>
              </View>
            </SafeAreaView>
          </KeyboardWrapper>
      </Modal>
      )}

{/* ── View Mode Modal ── */}
      {!!p.pdfViewQuiz && (
      <Modal visible={true} animationType="slide" transparent={true} statusBarTranslucent={true} onRequestClose={() => (p.setPdfViewQuiz || (() => {}))(null)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Math.max(insets.top, 16) + 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", backgroundColor: p.settingsDarkMode ? "#0f172a" : "#ffffff" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
              <Pressable onPress={() => (p.setPdfViewQuiz || (() => {}))(null)} style={({ pressed }) => [{ padding: 8, borderRadius: 10, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }, pressed && styles.opacityPress]}>
                <Ionicons name="arrow-back" size={20} color={p.settingsDarkMode ? "#ffffff" : "#0d0f14"} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.settingsDarkMode ? "#6366f1" : "#6366f1", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 }}>Questions</Text>
                <Text style={{ color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 17, fontWeight: "700" }} numberOfLines={1}>{p.pdfViewQuiz?.title}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {(() => {
                const bookmarkCount = (p.pdfViewQuiz?.questionsList || []).filter((q: any) => p.starredQuestions?.has(q.id)).length;
                return bookmarkCount > 0 ? (
                  <View style={{ backgroundColor: "rgba(99,102,241,0.12)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="bookmark" size={13} color="#6366f1" />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: "#6366f1" }}>{bookmarkCount}</Text>
                  </View>
                ) : null;
              })()}
              <Text style={{ color: p.settingsDarkMode ? "#6e727a" : "#999", fontSize: 12 }}>{(p.pdfViewQuiz?.questionsList || []).length} Qs</Text>
            </View>
          </View>

          <FlatList
            data={(() => {
              if (!p.pdfViewQuiz) return [];
              return p.pdfViewQuiz?.questionsList || [];
            })()}
            keyExtractor={(item, index) => String(item.id || index)}
            contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 40, gap: 12, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}
            renderItem={({ item, index }) => (
              <View style={{
                backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff",
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: p.settingsDarkMode ? 0.15 : 0.04,
                shadowRadius: 6,
                elevation: 2,
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <Text style={{ flex: 1, color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 16, fontWeight: "600", lineHeight: 24 }}>
                    <Text style={{ color: p.settingsDarkMode ? "#888888" : "#888888" }}>#{index + 1} </Text>
                    {item.prompt}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const qId = item.id;
                      if (!qId) return;
                      (p.setStarredQuestions || (() => {}))((prev: any) => {
                        const next = new Set(prev);
                        if (next.has(qId)) next.delete(qId);
                        else next.add(qId);
                        return next;
                      });
                    }}
                    style={({ pressed }) => [{ padding: 6, marginLeft: 8, marginTop: -2, borderRadius: 8 }, pressed && styles.opacityPress]}
                  >
                    <Ionicons
                      name={p.starredQuestions?.has(item.id) ? "bookmark" : "bookmark-outline"}
                      size={20}
                      color={p.starredQuestions?.has(item.id) ? "#6366f1" : (p.settingsDarkMode ? "#6e727a" : "#aaaaaa")}
                    />
                  </Pressable>
                </View>

                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={{ width: "100%", height: 160, borderRadius: 8, marginBottom: 16, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }} resizeMode="contain" />
                )}
                <View style={{ gap: 4 }}>
                  {(item.answers || []).map((ans: any, aIndex: number) => {
                    const isCorrect = ans.isCorrect;
                    return (
                      <View key={aIndex} style={{
                        backgroundColor: isCorrect 
                          ? (p.settingsDarkMode ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.1)")
                          : "transparent",
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          color: isCorrect 
                            ? (p.settingsDarkMode ? "#34d399" : "#059669")
                            : (p.settingsDarkMode ? "#a1a1aa" : "#475569"),
                          fontSize: 15,
                          lineHeight: 22,
                        }}>
                          {ans.text}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}>
                <Ionicons name="document-text-outline" size={48} color={p.settingsDarkMode ? "#333333" : "#cccccc"} />
                <Text style={{ marginTop: 12, color: p.settingsDarkMode ? "#888888" : "#666677", fontSize: 16 }}>No questions to display.</Text>
              </View>
            }
          />
        </View>
      </Modal>
      )}




    </>
  );
}
