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
 * FlashcardEditorModals — deck picker, deck naming, and preview modals.
 * Extracted from FlashcardEditor.tsx to reduce file size.
 */
export function FlashcardEditorModals({ p, showDeckPicker, setShowDeckPicker, showNameDeckModal, setShowNameDeckModal }: { p: any; showDeckPicker: boolean; setShowDeckPicker: (v: boolean) => void; showNameDeckModal: boolean; setShowNameDeckModal: (v: boolean) => void }) {
  const { t } = useTranslation();
  const isDark = p.settingsDarkMode;
  const { settingsDarkMode, fcCards, fcCurrentIdx, renderFormattedText, insets, 
    flashcardDecks, editingDeckId, setFcTitle, fcTitle, nameDeckAction, 
    setNameDeckAction, setShowNameDeckModal: pSetShowNameDeckModal, showPreviewModal, setShowPreviewModal,
    firebaseUser, deleteFlashcardDeck, setFlashcardDecks, setEditingDeckId,
    setCreationMode, setActiveTab, deckNameInput, setDeckNameInput: pSetDeckNameInput } = p;
  return (
    <>
              {/* Deck Selector Bottom Sheet */}
              {showDeckPicker && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowDeckPicker(false)}>
                <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                  onPress={() => setShowDeckPicker(false)}>
                  <View style={{ backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 36 : 24) + 16, maxHeight: "75%",
                    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 20 }}
                    onStartShouldSetResponder={() => true}>
                    <View style={{ width: 36, height: 4, borderRadius: 2,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                      alignSelf: "center", marginBottom: 16 }} />
                    <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                      paddingHorizontal: 20, marginBottom: 12 }}>Select Deck</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <Pressable onPress={() => { setDeckNameInput(""); setNameDeckAction("create"); setShowNameDeckModal(true); setShowDeckPicker(false); }}
                        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12,
                          paddingHorizontal: 20, paddingVertical: 14,
                          backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                          borderBottomWidth: 0.5, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                        }, pressed && styles.pressedScale]}>
                        <View style={{ width: 36, height: 36, borderRadius: 11,
                          backgroundColor: "rgba(99,102,241,0.15)", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="add" size={20} color="#6366f1" />
                        </View>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#6366f1" }}>Create New Deck</Text>
                      </Pressable>
                      {flashcardDecks.map((deck: any) => {
                        const isSelected = editingDeckId === deck.id;
                        return (
                          <Pressable key={deck.id} onPress={() => {
                            setEditingDeckId(deck.id); setFcTitle(deck.title);
                            const existingCards = JSON.parse(JSON.stringify(deck.cards || []));
                            if (existingCards.length === 0 || existingCards[existingCards.length - 1].front.trim() || existingCards[existingCards.length - 1].back.trim()) {
                              existingCards.push({ front: "", back: "" });
                            }
                            setFcCards(existingCards); setFcCurrentIdx(existingCards.length - 1);
                            setShowDeckPicker(false);
                          }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 12,
                            paddingHorizontal: 20, paddingVertical: 14,
                            backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent",
                            borderBottomWidth: 0.5, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"
                          }, pressed && styles.pressedScale]}>
                            <View style={{ width: 36, height: 36, borderRadius: 11,
                              backgroundColor: isSelected ? "rgba(99,102,241,0.15)" : (settingsDarkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
                              alignItems: "center", justifyContent: "center" }}>
                              <Ionicons name="copy-outline" size={18} color={isSelected ? "#6366f1" : (settingsDarkMode ? "#aaa" : "#666")} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: isSelected ? "700" : "500",
                                color: isSelected ? "#6366f1" : (settingsDarkMode ? "#ffffff" : "#0d0f14") }}>{deck.title}</Text>
                              <Text style={{ fontSize: 12, color: "#6e727a", marginTop: 1 }}>{deck.cards.length} cards</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={20} color="#6366f1" />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </Pressable>
              </Modal>
              )}

              {/* Deck Naming Modal */}
              {showNameDeckModal && (
              <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowNameDeckModal(false)}>
                <KeyboardWrapper
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={{ flex: 1 }}
                >
                  <Pressable
                    style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" }}
                    onPress={() => setShowNameDeckModal(false)}
                  >
                    <Pressable
                      onPress={() => {}}
                      style={{ width: "88%", backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                        borderRadius: 20, padding: 24,
                        borderWidth: 1, borderColor: settingsDarkMode ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.12)",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14", marginBottom: 16 }}>
                        {nameDeckAction === "create" ? "Name Your Deck" : "Rename Deck"}
                      </Text>
                      <TextInput
                        placeholder="e.g. Biology Chapter 3"
                        placeholderTextColor={settingsDarkMode ? "#3a3a5e" : "#bbb"}
                        style={{ backgroundColor: settingsDarkMode ? "#0f172a" : "#f4f4f8",
                          borderWidth: 1.5, borderColor: "rgba(99,102,241,0.3)",
                          borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
                          color: settingsDarkMode ? "#ffffff" : "#0d0f14", fontSize: 16, marginBottom: 20 }}
                        value={deckNameInput}
                        onChangeText={setDeckNameInput}
                        returnKeyType="done"
                        onSubmitEditing={() => {
                          const trimmed = deckNameInput.trim();
                          if (!trimmed) return;
                          if (nameDeckAction === "create") {
                            setEditingDeckId(null);
                            setFcTitle(trimmed);

                          } else {
                            setFcTitle(trimmed);
                            if (editingDeckId) {
                              const renamingDeck = flashcardDecks.find((d: any) => d.id === editingDeckId);
                              setFlashcardDecks(flashcardDecks.map((d: any) => d.id === editingDeckId ? { ...d, title: trimmed } : d));
                              if (firebaseUser && renamingDeck?.neonId) {
                                updateFlashcardDeck({ userId: firebaseUser.uid, deckId: renamingDeck.neonId, title: trimmed })
                                  .catch((err: any) => console.warn("[NeonSync] title rename failed:", err));
                              }
                            }
                          }
                          setShowNameDeckModal(false);
                        }}
                      />
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Pressable onPress={() => setShowNameDeckModal(false)}
                          style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14,
                            alignItems: "center", justifyContent: "center",
                            backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"
                          }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Cancel</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                          const trimmed = deckNameInput.trim();
                          if (!trimmed) return;
                          if (nameDeckAction === "create") {
                            setEditingDeckId(null);
                            setFcTitle(trimmed);

                          } else {
                            setFcTitle(trimmed);
                            if (editingDeckId) {
                              const renamingDeck = flashcardDecks.find((d: any) => d.id === editingDeckId);
                              setFlashcardDecks(flashcardDecks.map((d: any) => d.id === editingDeckId ? { ...d, title: trimmed } : d));
                              if (firebaseUser && renamingDeck?.neonId) {
                                updateFlashcardDeck({ userId: firebaseUser.uid, deckId: renamingDeck.neonId, title: trimmed })
                                  .catch((err: any) => console.warn("[NeonSync] title rename failed:", err));
                              }
                            }
                          }
                          setShowNameDeckModal(false);
                        }} style={({ pressed }) => [{ flex: 1, height: 46, borderRadius: 14,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: "#6366f1",
                          shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
                        }, pressed && styles.pressedScale]}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                            {nameDeckAction === "create" ? "Create" : "Save"}
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  </Pressable>
                </KeyboardWrapper>
              </Modal>
              )}

              {/* Ellipsis Bottom Sheet */}
              {showEllipsisMenu && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowEllipsisMenu(false)}>
                <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
                  onPress={() => setShowEllipsisMenu(false)}>
                  <View style={{ backgroundColor: settingsDarkMode ? "#1e293b" : "#ffffff",
                    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 36 : 24) + 16,
                    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 20 }}
                    onStartShouldSetResponder={() => true}>
                    <View style={{ width: 36, height: 4, borderRadius: 2,
                      backgroundColor: settingsDarkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                      alignSelf: "center", marginBottom: 16 }} />
                    <Text style={{ fontSize: 17, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14",
                      paddingHorizontal: 20, marginBottom: 8 }}>Deck Options</Text>
                    {[
                      { icon: "create-outline" as const, label: "Rename Deck", onPress: () => {
                        setDeckNameInput(fcTitle); setNameDeckAction("rename"); setShowNameDeckModal(true); setShowEllipsisMenu(false);
                      }, color: settingsDarkMode ? "#fff" as const : "#000" as const, bg: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
                      { icon: "refresh-outline" as const, label: "Clear Current Card", onPress: () => {
                        const updated = [...fcCards]; updated[fcCurrentIdx] = { front: "", back: "" }; setFcCards(updated); setShowEllipsisMenu(false);
                      }, color: settingsDarkMode ? "#fff" as const : "#000" as const, bg: settingsDarkMode ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" },
                    ].map((item: any) => (
                      <Pressable key={item.label} onPress={item.onPress}
                        style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14,
                          paddingHorizontal: 20, paddingVertical: 16,
                          backgroundColor: pressed ? (settingsDarkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)") : "transparent"
                        }, pressed && styles.pressedScale]}>
                        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: item.bg,
                          alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <Text style={{ fontSize: 15, color: item.color }}>{item.label}</Text>
                      </Pressable>
                    ))}
                    {editingDeckId && (
                      <Pressable onPress={() => {
                        setFlashcardDecks(flashcardDecks.filter((d: any) => d.id !== editingDeckId));
                        // Also delete from Neon if synced
                        const deletingDeck = flashcardDecks.find((d: any) => d.id === editingDeckId);
                        if (firebaseUser && deletingDeck?.neonId) {
                          deleteFlashcardDeck(firebaseUser.uid, deletingDeck.neonId)
                            .catch((err: any) => console.warn("[NeonSync] deck delete failed:", err));
                        }
                        setEditingDeckId(null); setFcTitle(""); setFcCards([{ front: "", back: "" }]); setFcCurrentIdx(0);
                        setCreationMode("pick"); setActiveTab("home"); setShowEllipsisMenu(false);
                      }} style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", gap: 14,
                        paddingHorizontal: 20, paddingVertical: 16,
                        backgroundColor: pressed ? "rgba(239,68,68,0.06)" : "transparent"
                      }, pressed && styles.pressedScale]}>
                        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: "rgba(239,68,68,0.1)",
                          alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="trash-outline" size={20} color="#ef4444" />
                        </View>
                        <Text style={{ fontSize: 15, color: "#ef4444", fontWeight: "600" }}>Delete Deck</Text>
                      </Pressable>
                    )}
                  </View>
                </Pressable>
              </Modal>
              )}

              {/* Card Preview Modal */}
              {showPreviewModal && (
              <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
                <View style={styles.modalBackdrop}>
                  <View style={[styles.dialogCard, !settingsDarkMode && styles.lightModal, { width: "90%", padding: 24 }]}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: settingsDarkMode ? "#ffffff" : "#0d0f14", marginBottom: 16 }}>
                      Card Preview
                    </Text>
                    <View style={{ gap: 14, width: "100%", marginBottom: 20 }}>
                      <View style={{ borderRadius: 14, padding: 16,
                        backgroundColor: settingsDarkMode ? "#0d0f14" : "#f0f0ff",
                        borderWidth: 1.5, borderColor: "rgba(99,102,241,0.25)" }}>
                        <Text style={{ fontSize: 11, color: "#6366f1", fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>{t('flashcards.front_label') || "FRONT"}</Text>
                        {renderFormattedText(currentCard.front || "(empty)", { fontSize: 16, color: settingsDarkMode ? "#ffffff" : "#0d0f14" })}
                      </View>
                      <View style={{ borderRadius: 14, padding: 16,
                        backgroundColor: settingsDarkMode ? "#0d0f14" : "#f0fff8",
                        borderWidth: 1.5, borderColor: "rgba(0,229,160,0.2)" }}>
                        <Text style={{ fontSize: 11, color: "#00e5a0", fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 }}>BACK</Text>
                        {renderFormattedText(currentCard.back || "(empty)", { fontSize: 16, color: settingsDarkMode ? "#ffffff" : "#0d0f14" })}
                      </View>
                    </View>
                    <Pressable onPress={() => setShowPreviewModal(false)}
                      style={({ pressed }) => [styles.dialogConfirm, { backgroundColor: "#6366f1", width: "100%", paddingVertical: 16 }, pressed && styles.pressedScale]}>
                      <Text style={[styles.dialogConfirmText, { color: "#ffffff" }]}>Close</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
              )}

            </View>
          );
    </>
  );
}
