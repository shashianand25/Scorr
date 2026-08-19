import * as DocumentPicker from "expo-document-picker";
import { Buffer } from "buffer";
import * as mammoth from "mammoth/mammoth.browser.js";
import { Alert } from "react-native";
import { APP_LANGUAGES } from "../../constants/sample-quiz";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../../lib/i18n";
import { AnimatedPressable } from "../ui/AnimatedPressable";
const getUserErrorMessage = (e: any) => e?.message || "An error occurred";
import React from "react";
import { View, Text, Pressable, ScrollView, Modal, TextInput, ActivityIndicator, Animated, Image, Platform, FlatList, Share, Dimensions } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../../styles/shared";
import { SafeAreaView } from "react-native-safe-area-context";
import type { HomeScreenProps } from "../../types/HomeScreenProps";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const closeOrDismiss = (fn: () => void) => fn();
const KeyboardWrapper = Platform.OS === "ios" ? require("react-native").KeyboardAvoidingView : View;

/**
 * Add menu, deck report, flashcard options, language selector
 * Extracted from AppModals.tsx god-file.
 */
export function LibraryAddModals({ p }: { p: any }) {
  const { t } = useTranslation();
  const insets = p.insets || { top: 0, bottom: 0, left: 0, right: 0 };
  return (
    <>
      {/* Add Test Bottom Sheet Modal */}
        {!!p.showAddMenu && (
      <Modal
        visible={true}
        animationType="slide"
        transparent={true}
        onRequestClose={() => (p.setShowAddMenu || (() => {}))(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => (p.setShowAddMenu || (() => {}))(false)}
        >
          <View style={{
            backgroundColor: p.settingsDarkMode ? "#090A0F" : "#F4F4F8",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 36 : 24) + 16,
            paddingHorizontal: 16,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>

            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
            </View>

            {/* AI Hero Card */}
            <AnimatedPressable
              onPress={() => {
              if (p.appConfig?.featureFlags?.disableAI) {
                Alert.alert(
                  "AI Temporarily Unavailable",
                  "Quiz generation is currently disabled while we perform maintenance. Please try again shortly."
                );
                (p.setShowAddMenu || (() => {}))(false);
                return;
              }
              if (!p.firebaseUser) {
                Alert.alert(
                  "Sign In Required",
                  "Please sign in to generate quizzes with AI."
                );
                (p.setShowAddMenu || (() => {}))(false);
                return;
              }
              (p.setShowAddMenu || (() => {}))(false);
              if (Platform.OS === "web") {
                const input = document.createElement("input");
                input.type = "file"; input.accept = ".txt,.qst,.pdf,.doc,.docx,.md";
                input.onchange = async (e: any) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string;
                    (p.setShowAddMenu || (() => {}))(false);
                    setTimeout(() => (p.handleGenerateWithAI || (() => {}))(text, file.name), 150);
                  };
                  reader.readAsText(file);
                };
                input.click();
              } else {
                setTimeout(async () => {
                  try {
                    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
                    if (!result.canceled && result.assets?.[0]) {
                      const { uri: fileUri, name: fileName, size: fileSize = 0 } = result.assets[0];
                      const ext = fileName.split(".").pop()?.toLowerCase();
                      if (ext === "pdf" && !p.isConnected) { (p.setOfflineModalParams || (() => {}))({ title: "Can't Generate", message: "PDF conversion requires internet." }); return; }
                      if (ext && !["txt", "qst", "md", "doc", "docx", "pdf", "ppt", "pptx"].includes(ext)) { Alert.alert("Unsupported File", `Supported: .txt, .doc, .docx, .pdf, .ppt, .pptx. Got .${ext}`); return; }
                      (p.setAiGenPhase || (() => {}))("generating");
                      setTimeout(async () => {
                        try {
                          let text = "";
                          let isVisual = false;
                          if (ext === "pdf") {
                            const pr = await (p.parsePdfFromBackend || (() => {}))(fileUri, fileName, fileSize);
                            if (pr.error) throw new Error(pr.error);
                            isVisual = !!pr.isVisual;
                            text = pr.text;
                          } else if (ext === "ppt" || ext === "pptx") {
                            const pptMaxMB = p.appConfig?.fileLimits?.pptMaxMB || 4.5;
                            if (fileSize > pptMaxMB * 1024 * 1024) {
                              (p.setAiGenPhase || (() => {}))(null);
                              Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                              return;
                            }
                            const pr = await (p.parsePptFromBackend || (() => {}))(fileUri, fileName);
                            if (pr.error) {
                              if (String(pr.error).includes('PAYLOAD_TOO_LARGE') || String(pr.error).includes('413') || String(pr.error).toLowerCase().includes('ppt upload limit')) {
                                (p.setAiGenPhase || (() => {}))(null);
                                Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                                return;
                              }
                              throw new Error(pr.error);
                            }
                            isVisual = !!pr.isVisual;
                            text = pr.text;
                          } else if (ext === "docx" || ext === "doc") {
                            const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                            const buff = Buffer.from(b64, "base64");
                            const result = await mammoth.convertToHtml({ arrayBuffer: buff });
                            let htmlStr = result.value;
                            const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
                            let match;
                            let processedHtml = htmlStr;
                            while ((match = imgRegex.exec(htmlStr)) !== null) {
                              const extName = match[1]; const base64Data = match[2];
                              const localFileName = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.${extName}`;
                              const localUri = (FileSystem.documentDirectory || "") + localFileName;
                              await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                              processedHtml = processedHtml.replace(match[0], `\n[Image: ${localUri}]\n`);
                            }
                            processedHtml = processedHtml.replace(/<\/p>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
                            text = processedHtml;
                          } else {
                            text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                          }
                          (p.setShowAddMenu || (() => {}))(false);
                          if (isVisual) {
                            console.log("[AI] Visual file detected — sending directly to Gemini");
                            setTimeout(() => (p.handleGenerateWithAI || (() => {}))("__VISUAL__", fileName, fileUri, fileSize, ext), 150);
                          } else {
                            setTimeout(() => (p.handleGenerateWithAI || (() => {}))(text, fileName), 150);
                          }
                        } catch (err: any) {
                          (p.setAiGenPhase || (() => {}))(null);
                          const errMsg = err?.message || String(err);
                          if (errMsg.toLowerCase().includes("ppt upload limit") || errMsg.toLowerCase().includes("payload_too_large") || errMsg.toLowerCase().includes("413")) {
                            const pptMaxMB = p.appConfig?.fileLimits?.pptMaxMB || 4.5;
                            Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                            return;
                          }
                          Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : getUserErrorMessage(err));
                        }
                      }, 50);
                    }
                  } catch (err: any) {
                    const errMsg = err?.message || String(err);
                    if (errMsg.toLowerCase().includes("ppt upload limit") || errMsg.toLowerCase().includes("payload_too_large") || errMsg.toLowerCase().includes("413")) {
                      const pptMaxMB = p.appConfig?.fileLimits?.pptMaxMB || 4.5;
                      Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                    } else {
                      Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? err.message : getUserErrorMessage(err));
                    }
                  }
                }, 350);
              }
            }}
              style={{ marginBottom: 12 }}
              scaleTo={0.97}
            >
              <View style={{
                borderRadius: 20, padding: 22,
                backgroundColor: p.settingsDarkMode ? "#20253B" : "#ffffff",
                overflow: "hidden",
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Ionicons name="color-wand-outline" size={24} color="#B9A3FF" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.ai_generate') || "Generate Quiz & Flashcards"}</Text>
                    <Text style={{ fontSize: 12, color: "#B9A3FF", fontWeight: "600", marginTop: 2 }}>{t('create_menu.powered_by_ai') || "Powered by AI"}</Text>
                  </View>
                </View>

              </View>
            </AnimatedPressable>

            {/* Secondary options block */}
            <View style={{
              backgroundColor: p.settingsDarkMode ? "#20253B" : "#ffffff",
              borderRadius: 20, paddingVertical: 4, marginBottom: 16,
            }}>
              {/* Create quiz manually */}
              <AnimatedPressable
                onPress={() => {
                (p.setShowAddMenu || (() => {}))(false);
                (p.setCreationMode || (() => {}))("quiz");
                (p.setCreationStep || (() => {}))("setup");
                (p.setActiveTab || (() => {}))("add");
              }}
                style={{ paddingVertical: 14, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="create-outline" size={26} color="#3b82f6" />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.create_manual') || "Create Quiz Manually"}</Text>
                </View>
              </AnimatedPressable>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginHorizontal: 16, marginVertical: 4 }} />

              {/* Import from File */}
              <AnimatedPressable
                onPress={() => {
                (p.setShowAddMenu || (() => {}))(false);
                if (Platform.OS === "web") {
                  if (p.fileInputRef?.current) { p.fileInputRef?.current.click(); }
                } else {
                  // Wait for bottom sheet close animation before launching picker.
                  // Without this, Android swallows/delays the intent on most ROMs.
                  setTimeout(async () => {
                    try {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: "*/*",
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled && result.assets && result.assets[0]) {
                        const fileUri = result.assets[0].uri;
                        const fileName = result.assets[0].name;
                        const ext = fileName.split('.').pop()?.toLowerCase();
                        const fileSize = result.assets[0].size || 0;
                        if (ext === 'pdf' && !p.isConnected) {
                          (p.setOfflineModalParams || (() => {}))({
                            title: "Can't Convert PDF",
                            message: "PDF conversion requires an internet connection."
                          });
                          return;
                        }
                        if (ext && !['txt', 'qst', 'md', 'doc', 'docx', 'pdf', 'ppt', 'pptx'].includes(ext)) {
                          Alert.alert(
                            "Unsupported File",
                            `You can upload only .txt, .doc, .docx, .pdf, .ppt, and .pptx files. Your uploaded file is .${ext}`
                          );
                          return;
                        }
                        (p.setIsImporting || (() => {}))(true);
                        setTimeout(async () => {
                          try {
                            let text = "";
                            let isVisual = false;
                            const pdfThreshold = p.appConfig?.fileLimits?.pdfExtractThresholdMB || 4.2;
                            if (ext === "pdf") {
                              const pdfResult = await (p.parsePdfFromBackend || (() => {}))(fileUri, fileName, fileSize, pdfThreshold);
                              if (pdfResult.error) {
                                throw new Error(`Backend PDF parsing failed: ${pdfResult.error}`);
                              }
                              isVisual = !!pdfResult.isVisual;
                              text = pdfResult.text;
                            } else if (ext === "ppt" || ext === "pptx") {
                              const pptMaxMB = p.appConfig?.fileLimits?.pptMaxMB || 4.5;
                              if (fileSize > pptMaxMB * 1024 * 1024) {
                                (p.setIsImporting || (() => {}))(false);
                                Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                                return;
                              }
                              const pptResult = await (p.parsePptFromBackend || (() => {}))(fileUri, fileName);
                              if (pptResult.error) {
                                if (String(pptResult.error).includes('PAYLOAD_TOO_LARGE') || String(pptResult.error).includes('413') || String(pptResult.error).toLowerCase().includes('ppt upload limit')) {
                                  (p.setIsImporting || (() => {}))(false);
                                  Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                                  return;
                                }
                                throw new Error(`Backend PPT parsing failed: ${pptResult.error}`);
                              }
                              isVisual = !!pptResult.isVisual;
                              text = pptResult.text;
                            } else if (ext === "docx" || ext === "doc") {
                              const b64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                              const buff = Buffer.from(b64, "base64");
                              const result = await mammoth.convertToHtml({ arrayBuffer: buff });
                              let htmlStr = result.value;
                              
                              // Extract images
                              const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
                              let match;
                              let processedHtml = htmlStr;
                              while ((match = imgRegex.exec(htmlStr)) !== null) {
                                const extName = match[1];
                                const base64Data = match[2];
                                const localFileName = `img_${Date.now()}_${Math.floor(Math.random()*10000)}.${extName}`;
                                const localUri = (FileSystem.documentDirectory || "") + localFileName;
                                await FileSystem.writeAsStringAsync(localUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
                                processedHtml = processedHtml.replace(match[0], `\n[Image: ${localUri}]\n`);
                              }
                              
                              // Convert remaining HTML to plain text
                              processedHtml = processedHtml.replace(/<\/p>/gi, '\n');
                              processedHtml = processedHtml.replace(/<br\s*\/?>/gi, '\n');
                              processedHtml = processedHtml.replace(/<[^>]+>/g, '');
                              text = processedHtml;
                            } else {
                              text = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
                            }
                            // Close the overlay FIRST, wait for it to fully dismiss,
                            // THEN show the quiz — otherwise the quiz options panel
                            // gets swallowed by the still-animating loading Modal on Android.
                            (p.setIsImporting || (() => {}))(false);
                            if (isVisual) {
                              if (!p.firebaseUser) {
                                Alert.alert("Sign In Required", "Please sign in to generate quizzes with AI.");
                                return;
                              }
                              console.log("[Import] Visual file detected — redirecting to AI generation");
                              (p.setAiGenPhase || (() => {}))("generating");
                              setTimeout(() => (p.handleGenerateWithAI || (() => {}))("__VISUAL__", fileName, fileUri, fileSize, ext), 150);
                            } else {
                              setTimeout(() => (p.handleImportQst || (() => {}))(text, fileName, fileUri), 150);
                            }
                          } catch (err: any) {
                            (p.setIsImporting || (() => {}))(false);
                            const errMsg = err?.message || String(err);
                            if (errMsg.toLowerCase().includes("ppt upload limit") || errMsg.toLowerCase().includes("payload_too_large") || errMsg.toLowerCase().includes("413")) {
                              const pptMaxMB = p.appConfig?.fileLimits?.pptMaxMB || 4.5;
                              Alert.alert("File Too Large", `PPT upload limit is ${pptMaxMB} MB. Try uploading as a PDF for larger files.`);
                              return;
                            }
                            if (ext === "pdf" || ext === "doc" || ext === "docx" || ext === "ppt" || ext === "pptx") {
                              Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? `Failed to parse ${ext.toUpperCase()} file.\n\n${err.message}` : getUserErrorMessage(err));
                              return;
                            }
                            try {
                              const textFallback = await FileSystem.readAsStringAsync(fileUri);
                              (p.setIsImporting || (() => {}))(false);
                              setTimeout(() => (p.handleImportQst || (() => {}))(textFallback, fileName, fileUri), 150);
                            } catch (err2: any) {
                              (p.setIsImporting || (() => {}))(false);
                              Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? `Could not read the file. Make sure it is a valid .txt, .doc, .docx, or .pdf file.\n\n${err.message}` : getUserErrorMessage(err));
                            }
                          }
                        }, 50);
                      }
                    } catch (err: any) {
                      Alert.alert("Error", typeof __DEV__ !== 'undefined' && __DEV__ ? "Failed to open file picker: " + err.message : getUserErrorMessage(err));
                    }
                  }, 350);
                }
              }}
                style={{ paddingVertical: 14, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="folder-open-outline" size={26} color="#94A3B8" />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.import_txt') || "Import Existing Quiz"}</Text>
                    <Text style={{ fontSize: 11, color: "#ffffff", marginTop: 2 }}>(Use .docx to preserve images)</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </View>
          </View>
        </Pressable>
      </Modal>
        )}




      {p.confettiParticles?.length > 0 && (
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }}>
          {p.confettiParticles?.map((p: any) => {
            let shapeStyle: any = { width: p.size, height: p.size, backgroundColor: p.color };
            if (p.shape === "circle") {
              shapeStyle.borderRadius = p.size / 2;
            } else if (p.shape === "triangle") {
              shapeStyle = {
                width: 0,
                height: 0,
                backgroundColor: "transparent",
                borderStyle: "solid",
                borderLeftWidth: p.size / 2,
                borderRightWidth: p.size / 2,
                borderBottomWidth: p.size,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderBottomColor: p.color,
              };
            }
            
            return (
              <View
                key={p.id}
                style={[
                  {
                    position: "absolute",
                    left: p.x,
                    top: p.y,
                    transform: [{ rotate: `${p.rotation}deg` }],
                  },
                  shapeStyle
                ]}
              />
            );
          })}
        </View>
      )}
      {/* Deck Report Modal */}
      {p.showDeckReport != null && (
      <Modal visible={true} transparent animationType="fade" onRequestClose={() => (p.setShowDeckReport || (() => {}))(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.dialogCard, !p.settingsDarkMode && styles.lightModal, { width: "90%", padding: 28 }]}>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(99,102,241,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="trophy-outline" size={32} color="#6366f1" />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "800", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", textAlign: "center" }}>
                Deck Completed!
              </Text>
              <Text style={{ fontSize: 15, color: p.settingsDarkMode ? "#888899" : "#666677", marginTop: 6, textAlign: "center" }}>
                {p.showDeckReport?.deck?.title}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <View style={{ flex: 1, backgroundColor: "rgba(34,197,94,0.1)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(34,197,94,0.2)" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#22c55e", marginBottom: 4 }}>{p.showDeckReport?.attempt?.known || 0}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#22c55e", letterSpacing: 0.5 }}>KNOWN</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "rgba(239,68,68,0.1)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
                <Text style={{ fontSize: 28, fontWeight: "800", color: "#ef4444", marginBottom: 4 }}>{p.showDeckReport?.attempt?.unknown || 0}</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#ef4444", letterSpacing: 0.5 }}>STILL LEARNING</Text>
              </View>
            </View>

            <Pressable onPress={() => (p.setShowDeckReport || (() => {}))(null)}
              style={({ pressed }) => [{ backgroundColor: "#6366f1", borderRadius: 16, paddingVertical: 16, alignItems: "center", width: "100%" }, pressed && styles.pressedScale]}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ffffff" }}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      )}

      {/* Flashcard Options Modal */}
      {p.showFlashcardOptions != null && (
      <Modal visible={true} transparent animationType="slide" onRequestClose={() => (p.setShowFlashcardOptions || (() => {}))(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }} onPress={() => (p.setShowFlashcardOptions || (() => {}))(null)}>
          <View style={{ backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 36 : 24) + 16 }} onStartShouldSetResponder={() => true}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)", alignSelf: "center", marginBottom: 16 }} />
            <Text style={{ fontSize: 17, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", paddingHorizontal: 20, marginBottom: 12 }}>
              {p.showFlashcardOptions?.title}
            </Text>
            
            <Pressable onPress={() => {
              const deck = p.showFlashcardOptions;
              (p.setEditingDeckId || (() => {}))(deck.id);
              (p.setFcTitle || (() => {}))(deck.title);
              (p.setFcCards || (() => {}))(deck.cards?.length > 0 ? JSON.parse(JSON.stringify(deck.cards)) : [{ front: "", back: "" }]);
              (p.setFcCurrentIdx || (() => {}))(0);
              (p.setCardType || (() => {}))(deck.cardType || "Basic");
              (p.setCreationMode || (() => {}))("pick");
              (p.setActiveTab || (() => {}))("add");
              (p.setShowFlashcardOptions || (() => {}))(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="pencil" size={20} color={p.settingsDarkMode ? "#fff" : "#000"} />
              </View>
              <Text style={{ fontSize: 15, color: p.settingsDarkMode ? "#fff" : "#000" }}>Edit Deck</Text>
            </Pressable>

            <Pressable onPress={() => {
              (p.setViewingInsightsDeck || (() => {}))(p.showFlashcardOptions);
              (p.setActiveTab || (() => {}))("dashboard");
              (p.setShowFlashcardOptions || (() => {}))(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="bar-chart-outline" size={20} color={p.settingsDarkMode ? "#fff" : "#000"} />
              </View>
              <Text style={{ fontSize: 15, color: p.settingsDarkMode ? "#fff" : "#000" }}>Statistics</Text>
            </Pressable>

            <Pressable onPress={() => {
              const deckId = p.showFlashcardOptions?.id;
              const neonId = p.showFlashcardOptions?.neonId;
              (p.setFlashcardDecks || (() => {}))((p.flashcardDecks || []).filter((d: any) => d.id !== deckId));
              if (p.firebaseUser && neonId && !String(neonId).startsWith("local_")) {
                (p.deleteFlashcardDeck || (() => {}))(p.firebaseUser?.uid, neonId).catch((err: any) => console.warn("[NeonSync] deck delete failed:", err));
              }
              (p.setShowFlashcardOptions || (() => {}))(null);
            }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "transparent" }]}>
              <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </View>
              <Text style={{ fontSize: 15, color: "#ef4444" }}>Delete Deck</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      )}

      {!!p.showLanguageModal && (
      <Modal visible={true} animationType="slide" transparent={true} onRequestClose={() => (p.setShowLanguageModal || (() => {}))(false)}>
        <View style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0B0F1E" : "#f0f2f5" }}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: "600", color: p.settingsDarkMode ? "#fff" : "#111" }}>{t('profile.language') || "Language"}</Text>
              <Pressable onPress={() => (p.setShowLanguageModal || (() => {}))(false)} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="close" size={20} color={p.settingsDarkMode ? "#fff" : "#111"} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: p.settingsDarkMode ? "#141930" : "#ffffff", borderRadius: 8, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(99,102,241,0.3)" : "rgba(99,102,241,0.2)" }}>
                <TextInput
                  placeholder={t('common.search') || "Search"}
                  placeholderTextColor={p.settingsDarkMode ? "#64748b" : "#94a3b8"}
                  style={{ flex: 1, color: p.settingsDarkMode ? "#fff" : "#000", fontSize: 15 }}
                  value={p.languageSearch}
                  onChangeText={p.setLanguageSearch}
                />
              </View>
              <View style={{ height: 2, backgroundColor: "#6366f1", marginTop: -2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }} />
            </View>

            {/* List */}
            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}>
              {APP_LANGUAGES.filter(l => l.name.toLowerCase().includes((p.languageSearch || "").toLowerCase()) || l.nativeName.toLowerCase().includes((p.languageSearch || "").toLowerCase())).map((l, idx) => {
                const isSelected = (l.id === 'system' && !p.savedAppLanguage) || (p.savedAppLanguage === l.code && l.id !== 'system');
                return (
                  <Pressable
                    key={l.id}
                    onPress={() => {
                      if (l.id === "system") {
                        AsyncStorage.removeItem("user-language");
                        (p.setSavedAppLanguage || (() => {}))(null);
                        i18n.changeLanguage("en"); // fallback to en or device locale
                      } else {
                        i18n.changeLanguage(l.code);
                        AsyncStorage.setItem("user-language", l.code);
                        (p.setSavedAppLanguage || (() => {}))(l.code);
                      }
                      (p.setShowLanguageModal || (() => {}))(false);
                    }}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                      {l.id === 'system' ? (
                        <View style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: p.settingsDarkMode ? "#334155" : "#cbd5e1", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 12, fontWeight: "bold", color: p.settingsDarkMode ? "#fff" : "#000" }}>A文</Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                      )}
                      <View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: p.settingsDarkMode ? "#f8fafc" : "#0f172a" }}>
                          {l.id === 'system' ? l.name : l.nativeName || l.name}
                        </Text>
                        {l.id !== 'system' && (
                          <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#94a3b8" : "#64748b", marginTop: 2 }}>{l.name}</Text>
                        )}
                      </View>
                    </View>
                    {/* Radio Button */}
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isSelected ? "#6366f1" : (p.settingsDarkMode ? "#64748b" : "#cbd5e1"), alignItems: "center", justifyContent: "center" }}>
                      {isSelected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#6366f1" }} />}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Bottom Info Card */}
            <View style={{ margin: 20, padding: 16, borderRadius: 16, backgroundColor: p.settingsDarkMode ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.1)", flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(217,119,6,0.2)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="information" size={18} color="#d97706" />
              </View>
              <Text style={{ flex: 1, fontSize: 12, color: p.settingsDarkMode ? "#fbbf24" : "#b45309", lineHeight: 18 }}>
                If you have remarks on the translations, please feel free to write to the mail with suggestions for improvement.
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
      )}

    </>
  );
}
