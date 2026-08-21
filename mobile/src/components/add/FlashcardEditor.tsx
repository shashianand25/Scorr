import { FlashcardEditorModals } from "./FlashcardEditorModals";
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
 * FlashcardEditor — Flashcard creation and editing view.
 * Extracted from AddTab.tsx to reduce file size.
 */
export function FlashcardEditor({ p }: { p: any }) {
  const { t } = useTranslation();
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
if (creationMode === "pick" && false) {
          const currentCard = fcCards[fcCurrentIdx] || { front: "", back: "" };
          const updateFront = (t: string) => { const c = [...fcCards]; c[fcCurrentIdx] = { ...c[fcCurrentIdx], front: t }; setFcCards(c); };
          const updateBack  = (t: string) => { const c = [...fcCards]; c[fcCurrentIdx] = { ...c[fcCurrentIdx], back: t };  setFcCards(c); };
          const addCard = () => { setFcCards([...fcCards, { front: "", back: "" }]); setFcCurrentIdx(fcCards.length); };
          const saveDeck = async () => {
            // Force deck selection if creating new and no deck chosen
            if (!editingDeckId && !fcTitle.trim()) {
              setShowDeckPicker(true);
              return;
            }
            const finalTitle = fcTitle.trim() || "Untitled Deck";
            const filled = fcCards.filter((c: any) => c.front.trim() || c.back.trim());
            if (filled.length === 0) return;

            let finalCards = [...filled];
            if (cardType === "Basic (and reversed card)") {
              finalCards = [];
              filled.forEach((c: any) => {
                finalCards.push({ front: c.front, back: c.back });
                finalCards.push({ front: c.back, back: c.front });
              });
            }

            if (editingDeckId) {
              // ── Update existing deck ──
              const updatedLocal = { ...flashcardDecks.find((d: any) => d.id === editingDeckId), title: finalTitle, cards: finalCards, cardType };
              setFlashcardDecks(flashcardDecks.map((d: any) => d.id === editingDeckId ? updatedLocal : d));

              // Sync update to Neon if logged in
              if (firebaseUser && updatedLocal?.neonId) {
                updateFlashcardDeck({
                  userId: firebaseUser.uid,
                  deckId: updatedLocal.neonId,
                  title: finalTitle,
                  cardType,
                  cards: finalCards,
                }).catch((err: any) => console.warn("[NeonSync] deck update failed:", err));
              }
              setEditingDeckId(null);
            } else {
              // ── Create new deck ──
              const localId = String(Date.now());
              const deck: any = { id: localId, neonId: null, title: finalTitle, category: "General", cards: finalCards, cardType, type: "flashcard" };
              setFlashcardDecks([deck, ...flashcardDecks]);

              // Sync to Neon if logged in — replace local id with server id
              if (firebaseUser) {
                createFlashcardDeck({
                  userId: firebaseUser.uid,
                  title: finalTitle,
                  cardType,
                  cards: finalCards,
                }).then(({ deck: neonDeck, error }) => {
                  if (neonDeck && !error) {
                    // Replace the local deck with the server-assigned id
                    // @ts-ignore — dead code, deck is null stub
                    setFlashcardDecks((prev: any) => prev.map((d: any) =>
                      // @ts-ignore
                      d.id === localId ? { ...d, id: (neonDeck as any).id, neonId: (neonDeck as any).id } : d
                    ));
                  } else {
                    console.warn("[NeonSync] deck create failed:", error);
                  }
                });
              }
            }
            setFcTitle(""); setFcCards([{ front: "", back: "" }]); setFcCurrentIdx(0);
            setCreationMode("pick");
            setActiveTab("home");
          };

          const insertFormatting = (type: string) => {
            const isFront = activeInput === "front";
            const text = isFront ? currentCard.front : currentCard.back;
            const updateFn = isFront ? updateFront : updateBack;
            
            let insertedText = "";
            switch (type) {
              case "bold":
                insertedText = "**bold**";
                break;
              case "italic":
                insertedText = "*italic*";
                break;
              case "underline":
                insertedText = "<u>underline</u>";
                break;
              case "divider":
                insertedText = "\n---\n";
                break;
              case "formula":
                insertedText = "$$formula$$";
                break;
              case "color":
                insertedText = '<span style="color:#ef4444">color</span>';
                break;
              case "size":
                insertedText = '<span style="font-size:20px">large</span>';
                break;
              default:
                break;
            }
            updateFn(text + insertedText);
          };

          return (
            <View style={{ flex: 1, backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
              {/* Header Bar */}
              <View style={{
                flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
                backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8",
              }}>
                <Pressable
                  onPress={() => { setEditingDeckId(null); setCreationMode("pick"); setActiveTab("home"); }}
                  style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                    backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                  }, pressed && styles.pressedScale]}
                >
                  <Ionicons name="arrow-back" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
                </Pressable>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }} numberOfLines={1}>
                    {fcTitle.trim() || (editingDeckId ? (flashcardDecks.find((d: any) => d.id === editingDeckId)?.title || "Edit Deck") : "New Deck")}
                  </Text>
                  <Text style={{ fontSize: 12, color: settingsDarkMode ? "#ffffff" : "#6e727a", marginTop: 1 }}>
                    {fcCards.length} {fcCards.length === 1 ? "card" : "cards"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Pressable onPress={() => setShowPreviewModal(true)}
                    style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                    }, pressed && styles.pressedScale]}>
                    <Ionicons name="eye-outline" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
                  </Pressable>
                  <Pressable onPress={() => setShowEllipsisMenu(true)}
                    style={({ pressed }) => [{ padding: 8, borderRadius: 12,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                    }, pressed && styles.pressedScale]}>
                    <Ionicons name="ellipsis-vertical" size={20} color={settingsDarkMode ? "#ffffff" : "#0d0f14"} />
                  </Pressable>
                </View>
              </View>

              {/* Deck selector pill */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <Pressable onPress={() => setShowDeckPicker(true)}
                  style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 8,
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                    backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                    borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",
                    alignSelf: "flex-start",
                  }, pressed && styles.pressedScale]}>
                  <Ionicons name="layers-outline" size={14} color={settingsDarkMode ? "#aaaacc" : "#666680"} />
                  <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#44445a" }}>
                    {editingDeckId ? (flashcardDecks.find((d: any) => d.id === editingDeckId)?.title || "study") : (fcTitle.trim() || "Select Deck")}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color={settingsDarkMode ? "#888899" : "#9999aa"} />
                </Pressable>
              </View>

              {/* Card editing area */}
              <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>

                {/* Card nav header */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#888899" }}>
                    Card {fcCurrentIdx + 1} of {fcCards.length}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Pressable disabled={fcCurrentIdx === 0} onPress={() => setFcCurrentIdx(fcCurrentIdx - 1)}
                      style={({ pressed }) => [{ padding: 6, borderRadius: 8,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                        opacity: fcCurrentIdx === 0 ? 0.3 : 1,
                      }, pressed && styles.pressedScale]}>
                      <Ionicons name="chevron-back" size={18} color={settingsDarkMode ? "#fff" : "#000"} />
                    </Pressable>
                    <Pressable disabled={fcCurrentIdx === fcCards.length - 1} onPress={() => setFcCurrentIdx(fcCurrentIdx + 1)}
                      style={({ pressed }) => [{ padding: 6, borderRadius: 8,
                        backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                        opacity: fcCurrentIdx === fcCards.length - 1 ? 0.3 : 1,
                      }, pressed && styles.pressedScale]}>
                      <Ionicons name="chevron-forward" size={18} color={settingsDarkMode ? "#fff" : "#000"} />
                    </Pressable>
                  </View>
                </View>

                {/* Front card */}
                <View style={{
                  borderRadius: 16, marginBottom: 10,
                  backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isFrontFocused
                    ? "rgba(99,102,241,0.5)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  overflow: "hidden",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1,
                      color: settingsDarkMode ? "#ffffff" : "#a0a0b0" }}>FRONT</Text>
                    <Pressable onPress={() => setIsFrontCollapsed(!isFrontCollapsed)} hitSlop={8}>
                      <Ionicons name={isFrontCollapsed ? "chevron-down" : "chevron-up"} size={15}
                        color={settingsDarkMode ? "#4a4a5a" : "#b0b0c0"} />
                    </Pressable>
                  </View>
                  {!isFrontCollapsed && (
                    <TextInput multiline
                      onFocus={() => { setIsFrontFocused(true); setActiveInput("front"); }}
                      onBlur={() => setIsFrontFocused(false)}
                      style={{ fontSize: 16, lineHeight: 24,
                        color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                        minHeight: 80, textAlignVertical: "top",
                        paddingHorizontal: 14, paddingBottom: 14 }}
                      placeholder="Enter term or question..."
                      placeholderTextColor={settingsDarkMode ? "#6e727a" : "#c8c8d4"}
                      value={currentCard.front} onChangeText={updateFront} />
                  )}
                </View>

                {/* Back card */}
                <View style={{
                  borderRadius: 16, marginBottom: 16,
                  backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                  borderWidth: 1,
                  borderColor: isBackFocused
                    ? "rgba(99,102,241,0.5)"
                    : (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
                  overflow: "hidden",
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1,
                      color: settingsDarkMode ? "#ffffff" : "#a0a0b0" }}>BACK</Text>
                    <Pressable onPress={() => setIsBackCollapsed(!isBackCollapsed)} hitSlop={8}>
                      <Ionicons name={isBackCollapsed ? "chevron-down" : "chevron-up"} size={15}
                        color={settingsDarkMode ? "#4a4a5a" : "#b0b0c0"} />
                    </Pressable>
                  </View>
                  {!isBackCollapsed && (
                    <TextInput multiline
                      onFocus={() => { setIsBackFocused(true); setActiveInput("back"); }}
                      onBlur={() => setIsBackFocused(false)}
                      style={{ fontSize: 16, lineHeight: 24,
                        color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                        minHeight: 80, textAlignVertical: "top",
                        paddingHorizontal: 14, paddingBottom: 14 }}
                      placeholder="Enter definition or answer..."
                      placeholderTextColor={settingsDarkMode ? "#6e727a" : "#c8c8d4"}
                      value={currentCard.back} onChangeText={updateBack} />
                  )}
                </View>

                {/* Card strip thumbnails */}
                {fcCards.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {fcCards.map((c: any, i: any) => (
                        <Pressable key={i} onPress={() => setFcCurrentIdx(i)}
                          style={({ pressed }) => [{
                            width: 72, height: 52, borderRadius: 12,
                            backgroundColor: i === fcCurrentIdx ? (settingsDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)") : "transparent",
                            borderWidth: 1,
                            borderColor: i === fcCurrentIdx ? (settingsDarkMode ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)") : (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                            alignItems: "center", justifyContent: "center",
                          }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 10, fontWeight: "700",
                            color: i === fcCurrentIdx ? (settingsDarkMode ? "#ffffff" : "#0d0f14") : "#6e727a" }}>{i + 1}</Text>
                          <Text style={{ fontSize: 9, color: "#6e727a", marginTop: 2 }} numberOfLines={1}>
                            {c.front ? c.front.slice(0, 10) : "empty"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}

                {/* Add card button — blocked until current card is filled */}
                <Pressable
                  onPress={() => {
                    if (!currentCard.front.trim() || !currentCard.back.trim()) return;
                    addCard();
                  }}
                  style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 8, height: 50, borderRadius: 14, borderWidth: 1, 
                    borderStyle: (!currentCard.front.trim() || !currentCard.back.trim()) ? "dashed" : "solid",
                    borderColor: (!currentCard.front.trim() || !currentCard.back.trim())
                      ? (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)")
                      : (settingsDarkMode ? "rgba(99,102,241,0.6)" : "rgba(99,102,241,0.5)"),
                    backgroundColor: (!currentCard.front.trim() || !currentCard.back.trim()) ? "transparent" : (settingsDarkMode ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)"),
                    opacity: (!currentCard.front.trim() || !currentCard.back.trim()) ? 0.4 : 1,
                  }, pressed && styles.pressedScale]}
                >
                  <Ionicons name="add" size={18} color={(!currentCard.front.trim() || !currentCard.back.trim()) ? (settingsDarkMode ? "#6e727a" : "#888899") : "#6366f1"} />
                  <Text style={{ fontSize: 14, fontWeight: (!currentCard.front.trim() || !currentCard.back.trim()) ? "500" : "600", color: (!currentCard.front.trim() || !currentCard.back.trim()) ? (settingsDarkMode ? "#6e727a" : "#888899") : "#6366f1" }}>Add Card</Text>
                </Pressable>

                {/* Save button — below Add Card */}
                {(() => {
                  const hasValidCards = fcCards.some((c: any) => c.front.trim() && c.back.trim());
                  return (
                    <Pressable onPress={saveDeck} disabled={!hasValidCards}
                      style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center",
                        gap: 6, height: 50, borderRadius: 14, marginTop: 10,
                        backgroundColor: hasValidCards ? "#818cf8" : (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"),
                      }, pressed && styles.pressedScale]}>
                      <Ionicons name="checkmark" size={16} color={hasValidCards ? "#ffffff" : (settingsDarkMode ? "#6e727a" : "#888899")} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: hasValidCards ? "#ffffff" : (settingsDarkMode ? "#6e727a" : "#888899") }}>Save Deck</Text>
                    </Pressable>
                  );
                })()}
              </ScrollView>

              {/* Formatting Toolbar */}
              <View style={{ flexDirection: "row", alignItems: "center",
                paddingVertical: 8, paddingHorizontal: 4,
                backgroundColor: settingsDarkMode ? "#141520" : "#ffffff",
                borderTopWidth: 1, borderTopColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }}>
                {([
                  { label: "B", style: { fontWeight: "bold" as const }, type: "bold" },
                  { label: "I", style: { fontStyle: "italic" as const, fontFamily: "serif" }, type: "italic" },
                  { label: "U", style: { textDecorationLine: "underline" as const }, type: "underline" },
                  { label: "—", style: {} as any, type: "hr" },
                  { label: "T", style: { color: "#ef4444", fontWeight: "700" as const }, type: "color" },
                  { label: "TT", style: { fontSize: 13, fontWeight: "700" as const }, type: "size" },
                  { label: "∑", style: {} as any, type: "formula" },
                ] as Array<{ label: string; style: any; type: string }>).map((btn) => (
                  <Pressable key={btn.type} onPress={() => insertFormatting(btn.type)}
                    style={({ pressed }) => [{ flex: 1, height: 38, alignItems: "center", justifyContent: "center",
                      borderRadius: 8,
                      backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent",
                    }, pressed && styles.pressedScale]}>
                    <Text style={[{ fontSize: 16, color: settingsDarkMode ? "#d0d0e0" : "#333" }, btn.style]}>
                      {btn.label}
                    </Text>
                  </Pressable>
                ))}
              </View>


              {/* Deck Picker, Name Deck, Preview modals — extracted to FlashcardEditorModals */}
              <FlashcardEditorModals
                p={p}
                showDeckPicker={showDeckPicker}
                setShowDeckPicker={setShowDeckPicker}
                showNameDeckModal={showNameDeckModal}
                setShowNameDeckModal={setShowNameDeckModalLocal}
              />

            </View>
          );
        }
