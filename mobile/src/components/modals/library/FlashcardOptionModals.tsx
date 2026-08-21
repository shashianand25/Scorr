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

/**
 * FlashcardOptionModals — Flashcard options sheet and language picker modals.
 * Extracted from LibraryAddModals for smaller file size.
 */
export function FlashcardOptionModals({ p }: { p: any }) {
  const { t } = useTranslation();
  const insets = p.insets || { top: 0, bottom: 0, left: 0, right: 0 };
  return (
    <>
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
