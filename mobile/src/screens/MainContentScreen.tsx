import React from "react";
import { View, Text, Animated, Pressable, ScrollView, FlatList, Modal, TextInput, ActivityIndicator, Dimensions, Image, Share, Platform } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { styles } from "../styles/shared";
import { InsightsTabScreen, DeckInsightsTab } from "./InsightsTabScreen";
import { ActiveSessionScreen, ResultsScreen } from "./QuizSessionScreen";
import { BattleLobbyScreen, FlashcardsScreen } from "./BattleAndFlashcardScreens";
import { AuthScreen } from "./AuthScreen";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * MainContentScreen — the central tab router for HomeScreen.
 * Extracted from the HomeScreen god-file (renderContent function, ~2884 lines).
 * Receives all state and handlers via `p: any`.
 */
export function MainContentScreen({ p, overrideTab }: { p: any; overrideTab?: string }) {
  const { t } = useTranslation();
  const {
    activeTab, setActiveTab,
    activeSession, setActiveSession,
    settingsDarkMode, firebaseUser,
    quizzes, flashcardDecks,
    screenFadeAnim,
    viewingInsightsQuiz, setViewingInsightsQuiz,
    viewingInsightsDeck,
    viewingInsightsQuizFromTab,
    studyingDeck, setStudyingDeck,
    studyQueue, setStudyQueue,
    fcIndex, setFcIndex,
    fcFlipped, setFcFlipped,
    renderInsightsView, renderDeckInsightsTab,
    renderActiveSessionView, renderResultsView,
    renderBattleLobbyView, renderFlashcardsView,
    renderBookmarkedQuestionsView,
    renderTrendsChart, renderStudyDirectory,
  } = p;

    const tabToRender = overrideTab || activeTab;
    switch (tabToRender) {
      case "insights":
        return renderInsightsView();
      case "insights-flashcard":
        return renderFlashcardsView();
      case "bookmarked-questions":
        return renderBookmarkedQuestionsView();
      case "library": {
        // ── My Library ────────────────────────────────────────────
        const bg       = "#0B0F1A";
        const toggleBg = "#1A1E2E";
        const activeBg = "#252A3D";
        const muted    = "#8B8FA8";
        const txt      = "#ffffff";
        const border   = "rgba(255,255,255,0.12)";
        const accentPurple = "#8AB4F8";
        const accentPillBg = "#1E3A5F";

        const isCoursesTab = libraryTab === "courses";

        const filteredQuizzes = [...quizzes].filter((q: any) => {
          const qc = typeof q.questions === "number" ? q.questions : (q.questionsList?.length || 0);
          const cc = q.flashcards?.length || 0;
          if (qc === 0 && cc === 0) return false;
          return !librarySearch || q.title.toLowerCase().includes(librarySearch.toLowerCase());
        });
        const filteredDecks = flashcardDecks.filter((d: any) => {
          if (!d.cards || d.cards.length === 0) return false;
          return !librarySearch || d.title.toLowerCase().includes(librarySearch.toLowerCase());
        });

        const groupByTime = (items: any[], getDate: (item: any) => number) => {
          const now = Date.now();
          const oneWeek  = 7  * 24 * 60 * 60 * 1000;
          const twoWeeks = 14 * 24 * 60 * 60 * 1000;
          const groups: { label: string; items: any[] }[] = [
            { label: t('library.this_week') || "This week", items: [] },
            { label: t('library.last_week') || "Last week", items: [] },
            { label: t('library.older') || "Older",     items: [] },
          ];
          items.forEach(item => {
            const date = getDate(item);
            if (date === 0 || now - date < oneWeek)   groups[0].items.push(item);
            else if (now - date < twoWeeks)            groups[1].items.push(item);
            else                                       groups[2].items.push(item);
          });
          return groups.filter(g => g.items.length > 0);
        };

        const quizGroups = groupByTime(filteredQuizzes, (q: any) => {
          const attempts = q.attempts || [];
          const latestAttemptTime = attempts.length > 0
            ? Math.max(...attempts.map((a: any) => new Date(a.timestamp || a.date || 0).getTime() || 0))
            : 0;
          const createdTime = q.createdAt || q.created_at
            ? new Date(q.createdAt || q.created_at).getTime()
            : 0;
          const effectiveDate = Math.max(latestAttemptTime, createdTime);
          return effectiveDate > 0 ? effectiveDate : Date.now();
        });
        const deckGroups = groupByTime(filteredDecks, (d: any) => {
          const attempts = d.attempts || [];
          const latestAttemptTime = attempts.length > 0
            ? Math.max(...attempts.map((a: any) => new Date(a.timestamp || a.date || 0).getTime() || 0))
            : 0;
          const createdTime = d.createdAt || d.created_at
            ? new Date(d.createdAt || d.created_at).getTime()
            : 0;
          const effectiveDate = Math.max(latestAttemptTime, createdTime);
          return effectiveDate > 0 ? effectiveDate : Date.now();
        });

        const hasItems = isCoursesTab ? filteredQuizzes.length > 0 : filteredDecks.length > 0;

        const renderRow = (item: any, type: "quiz" | "deck") => {
          const isQuiz     = type === "quiz";
          const icoName    = "copy-outline";
          const icoColor   = isQuiz ? "#8AB4F8" : "#67E8F9";
          const iconBgCol  = isQuiz ? "#1A2240" : "#0D3040";
          const attempts   = item.attempts || [];
          const wrongCount = (item.wrongQuestions || []).length;
          const linkedDeck = isQuiz ? flashcardDecks.find((d: any) => d.id === `temp-${item.id}`) : null;
          
          let cardCount = 0;
          let dueCount = 0;
          
          if (isQuiz) {
            const allFlashcards = item.flashcards || [];
            cardCount = allFlashcards.length;
            const fcCardsWithState = cardCount > 0 
              ? allFlashcards.map((c: any, idx: number) => {
                  const cardId = c.id || `fc-${idx}`;
                  const saved = linkedDeck?.cards?.find((sc: any) => sc.id === cardId);
                  return saved ?? c;
                })
              : [];
            dueCount = fcCardsWithState.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
          } else {
            cardCount = (item.cards || []).length;
            dueCount = (item.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
          }

          const questionCount = item.questions || 0;
          let subtitleParts: string[] = [];
          if (isQuiz) {
            subtitleParts = [
              `${questionCount} ${t('actions.questions') || "questions"}`,
              `${cardCount} ${t('create_pick.flashcard_title') || "cards"}`,
              `${dueCount} ${t('library.due') || "due"}`
            ];
          } else {
            subtitleParts = [
              `Flashcard set`,
              `${cardCount} terms`,
              `by you`
            ];
          }
          const subtitle = subtitleParts.join("  ·  ");

          return (
            <Pressable
              key={item.id}
              onPress={() => {
                if (isQuiz) {
                  setViewingInsightsQuiz(item);
                  setViewingInsightsQuizFromTab("library");
                  setActiveTab("insights");
                } else {
                  startStudy(item);
                }
              }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center",
                paddingVertical: 12, marginBottom: 16,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              {/* Flashcard stack icon */}
              <View style={{
                width: 46, height: 46, borderRadius: 12,
                backgroundColor: "#1C2B3A",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
                alignItems: "center", justifyContent: "center",
                marginRight: 14, flexShrink: 0,
              }}>
                {/* Back card — dark gray, rotated */}
                <View style={{
                  position: "absolute",
                  width: 13, height: 17,
                  borderRadius: 3,
                  backgroundColor: "#374151",
                  transform: [{ rotate: "-12deg" }, { translateX: -4 }, { translateY: 3 }],
                }} />
                {/* Front card — blue/teal */}
                <View style={{
                  position: "absolute",
                  width: 13, height: 17,
                  borderRadius: 3,
                  backgroundColor: icoColor,
                  transform: [{ translateX: 3 }, { translateY: -2 }],
                }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 4 }} numberOfLines={1}>
                  {item.title}
                </Text>
                {isQuiz ? (
                  <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }} numberOfLines={1} ellipsizeMode="tail">
                    {`${questionCount} ${t('actions.questions') || "Questions"}  •  ${cardCount} ${t('create_pick.flashcard_title') || "Cards"}  •  ${dueCount} ${t('library.due') || "Due"}`}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 13, color: "#D1D5DB", fontWeight: "500" }} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>
                )}
              </View>
            </Pressable>
          );
        };

        const renderGroups = (groups: { label: string; items: any[] }[], type: "quiz" | "deck") => (
          <>
            {groups.map(group => (
              <View key={group.label}>
                <Text style={{ fontSize: 13, color: muted, marginBottom: 6, marginTop: 8 }}>
                  {group.label}
                </Text>
                {group.items.map(item => renderRow(item, type))}
              </View>
            ))}
          </>
        );

        return (
          <View style={{ flex: 1, backgroundColor: bg }}>

            {/* Removed My Library text and separator to push search upward */}


            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              marginHorizontal: 20, marginTop: 18, marginBottom: 8,
              borderRadius: 12, borderWidth: 1, borderColor: border,
              paddingHorizontal: 14, paddingVertical: 12,
            }}>
              <Ionicons name="search-outline" size={18} color={muted} />
              <TextInput
                placeholder={t('library.search_placeholder') || "Search Library..."}
                placeholderTextColor={muted}
                value={librarySearch}
                onChangeText={setLibrarySearch}
                style={{ flex: 1, fontSize: 15, color: txt, padding: 0 }}
              />
              {librarySearch.length > 0 && (
                <Pressable onPress={() => setLibrarySearch("")}>
                  <Ionicons name="close-circle" size={18} color={muted} />
                </Pressable>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
              refreshControl={
                <RefreshControl
                  refreshing={pullRefreshing}
                  onRefresh={handlePullRefresh}
                  tintColor={settingsDarkMode ? "#818cf8" : "#4f46e5"}
                  colors={["#4f46e5", "#818cf8"]}
                  progressBackgroundColor={settingsDarkMode ? "#1e293b" : "#ffffff"}
                />
              }
            >
              {!hasItems ? (
                <View style={{ alignItems: "center", paddingTop: 64, gap: 14 }}>
                  <Ionicons name={isCoursesTab ? "flash-outline" : "copy-outline"} size={40} color={muted} />
                  <Text style={{ fontSize: 16, fontWeight: "600", color: txt }}>
                    {librarySearch ? (t('library.no_results') || "No results found") : isCoursesTab ? (t('library.no_quizzes') || "No quizzes yet") : (t('library.no_flashcards') || "No flashcards yet")}
                  </Text>
                  <Text style={{ fontSize: 13, color: muted, textAlign: "center" }}>
                    {isCoursesTab ? (t('library.create_first_quiz') || "Create a quiz from any PDF or text") : (t('library.create_first_quiz') || "Create a flashcard deck to get started")}
                  </Text>
                  <Pressable
                    onPress={() => setShowAddMenu(true)}
                    style={({ pressed }) => ({
                      marginTop: 8, backgroundColor: "#4A6FFF",
                      borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>{t('library.create_new') || "+ Create new"}</Text>
                  </Pressable>
                </View>
              ) : isCoursesTab
                  ? renderGroups(quizGroups, "quiz")
                  : renderGroups(deckGroups, "deck")
              }
            </ScrollView>
          </View>
        );
      }


      case "battle":
        return renderBattleLobbyView();



      case "add": {
        // ── Flashcard creation flow (dead code — tab removed) ─────────────
        // @ts-ignore — intentional: this is dead code kept for archive, will never match active tab
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
            const filled = fcCards.filter(c => c.front.trim() || c.back.trim());
            if (filled.length === 0) return;

            let finalCards = [...filled];
            if (cardType === "Basic (and reversed card)") {
              finalCards = [];
              filled.forEach(c => {
                finalCards.push({ front: c.front, back: c.back });
                finalCards.push({ front: c.back, back: c.front });
              });
            }

            if (editingDeckId) {
              // ── Update existing deck ──
              const updatedLocal = { ...flashcardDecks.find(d => d.id === editingDeckId), title: finalTitle, cards: finalCards, cardType };
              setFlashcardDecks(flashcardDecks.map(d => d.id === editingDeckId ? updatedLocal : d));

              // Sync update to Neon if logged in
              if (firebaseUser && updatedLocal?.neonId) {
                updateFlashcardDeck({
                  userId: firebaseUser.uid,
                  deckId: updatedLocal.neonId,
                  title: finalTitle,
                  cardType,
                  cards: finalCards,
                }).catch(err => console.warn("[NeonSync] deck update failed:", err));
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
                    setFlashcardDecks(prev => prev.map(d =>
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
              case "hr":
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
                    {fcTitle.trim() || (editingDeckId ? (flashcardDecks.find(d => d.id === editingDeckId)?.title || "Edit Deck") : "New Deck")}
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
                    {editingDeckId ? (flashcardDecks.find(d => d.id === editingDeckId)?.title || "study") : (fcTitle.trim() || "Select Deck")}
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
                      {fcCards.map((c, i) => (
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
                      {flashcardDecks.map((deck) => {
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
                              const renamingDeck = flashcardDecks.find(d => d.id === editingDeckId);
                              setFlashcardDecks(flashcardDecks.map(d => d.id === editingDeckId ? { ...d, title: trimmed } : d));
                              if (firebaseUser && renamingDeck?.neonId) {
                                updateFlashcardDeck({ userId: firebaseUser.uid, deckId: renamingDeck.neonId, title: trimmed })
                                  .catch(err => console.warn("[NeonSync] title rename failed:", err));
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
                              const renamingDeck = flashcardDecks.find(d => d.id === editingDeckId);
                              setFlashcardDecks(flashcardDecks.map(d => d.id === editingDeckId ? { ...d, title: trimmed } : d));
                              if (firebaseUser && renamingDeck?.neonId) {
                                updateFlashcardDeck({ userId: firebaseUser.uid, deckId: renamingDeck.neonId, title: trimmed })
                                  .catch(err => console.warn("[NeonSync] title rename failed:", err));
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
                    ].map((item) => (
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
                        setFlashcardDecks(flashcardDecks.filter(d => d.id !== editingDeckId));
                        // Also delete from Neon if synced
                        const deletingDeck = flashcardDecks.find(d => d.id === editingDeckId);
                        if (firebaseUser && deletingDeck?.neonId) {
                          deleteFlashcardDeck(firebaseUser.uid, deletingDeck.neonId)
                            .catch(err => console.warn("[NeonSync] deck delete failed:", err));
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
        }

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
                              onChangeText={(text) => updateDraftOptionText(optIdx, text)}
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
        return null;
      }

      // @ts-ignore — dead code, flashcard tab removed
      case "flashcards" as any: {
        // ── Flashcard study mode ─────────────────────────────────────
        if (studyingDeck) {
          const isDark  = settingsDarkMode;
          const cardBg  = isDark ? "#334155" : "#475569";
          const pageBg  = isDark ? "#0f172a" : "#f4f4f8";
          
          if (studyQueue.length === 0 && !isPreviewMode) {
            // ── Completion screen ────────────────────────────────────────
            const allCards: any[] = studyingDeck.cards || [];
            const totalCards = allCards.length;
            // Count cards that have been seen at least once (sm2_nextReviewDate set)
            const reviewedCards = allCards.filter((c: any) => !!c.sm2_nextReviewDate).length;
            const reviewedPct = totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;
            // Count truly mastered (graduated to Review interval ≥ 1 day)
            // Require at least 2 repetitions and 3-day interval to count as truly mastered (SM-2 convention)
            const masteredCards = allCards.filter((c: any) => (c.sm2_repetition ?? 0) >= 2 && (c.sm2_interval ?? 0) >= 3).length;

            // Upcoming cards — not yet due, sorted soonest first
            const nowMs = Date.now();
            const upcomingCards = allCards
              .filter((c: any) => c.sm2_nextReviewDate && c.sm2_nextReviewDate > nowMs)
              .sort((a: any, b: any) => a.sm2_nextReviewDate - b.sm2_nextReviewDate);

            // Next review time (soonest due card)
            const nextReviewMs = upcomingCards.length > 0 ? upcomingCards[0].sm2_nextReviewDate : null;
            const formatCountdown = (ms: number) => {
              const diff = ms - nowMs;
              if (diff <= 0) return "now";
              const secs = Math.floor(diff / 1000);
              const mins = Math.floor(secs / 60);
              const hrs  = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (days > 0) return `${days}d ${hrs % 24}h`;
              if (hrs > 0) return `${hrs}h ${mins % 60}m`;
              if (mins > 0) return `${mins}m`;
              return "< 1m";
            };

            const formatRelative = (ms: number) => {
              const diff = ms - nowMs;
              if (diff <= 0) return "now";
              const secs = Math.floor(diff / 1000);
              const mins = Math.floor(secs / 60);
              const hrs  = Math.floor(mins / 60);
              const days = Math.floor(hrs / 24);
              if (days >= 2) return `in ${days} days`;
              if (days === 1) return "tomorrow";
              if (hrs > 0) return `in ${hrs}h ${mins % 60}m`;
              if (mins > 0) return `in ${mins}m`;
              return "in < 1m";
            };

            // New (unseen) cards available to learn
            const newCards = allCards.filter((c: any) => !c.sm2_nextReviewDate && (c.sm2_repetition ?? 0) === 0);

            // Preview candidates — next 5 upcoming
            const previewCandidates = upcomingCards.slice(0, 5);

            const handleGoBack = () => {
              setIsPreviewMode(false);
              if (viewingInsightsQuiz) {
                setStudyingDeck(null);
                setActiveTab("insights" as any);
              } else {
                setStudyingDeck(null);
              }
            };

            const handleLearnNew = () => {
              if (newCards.length === 0) return;
              setIsPreviewMode(false);
              // Build a deck of only new cards
              const newDeck = { ...studyingDeck, cards: newCards };
              setStudyQueue(newCards.map((c: any) => c.id));
              setStudyQueueTotal(newCards.length);
              setStudyingDeck(newDeck);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setStudyTypedAnswer("");
              setStudyChecked(false);
            };

            const handlePreviewNext = () => {
              if (previewCandidates.length === 0) return;
              // Save the full deck so we can restore it after preview finishes
              previewSourceDeckRef.current = studyingDeck;
              const previewDeck = { ...studyingDeck, cards: previewCandidates };
              setStudyQueue(previewCandidates.map((c: any) => c.id));
              setStudyQueueTotal(previewCandidates.length);
              setStudyingDeck(previewDeck);
              setIsPreviewMode(true);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
            };

            const masteredPct = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

            const handleReviewAll = () => {
              setIsPreviewMode(false);
              // Start a full SM-2 review of all cards in the deck, regardless of due date
              const allDeck = { ...studyingDeck, cards: allCards };
              setStudyQueue(allCards.map((c: any) => c.id));
              setStudyingDeck(allDeck);
              setStudyFlipped(false);
              flipAnim.setValue(0);
              swipeX.setValue(0);
              setStudyTypedAnswer("");
              setStudyChecked(false);
            };

            const bg      = isDark ? "#0B0F1E" : "#f4f4f8";
            const surface = isDark ? "#141930" : "#ffffff";
            const border  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
            const txt     = isDark ? "#ffffff" : "#0d0f14";
            const muted   = isDark ? "rgba(255,255,255,0.7)" : "#64748b";
            const sep     = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

            // ── Branch: 0-due-at-start → "You're all caught up!" screen ──────
            if (noDueAtStart) {
              return (
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: bg, zIndex: 99 }}>
                  <ScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 48 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Hero */}
                    <View style={{ alignItems: "center", paddingTop: 72, paddingBottom: 28, paddingHorizontal: 24 }}>
                      <View style={{
                        width: 100, height: 100, borderRadius: 50,
                        backgroundColor: isDark ? "rgba(0,212,170,0.1)" : "rgba(0,212,170,0.12)",
                        borderWidth: 1.5, borderColor: "rgba(0,212,170,0.35)",
                        alignItems: "center", justifyContent: "center",
                        marginBottom: 24,
                        shadowColor: "#00d4aa", shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.4, shadowRadius: 20, elevation: 8,
                      }}>
                        <Text style={{ fontSize: 46 }}>🎉</Text>
                      </View>
                      <Text style={{ fontSize: 30, fontWeight: "800", color: txt,
                        textAlign: "center", letterSpacing: -0.5, marginBottom: 8 }}>
                        You're all caught up!
                      </Text>
                      <Text style={{ fontSize: 15, color: muted, textAlign: "center", lineHeight: 22, marginBottom: 18 }}>
                        All due cards have been reviewed.
                      </Text>
                      {nextReviewMs ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 7,
                          backgroundColor: "rgba(0,212,170,0.1)",
                          borderRadius: 24, paddingHorizontal: 18, paddingVertical: 9,
                          borderWidth: 1, borderColor: "rgba(0,212,170,0.3)" }}>
                          <Ionicons name="time-outline" size={15} color="#00d4aa" />
                          <Text style={{ fontSize: 14, color: "#00d4aa", fontWeight: "700" }}>
                            Next review in {formatCountdown(nextReviewMs)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Stat tiles */}
                    <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 14 }}>
                      <View style={{ flex: 1, backgroundColor: surface, borderRadius: 20,
                        padding: 18, borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#00d4aa" }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#00d4aa",
                            letterSpacing: 1.1, textTransform: "uppercase" }}>Reviewed</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: "800", color: txt, lineHeight: 36 }}>{reviewedCards}</Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 3, marginBottom: 14 }}>of {totalCards} cards</Text>
                        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e8f0fe", borderRadius: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: "#00d4aa", width: `${reviewedPct}%` as any }} />
                        </View>
                      </View>
                      <View style={{ flex: 1, backgroundColor: surface, borderRadius: 20,
                        padding: 18, borderWidth: 1, borderColor: border,
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#818cf8" }} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#818cf8",
                            letterSpacing: 1.1, textTransform: "uppercase" }}>Mastered</Text>
                        </View>
                        <Text style={{ fontSize: 32, fontWeight: "800", color: txt, lineHeight: 36 }}>{masteredCards}</Text>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 3, marginBottom: 14 }}>of {totalCards} cards</Text>
                        <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#e8f0fe", borderRadius: 2 }}>
                          <View style={{ height: 4, borderRadius: 2, backgroundColor: "#818cf8", width: `${masteredPct}%` as any }} />
                        </View>
                      </View>
                    </View>

                    {/* Coming up */}
                    {upcomingCards.length > 0 && (
                      <View style={{ marginHorizontal: 20, backgroundColor: surface, borderRadius: 20,
                        borderWidth: 1, borderColor: border, marginBottom: 20, overflow: "hidden",
                        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.3 : 0.06, shadowRadius: 8, elevation: 3 }}>
                        <View style={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
                          borderBottomWidth: 1, borderBottomColor: sep }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.1,
                            textTransform: "uppercase", color: muted }}>Coming Up</Text>
                        </View>
                        {upcomingCards.slice(0, 5).map((c: any, i: number) => (
                          <View key={c.id || i} style={{ flexDirection: "row", alignItems: "center",
                            paddingHorizontal: 18, paddingVertical: 13,
                            borderTopWidth: i === 0 ? 0 : 1, borderTopColor: sep }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3,
                              backgroundColor: "#00d4aa", marginRight: 14, flexShrink: 0, opacity: 0.7 }} />
                            <Text style={{ flex: 1, fontSize: 14, color: txt, lineHeight: 20 }} numberOfLines={1}>
                              {c.front || c.question || c.prompt || "Card"}
                            </Text>
                            <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#f1f5f9",
                              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                              marginLeft: 12, flexShrink: 0 }}>
                              <Text style={{ fontSize: 12, color: muted, fontWeight: "500" }}>
                                {formatRelative(c.sm2_nextReviewDate)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Actions */}
                    <View style={{ paddingHorizontal: 20, gap: 10 }}>
                      {/* Review All */}
                      <Pressable
                        onPress={handleReviewAll}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", justifyContent: "center",
                          gap: 10, height: 58, borderRadius: 18,
                          backgroundColor: newCards.length > 0 ? (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0") : "#6366f1",
                          borderWidth: newCards.length > 0 ? 1 : 0,
                          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                          opacity: pressed ? 0.85 : 1,
                          shadowColor: newCards.length > 0 ? "transparent" : "#6366f1", shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: newCards.length > 0 ? 0 : 0.3, shadowRadius: 10, elevation: newCards.length > 0 ? 0 : 5,
                        })}
                      >
                        <Ionicons name="refresh-circle-outline" size={22} color={newCards.length > 0 ? (isDark ? "#ffffff" : "#0f172a") : "#ffffff"} />
                        <Text style={{ fontSize: 16, fontWeight: "700", color: newCards.length > 0 ? (isDark ? "#ffffff" : "#0f172a") : "#ffffff" }}>
                          Review All Cards
                        </Text>
                      </Pressable>

                      {/* Learn New — indigo */}
                      {newCards.length > 0 && (
                        <Pressable
                          onPress={handleLearnNew}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 10, height: 56, borderRadius: 18,
                            backgroundColor: "#6366f1",
                            opacity: pressed ? 0.85 : 1,
                            shadowColor: "#6366f1", shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
                          })}
                        >
                          <Ionicons name="book-outline" size={20} color="#fff" />
                          <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                            Learn New Cards ({newCards.length})
                          </Text>
                        </Pressable>
                      )}

                      {/* Preview Next — ghost */}
                      {previewCandidates.length > 0 && (
                        <Pressable
                          onPress={handlePreviewNext}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center", justifyContent: "center",
                            gap: 10, height: 52, borderRadius: 18,
                            backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e8eaf6",
                            borderWidth: 1, borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(99,102,241,0.15)",
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Ionicons name="eye-outline" size={18} color={isDark ? "#94a3b8" : "#6366f1"} />
                          <Text style={{ fontSize: 15, fontWeight: "600",
                            color: isDark ? "#cbd5e1" : "#4338ca" }}>
                            Preview Next {previewCandidates.length}
                          </Text>
                        </Pressable>
                      )}

                      {/* Back — text only */}
                      <Pressable
                        onPress={() => { setNoDueAtStart(false); handleGoBack(); }}
                        style={({ pressed }) => ({
                          flexDirection: "row", alignItems: "center", justifyContent: "center",
                          gap: 6, height: 44, opacity: pressed ? 0.5 : 1,
                        })}
                      >
                        <Ionicons name="chevron-back" size={16} color={muted} />
                        <Text style={{ fontSize: 14, fontWeight: "500", color: muted }}>
                          {viewingInsightsQuiz ? "Back to Quiz" : "Back to Deck"}
                        </Text>
                      </Pressable>
                    </View>
                  </ScrollView>
                </View>
              );
            }

            // ── After a real study session → "Next steps" screen ────────────
            return (
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc", zIndex: 99 }}>
                {/* Header with Close Button */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 }}>
                  <Text style={{ fontSize: 24, fontWeight: "600", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Next steps</Text>
                  <Pressable onPress={handleGoBack} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}>
                    <Ionicons name="close" size={28} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                  </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 90 }} showsVerticalScrollIndicator={false}>
                  {/* Performance Breakdown Box */}
                  <View style={{ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                    {/* Perfectly */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Perfectly</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{sessionRatings.perfect}</Text>
                    </View>
                    {/* Well */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#84cc16", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="checkmark-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Well</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{sessionRatings.good}</Text>
                    </View>
                    {/* Not quite */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="close-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Not quite</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>{sessionRatings.hard}</Text>
                    </View>
                    {/* Not at all */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                          <Ionicons name="close-sharp" size={18} color="#ffffff" />
                        </View>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Not at all</Text>
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>{sessionRatings.again}</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={{ gap: 12 }}>
                    <Pressable onPress={() => {
                        const savedIdx = studyingDeck.previewIndex || 0;
                        const startIdx = savedIdx >= studyingDeck.cards.length ? 0 : savedIdx;
                        const remainingCards = studyingDeck.cards.slice(startIdx);
                        
                        setStudyQueue(remainingCards.map((c: any) => c.id));
                        setStudyQueueTotal(studyingDeck.cards.length);
                        setIsPreviewMode(true);
                      }} style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                        <Text style={{ fontSize: 24 }}>📝</Text>
                        <View>
                          <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>
                            {studyingDeck.previewIndex && studyingDeck.previewIndex > 0 && studyingDeck.previewIndex < studyingDeck.cards.length 
                              ? "Resume Preview" 
                              : "Preview Flashcards"}
                          </Text>
                          {studyingDeck.previewIndex && studyingDeck.previewIndex > 0 && studyingDeck.previewIndex < studyingDeck.cards.length ? (
                            <Text style={{ fontSize: 13, color: settingsDarkMode ? "rgba(255,255,255,0.6)" : "#6b7280", marginTop: 2 }}>
                              Continuing from card {studyingDeck.previewIndex + 1}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                    </Pressable>

                    <Pressable 
                      onPress={() => {
                        setStudyingDeck(null);
                        setActiveTab("insights" as any);
                        setTimeout(() => handleOpenQuizOptions(viewingInsightsQuiz || quizzes[0] || {} as any), 300);
                      }} 
                      style={({pressed}) => ({ backgroundColor: settingsDarkMode ? "#172033" : "#ffffff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", opacity: pressed ? 0.8 : 1 })}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                        <Text style={{ fontSize: 24 }}>❓</Text>
                        <Text style={{ fontSize: 16, fontWeight: "500", color: settingsDarkMode ? "#ffffff" : "#111827" }}>Play Quiz</Text>
                      </View>
                      <Feather name="chevron-right" size={22} color={settingsDarkMode ? "#ffffff" : "#111827"} />
                    </Pressable>
                  </View>
                </ScrollView>

                {/* Bottom Pinned Done Button */}
                <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 16, paddingTop: 10, backgroundColor: settingsDarkMode ? "#0b1021" : "#f8fafc" }}>
                  <Pressable
                    onPress={handleGoBack}
                    style={({ pressed }) => ({
                      backgroundColor: "#ffffff",
                      borderRadius: 16,
                      height: 56,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.8 : 1,
                      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>Done</Text>
                  </Pressable>
                </View>
              </View>
            );
          }

          const cardId = studyQueue[0];
          const card = studyingDeck.cards.find((c: any) => c.id === cardId) || studyingDeck.cards[0];
          const isCloze = studyingDeck.cardType === "Cloze";
          const isTypeInAnswer = studyingDeck.cardType === "Basic (type in the answer)";

          let frontText = card.front || card.question || card.prompt || "";
          let backText  = card.back || card.answer || "";
          if (isCloze) {
            frontText = String(frontText).replace(/\{\{c1::(.*?)\}\}/g, "[...]");
            backText  = String(frontText).replace(/\{\{c1::(.*?)\}\}/g, "$1");
          }

          const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["0deg","180deg"] });
          const backInterpolate  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ["180deg","360deg"] });
          const frontOpacity     = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [1, 0], extrapolate: "clamp" });
          const backOpacity      = flipAnim.interpolate({ inputRange: [89, 90], outputRange: [0, 1], extrapolate: "clamp" });
          
          const swipeRotate = studyTiltAnim.interpolate({ inputRange: [-20, 0, 20], outputRange: ["-20deg", "0deg", "20deg"], extrapolate: "clamp" });

          const flipCard = () => {
            if (studyFlipped) {
              Animated.spring(flipAnim, { toValue: 0, friction: 8, tension: 10, useNativeDriver: true }).start();
              setStudyFlipped(false);
            } else {
              Animated.spring(flipAnim, { toValue: 180, friction: 8, tension: 10, useNativeDriver: true }).start();
              setStudyFlipped(true);
            }
          };

          const newCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition === 0; }).length;
          const learningCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval < 2; }).length;
          const reviewCount = studyQueue.filter(id => { const c = studyingDeck.cards.find((cd: any) => cd.id === id); return c && c.sm2_repetition > 0 && c.sm2_interval >= 2; }).length;

          return (
            <View style={{ flex: 1, backgroundColor: isDark ? "#0d0f1a" : "#f4f4f8" }}>

              {/* Header Row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#111827" }}>
                    {studyQueueTotal - studyQueue.length + 1}/{studyQueueTotal || 1}
                  </Text>
                  {isPreviewMode && (
                    <View style={{ backgroundColor: "rgba(99,102,241,0.18)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#818cf8", letterSpacing: 0.8 }}>PREVIEW</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => {
                  if (viewingInsightsQuiz) {
                    setStudyingDeck(null);
                    setActiveTab("insights");
                  } else {
                    setStudyingDeck(null);
                  }
                }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
                  <Ionicons name="close" size={26} color={isDark ? "#ffffff" : "#111827"} />
                </Pressable>
              </View>

              {/* Progress bar */}
              <View style={{ height: 4, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "#e0e0e8" }}>
                <View style={{ height: 4, backgroundColor: "#00d4aa", width: `${((studyQueueTotal - studyQueue.length + 1) / (studyQueueTotal || 1)) * 100}%` }} />
              </View>

              {/* Card Stack Area — same structure as Simple Preview */}
              <View style={{ flex: 1, padding: 16, paddingTop: 20 }}>

                {/* Transparent outer wrapper — handles swipe translate + shadow */}
                <Animated.View
                  style={{
                    flex: 1,
                    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: isDark ? 0.5 : 0.15, shadowRadius: 24, elevation: 10,
                    transform: [{ translateX: swipeX }],
                  }}
                >
                  {/* FRONT FACE */}
                  <Animated.View 
                    pointerEvents={studyFlipped ? "none" : "auto"}
                    style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 24, backgroundColor: isDark ? "#253344" : "#ffffff",
                    backfaceVisibility: "hidden", overflow: "hidden",
                    opacity: frontOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: frontInterpolate }],
                  }}>
                    {/* Speaker — top right */}
                    <Pressable
                      onPress={() => toggleSpeech(frontText)}
                      style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === frontText ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
                    >
                      <Ionicons name="volume-high-outline" size={22} color={speakingText === frontText ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
                    </Pressable>

                    {/* Term — centred */}
                    <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, paddingVertical: 52 }}>
                      {renderFormattedText(frontText, {
                        fontSize: 22, fontWeight: "500",
                        color: isDark ? "#f1f5f9" : "#111827",
                        lineHeight: 33, letterSpacing: 0.1,
                        textAlign: "center",
                      })}
                      {isTypeInAnswer && (
                        <View style={{ width: "100%", marginTop: 28, gap: 12 }}>
                          <TextInput
                            placeholder="Type your answer…"
                            placeholderTextColor={"rgba(255,255,255,0.4)"}
                            style={{ backgroundColor: "rgba(0,0,0,0.1)",
                              borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
                              color: isDark ? "#ffffff" : "#0d0f14", fontSize: 16, textAlign: "center",
                              borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
                            value={studyTypedAnswer} onChangeText={setStudyTypedAnswer}
                          />
                          <Pressable onPress={() => { setStudyChecked(true); flipCard(); }}
                            style={({ pressed }) => [{ backgroundColor: isDark ? "#ffffff" : "#0d0f14", borderRadius: 14, height: 48,
                              alignItems: "center", justifyContent: "center" }, pressed && styles.pressedScale]}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: isDark ? "#000000" : "#ffffff" }}>Check Answer</Text>
                          </Pressable>
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>

                  {/* BACK FACE */}
                  <Animated.View 
                    pointerEvents={studyFlipped ? "auto" : "none"}
                    style={{
                    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 24, backgroundColor: isDark ? "#253344" : "#ffffff",
                    backfaceVisibility: "hidden", overflow: "hidden",
                    opacity: backOpacity,
                    transform: [{ perspective: 1200 }, { rotateY: backInterpolate }],
                  }}>
                    {/* Speaker — top right */}
                    <Pressable
                      onPress={() => toggleSpeech(backText)}
                      style={({ pressed }) => ({ position: "absolute", top: 16, right: 16, zIndex: 10, opacity: pressed ? 0.5 : 1, padding: 8, backgroundColor: speakingText === backText ? "rgba(255,255,255,1)" : "transparent", borderRadius: 12 })}
                    >
                      <Ionicons name="volume-high-outline" size={22} color={speakingText === backText ? "#000" : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.28)")} />
                    </Pressable>

                    {/* Answer + extras */}
                    <Pressable onPress={() => { if (!isTypeInAnswer) flipCard(); }} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40, paddingTop: 52 }}>
                      {renderFormattedText(backText, {
                        fontSize: 18, fontWeight: "400",
                        color: isDark ? "#ffffff" : "#0f172a",
                        lineHeight: 28, letterSpacing: 0.1,
                      })}
                      {isCloze && card.back.trim() ? (
                        <View style={{ width: "100%", marginTop: 20, paddingTop: 16,
                          borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                          <Text style={{ fontSize: 10, color: "rgba(255,255,255,0.4)",
                            fontWeight: "700", letterSpacing: 1, textAlign: "center", marginBottom: 6 }}>EXTRA NOTES</Text>
                          {renderFormattedText(card.back, { fontSize: 14, color: "#e2e8f0", textAlign: "center", lineHeight: 20 })}
                        </View>
                      ) : null}
                      {isTypeInAnswer && studyChecked && (
                        <View style={{ marginTop: 20, alignItems: "center", width: "100%" }}>
                          {studyTypedAnswer.trim().toLowerCase() === card.back.trim().toLowerCase() ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
                              backgroundColor: "rgba(34,197,94,0.2)", paddingHorizontal: 18,
                              paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.4)" }}>
                              <Ionicons name="checkmark-circle" size={18} color="#4ade80" />
                              <Text style={{ color: "#4ade80", fontWeight: "700", fontSize: 14 }}>Correct!</Text>
                            </View>
                          ) : (
                            <View style={{ gap: 8, backgroundColor: "rgba(239,68,68,0.2)",
                              paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
                              alignItems: "center", width: "90%", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Ionicons name="close-circle" size={18} color="#f87171" />
                                <Text style={{ color: "#f87171", fontWeight: "700" }}>Incorrect</Text>
                              </View>
                              <Text style={{ fontSize: 13, color: "#f87171", textAlign: "center" }}>
                                Expected: <Text style={{ fontWeight: "700", color: isDark ? "#ffffff" : "#000" }}>{card.back}</Text>
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>

                </Animated.View>
              </View>

              {/* Bottom Actions — fixed height so card never shifts */}
              <View style={{ height: 130 + Math.max(insets.bottom, 16), paddingBottom: Math.max(insets.bottom, 16), justifyContent: "center", borderTopWidth: 1, borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }}>
              {isPreviewMode ? (
                // ── Preview mode: no rating buttons, just flip + advance ──
                <View style={{ paddingHorizontal: 20, gap: 12 }}>
                  {!studyFlipped ? (
                    <Pressable
                      onPress={() => { if (!isTypeInAnswer) flipCard(); }}
                      style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Show Answer</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      onPress={() => {
                        // Advance without updating SM2
                        const newQueue = studyQueue.slice(1);
                        setStudyQueue(newQueue);
                        
                        const newPreviewIndex = studyingDeck.cards.length - newQueue.length;
                        const updatedDeck = { ...studyingDeck, previewIndex: newPreviewIndex };
                        setStudyingDeck(updatedDeck);
                        setFlashcardDecks((prev) => prev.map(d => d.id === studyingDeck.id ? updatedDeck : d));
                        
                        setStudyFlipped(false);
                        flipAnim.setValue(0);
                        swipeX.setValue(0);
                        if (newQueue.length === 0) {
                          // Restore full deck so completion screen has accurate data
                          if (previewSourceDeckRef.current) {
                            setStudyingDeck(previewSourceDeckRef.current);
                            previewSourceDeckRef.current = null;
                          }
                          setIsPreviewMode(false);
                        }
                      }}
                      style={({ pressed }) => [{ backgroundColor: isDark ? "#334155" : "#e2e8f0", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#0f172a" }}>Next</Text>
                      <Ionicons name="chevron-forward" size={18} color={isDark ? "#ffffff" : "#0f172a"} />
                    </Pressable>
                  )}
                  <Text style={{ fontSize: 12, color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)", textAlign: "center" }}>
                    Preview only — no changes to your review schedule
                  </Text>
                </View>
              ) : !studyFlipped ? (
                <View style={{ paddingHorizontal: 20 }}>
                  <Pressable
                    onPress={() => { if (!isTypeInAnswer) flipCard(); }}
                    style={({ pressed }) => [{ backgroundColor: "#ffffff", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Show Answer</Text>
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={{ textAlign: "center", fontSize: 14, color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 14 }}>How well did you know this?</Text>
                  <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 12 }}>
                    {[
                      { rating: "again"   as const, num: "1", label: "Again",   color: "#ef4444" },
                      { rating: "hard"    as const, num: "2", label: "Hard",    color: "#eab308" },
                      { rating: "good"    as const, num: "3", label: "Good",    color: "#22c55e" },
                      { rating: "perfect" as const, num: "4", label: "Perfect", color: "#00d4aa" },
                    ].map(({ rating, num, label, color }) => (
                      <Pressable
                        key={rating}
                        onPress={() => handleSM2Rating(rating)}
                        style={({ pressed }) => ({ flex: 1, alignItems: "center", transform: [{ scale: pressed ? 0.92 : 1 }] })}
                      >
                        {({ pressed }) => (
                          <>
                            <View style={{
                              width: "100%", height: 52,
                              borderRadius: 12, borderWidth: 1.5, borderColor: color,
                              alignItems: "center", justifyContent: "center",
                              backgroundColor: selectedRating === rating || pressed ? color : "transparent", marginBottom: 8,
                            }}>
                              <Text style={{ fontSize: 20, fontWeight: "700", color: (selectedRating === rating || pressed) ? (rating === "hard" || rating === "perfect" ? "#000" : "#fff") : color }}>{num}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: isDark ? "#ffffff" : "#0d0f14", textAlign: "center" }}>
                              {label}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              </View>
            </View>
          );
        }

        const allDecks = flashcardDecks;
        const isDark = settingsDarkMode;

        const openNewDeck = () => {
          setCreationMode("pick");
          setFcTitle("");
          setFcCategory("General");
          setFcCards([{ front: "", back: "" }]);
          setFcCurrentIdx(0);
          setEditingDeckId(null);
          setDeckNameInput("");
          setNameDeckAction("create");
          setShowNameDeckModal(true);
          setActiveTab("add");
        };

        return (() => {
          const isDark   = settingsDarkMode;
          const bg       = isDark ? "#0f172a" : "#f4f4f8";
          const cardBg   = isDark ? "#1e293b" : "#ffffff";
          const border   = isDark ? "#1e1e2e" : "rgba(0,0,0,0.07)";
          const border2  = isDark ? "#2a1e3a" : "rgba(168,85,247,0.2)";
          const txt      = isDark ? "#ffffff" : "#0d0f14";
          const muted    = isDark ? "#ffffff" : "#666677";

          return (
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
            {/* Topbar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 52 }}>
              <View>
                <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>{t('flashcards.library') || "// your library"}</Text>
                <Text style={{ fontSize: 18, fontWeight: "600", color: txt, letterSpacing: -0.3 }}>{t('flashcards.fc_title') || "Flashcards"}</Text>
              </View>
              <Pressable onPress={openNewDeck} style={({ pressed }) => [{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(168,85,247,0.15)", borderWidth: 1, borderColor: isDark ? "#3a2a4a" : "rgba(168,85,247,0.2)", alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add" size={18} color="#a855f7" />
              </Pressable>
            </View>

            {/* Search Bar */}
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="search" size={16} color={muted} />
              <TextInput 
                placeholder={t('flashcards.search') || "Search decks..."} 
                placeholderTextColor={muted} 
                style={{ flex: 1, fontSize: 13, color: txt, fontWeight: "300", padding: 0 }} 
                value={homeSearch} 
                onChangeText={setHomeSearch} 
              />
            </View>

            {/* Filters */}
            <View style={{ marginTop: 16 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                {[
                  { key: "all", label: t('flashcards.all_decks') || "All Decks" },
                  { key: "due", label: t('flashcards.due') || "Due to Review" },
                  { key: "progress", label: t('flashcards.progress') || "In Progress" },
                  { key: "mastered", label: t('flashcards.mastered') || "Mastered" }
                ].map(c => (
                  <Pressable key={c.key} onPress={() => setFlashcardFilter(c.key as any)}
                    style={({ pressed }) => [{
                      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                      backgroundColor: flashcardFilter === c.key ? "#8B5CF6" : "transparent",
                      borderWidth: 1, borderColor: flashcardFilter === c.key ? "#8B5CF6" : border,
                      alignSelf: "flex-start",
                    }, pressed && styles.pressedScale]}>
                    <Text style={{ fontSize: 11, letterSpacing: 0.5, color: flashcardFilter === c.key ? "#fff" : muted }}>
                      {c.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>


            {/* List Head */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: muted, letterSpacing: 1.2, textTransform: "uppercase" }}>{t('flashcards.your_decks') || "Your decks"}</Text>
              <Text style={{ fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: "#a855f7" }}>{allDecks.length} {allDecks.length === 1 ? (t('flashcards.deck_singular') || 'deck') : (t('flashcards.deck_plural') || 'decks')}</Text>
            </View>

            {/* Deck List Grid */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 40, marginTop: 10 }}>
              {(() => {
                if (allDecks.length === 0) {
                  return (
                    <View style={{ width: "100%", alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="copy-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        {t('flashcards.empty_create') || "Click + to create your first deck"}
                      </Text>
                    </View>
                  );
                }
                const filteredDecks = allDecks.filter((d: any) => {
                  const matchSearch = d.title.toLowerCase().includes(homeSearch.toLowerCase());
                  if (!matchSearch) return false;
                  
                  const cardCount = (d.cards || []).length;
                  const dueCount = (d.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
                  const masteredCount = (d.cards || []).filter((c: any) => c.sm2_repetition > 0).length;
                  const masteryPercent = cardCount === 0 ? 0 : Math.round((masteredCount / cardCount) * 100);

                  if (flashcardFilter === "due") return dueCount > 0;
                  if (flashcardFilter === "progress") return masteryPercent > 0 && masteryPercent < 100;
                  if (flashcardFilter === "mastered") return masteryPercent === 100 && cardCount > 0;
                  return true;
                });
                if (filteredDecks.length === 0) {
                  return (
                    <View style={{ width: "100%", alignItems: "center", paddingTop: 60, gap: 12 }}>
                      <Ionicons name="search-outline" size={36} color={muted} />
                      <Text style={{ fontSize: 14, color: muted, textAlign: "center" }}>
                        {t('flashcards.empty_search') || "No decks match your search"}
                      </Text>
                    </View>
                  );
                }


                return (
                  <>
                    {filteredDecks.map((deck: any) => {
                      const cardCount = (deck.cards || []).length;
                      const dueCount = (deck.cards || []).filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
                      const masteredCount = (deck.cards || []).filter((c: any) => c.sm2_repetition > 0).length;
                      const masteryPercent = cardCount === 0 ? 0 : Math.round((masteredCount / cardCount) * 100);
                      
                      return (
                        <View key={deck.id} style={{ width: "100%", marginBottom: 20 }}>
                          <AnimatedPressable 
                            onPress={() => { startStudy(deck); }}
                            style={{ flexDirection: "row", alignItems: "center", width: "100%" }}
                            scaleTo={0.97}
                          >
                            {/* Left Icon Wrapper */}
                            <View style={{ 
                              width: 52, height: 52, borderRadius: 12, 
                              backgroundColor: isDark ? "#232e42" : "#e0e7ff", 
                              alignItems: "center", justifyContent: "center", marginRight: 16 
                            }}>
                              <Ionicons name="copy-outline" size={24} color={isDark ? "#38bdf8" : "#3b82f6"} style={{ transform: [{ rotate: "-5deg" }] }} />
                            </View>
                            
                            {/* Text Content */}
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: "700", color: isDark ? "#ffffff" : "#0d0f14", marginBottom: 4 }} numberOfLines={1}>
                                {deck.title}
                              </Text>
                              <Text style={{ fontSize: 13, color: isDark ? "#e2e8f0" : "#64748b", fontWeight: "600" }}>
                                {cardCount} {cardCount === 1 ? (t('flashcards.term') || 'term') : (t('flashcards.terms') || 'terms')} • {dueCount} {t('flashcards.due') || 'due'}
                              </Text>
                            </View>

                            {/* Options Button */}
                            <Pressable 
                              onPress={(e) => { e.stopPropagation(); setShowFlashcardOptions(deck); }} 
                              style={({pressed}) => [{ padding: 8, opacity: pressed ? 0.5 : 1 }]}
                            >
                              <Ionicons name="ellipsis-vertical" size={18} color={isDark ? "#94a3b8" : "#64748b"} />
                            </Pressable>
                          </AnimatedPressable>
                        </View>
                      );
                    })}

                  </>
                );
              })()}
            </View>
          </ScrollView>
          );
        })();
      }

      case "guide":
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

      case "menu":
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


      default:
        // ── Home Screen (Hybrid Design) ──────────────────────────────
        return (() => {
          const bg         = "#0B0F1E";
          const cardBg     = "#141930";
          const searchBg   = "#1A1F38";
          const accentBlue = "#4A6FFF";
          const accentGrn  = "#4ADE80";
          const accentOrng = "#F97316";
          const accentPurp = "#B5A8FF";
          const pillBg     = "#2B2560";
          const muted      = "#8B8FA8";
          const txt        = "#ffffff";
          const border     = "rgba(255,255,255,0.07)";
          const iconBg     = "#1C2448";

          // ── Jump Back In data ─────────────────────────────────────
          // Filter tombstoned IDs at the source so deleted quizzes never appear in
          // Continue Learning, even if stale AsyncStorage data briefly re-hydrates them.
          const liveQuizzes = quizzes.filter((q: any) =>
            !pendingDeleteIdsRef.current.has(q.id) &&
            !pendingDeleteIdsRef.current.has(q.neonId)
          );
          const inProgressQuizzes = liveQuizzes.filter((q: any) => {
            const uniqueCount = (q.uniqueCorrectIds || []).length;
            const qCount = q.questions || 1;
            return uniqueCount < qCount;
          });
          const inProgressDecks = flashcardDecks.filter((d: any) => (d.cards || []).length > 0);

          type JumpItem = { id: string; title: string; type: "quiz"|"flashcard"; progress: number; label: string; raw: any; ts?: number; isNew?: boolean };
          const allJumpCandidates: JumpItem[] = [
            ...inProgressQuizzes.map((q: any, i: number): JumpItem => {
              const done = (q.uniqueCorrectIds || []).length;
              const total = q.questions || 1;
              const isNew = (q.attempts || []).length === 0;
              const ts = isNew ? -i : (q.attempts[0]?.timestamp || q.attempts[0]?.date || 0);
              return { id: q.id, title: q.title, type: "quiz", progress: done / total,
                label: isNew ? (t('home.not_started') || "Not started") : (t('home.pct_complete', { pct: Math.round((done / total) * 100) }) || `${Math.round((done / total) * 100)}% complete`), raw: q, ts, isNew };
            }),
            ...inProgressDecks.map((d: any, i: number): JumpItem => {
              const cards = d.cards || [];
              const studied = cards.filter((c: any) => !!c.sm2_nextReviewDate).length;
              const isNew = studied === 0;
              const ts = isNew ? -i : (d.attempts?.[d.attempts.length - 1]?.date || 0);
              return { id: d.id, title: d.title, type: "flashcard", progress: cards.length > 0 ? studied / cards.length : 0,
                label: isNew ? (t('home.not_started') || "Not started") : (t('home.cards_sorted', { studied, total: cards.length }) || `${studied}/${cards.length} cards sorted`), raw: d, ts, isNew };
            }),
          ];
          const jumpItems: JumpItem[] = allJumpCandidates.filter((q: any) => {
            if (q.type === "quiz") {
              const qc = typeof q.raw.questions === "number" ? q.raw.questions : (q.raw.questionsList?.length || 0);
              const cc = q.raw.flashcards?.length || 0;
              return qc > 0 || cc > 0;
            } else if (q.type === "flashcard") {
              return q.raw.cards && q.raw.cards.length > 0;
            }
            return true;
          }).sort((a, b) => {
            if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
            return (b.ts || 0) - (a.ts || 0);
          }).slice(0, 3);

          type RecentItem = { id: string; title: string; type: "quiz"|"flashcard"; sub: string; raw: any; ts: number; };
          const allRecents: RecentItem[] = [
            ...liveQuizzes.map((q: any): RecentItem => {
              const linkedDeck = flashcardDecks.find((d: any) => d.id === `temp-${q.id}`);
              const allFlashcards = q.flashcards || [];
              const cardCount = allFlashcards.length;
              const fcCardsWithState = cardCount > 0 
                ? allFlashcards.map((c: any, idx: number) => {
                    const cardId = c.id || `fc-${idx}`;
                    const saved = linkedDeck?.cards?.find((sc: any) => sc.id === cardId);
                    return saved ?? c;
                  })
                : [];
              const due = fcCardsWithState.filter((c: any) => !c.sm2_nextReviewDate || c.sm2_nextReviewDate <= Date.now()).length;
              return {
                id: q.id, title: q.title, type: "quiz",
                sub: `${q.questions || 0} ${t('actions.questions') || "questions"}  ·  ${cardCount} ${t('create_pick.flashcard_title') || "cards"}  ·  ${due} ${t('library.due') || "due"}`, raw: q,
                ts: (q.attempts || []).length > 0 ? (q.attempts[0].timestamp || q.attempts[0].date || 0) : 0,
              };
            }),
            ...flashcardDecks.map((d: any): RecentItem => ({
              id: d.id, title: d.title, type: "flashcard",
              sub: `Flashcard set  ·  ${(d.cards || []).length} terms  ·  by you`, raw: d,
              ts: (d.attempts || []).length > 0 ? (d.attempts[d.attempts.length - 1].date || 0) : 0,
            })),
          ].sort((a, b) => b.ts - a.ts).slice(0, 6);

          const hasContent = jumpItems.length > 0 || allRecents.length > 0;
          const userInitial = firebaseUser ? getUserInitial(firebaseUser) : "";

          const goQuiz = (q: any) => { setViewingInsightsQuiz(q); setViewingInsightsQuizFromTab("home"); setActiveTab("insights"); };

          return (
            <View style={{ flex: 1, backgroundColor: bg }}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={
                  <RefreshControl
                    refreshing={pullRefreshing}
                    onRefresh={handlePullRefresh}
                    tintColor={settingsDarkMode ? "#818cf8" : "#4f46e5"}
                    colors={["#4f46e5", "#818cf8"]}
                    progressBackgroundColor={settingsDarkMode ? "#1e293b" : "#ffffff"}
                  />
                }
              >
                {/* ── Top: Search + Avatar ── */}
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8,
                }}>
                  {/* Search pill */}
                  <View style={{
                    flex: 1, flexDirection: "row", alignItems: "center", gap: 10,
                    backgroundColor: searchBg, borderRadius: 28,
                    paddingHorizontal: 16, paddingVertical: 12,
                    borderWidth: 1, borderColor: border,
                  }}>
                    <Ionicons name="search-outline" size={17} color={muted} />
                    <TextInput
                      placeholder={t('home.search_placeholder') || "Search"}
                      placeholderTextColor={muted}
                      value={homeSearch}
                      onChangeText={setHomeSearch}
                      style={{ flex: 1, fontSize: 15, color: txt, padding: 0 }}
                    />
                    {homeSearch.length > 0 && (
                      <Pressable onPress={() => setHomeSearch("")}>
                        <Ionicons name="close-circle" size={17} color={muted} />
                      </Pressable>
                    )}
                  </View>

                  {/* Avatar circle */}
                  <AnimatedPressable
                    onPress={() => setActiveTab("menu")}
                    style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: "#1C2244",
                      alignItems: "center", justifyContent: "center", overflow: "hidden",
                      borderWidth: 1.5, borderColor: "rgba(255,255,255,0.12)",
                    }}
                  >
                    {firebaseUser?.photoURL ? (
                      <Image source={{ uri: firebaseUser.photoURL }} style={{ width: 46, height: 46, borderRadius: 23 }} />
                    ) : firebaseUser ? (
                      <Text style={{ fontSize: 17, fontWeight: "700", color: accentPurp }}>{userInitial}</Text>
                    ) : (
                      <Ionicons name="person" size={20} color={accentPurp} />
                    )}
                  </AnimatedPressable>
                </View>

                {/* ── New user or Signed Out: sample try-it-out card ── */}
                {/* Show whenever: not logged in, OR library is completely empty (regardless of sampleDismissed) */}
                {((!firebaseUser) || (!hasContent)) && !homeSearch && sampleQuiz && (
                  <View style={{ marginTop: 24, marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt }}>
                        {sampleDismissed ? (t('home.library_empty') || "Your library is empty") : (t('home.try_first_quiz') || "Try your first quiz 👋")}
                      </Text>
                      <Text style={{ fontSize: 13, color: muted }}>{sampleDismissed ? (t('home.sample') || "Sample") : (t('home.new_user') || "New user")}</Text>
                    </View>

                    <View
                      style={{
                        marginHorizontal: 20,
                        backgroundColor: cardBg,
                        borderRadius: 20, padding: 20,
                        borderWidth: 1, borderColor: border,
                      }}
                    >
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 16, fontWeight: "700", color: txt }} numberOfLines={1}>{sampleQuiz.title}</Text>
                        <Text style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                          {sampleQuiz.questions} {t('actions.questions') || "questions"}  ·  {(sampleQuiz.flashcards || []).length} {t('create_pick.flashcard_title') || "flashcards"}
                        </Text>
                      </View>
                      <AnimatedPressable
                        onPress={() => goQuiz(sampleQuiz)}
                        style={{
                          backgroundColor: "#6366f1",
                          paddingVertical: 14, borderRadius: 16,
                          alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: "700", color: "#ffffff" }}>
                          {t('home.study_set') || "Study Set"}
                        </Text>
                      </AnimatedPressable>
                    </View>
                  </View>
                )}

                {/* ── Jump Back In ── */}
                {!!firebaseUser && jumpItems.length > 0 && !homeSearch && (
                  <View style={{ marginTop: 20, marginBottom: 8 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: txt, marginBottom: 2 }}>
                        {t('home.continue_learning') || "Continue learning"}
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={SCREEN_WIDTH - 40}
                      snapToAlignment="start"
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                      onScroll={(e) => {
                        const page = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                        setJumpPage(Math.max(0, Math.min(page, jumpItems.length - 1)));
                      }}
                      scrollEventThrottle={16}
                    >
                      {jumpItems.map((item) => {
                        const pct = Math.min(Math.round(item.progress * 100), 100);
                        return (
                          <View
                            key={item.id}
                            style={{
                              width: SCREEN_WIDTH - 52,
                              backgroundColor: cardBg,
                              borderRadius: 16,
                              padding: 16,
                              borderWidth: 1,
                              borderColor: border,
                            }}
                          >
                            {/* Title row */}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <Text style={{ fontSize: 15, fontWeight: "700", color: "#FFFFFF", flex: 1, lineHeight: 20 }} numberOfLines={1} ellipsizeMode="tail">
                                {item.title}
                              </Text>
                              <Ionicons name="ellipsis-vertical" size={16} color={muted} style={{ marginLeft: 8 }} />
                            </View>

                            {/* Progress bar */}
                            <View style={{ height: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 3, marginBottom: 8, overflow: "hidden", flexDirection: "row" }}>
                              {pct > 0 && (
                                <View style={{ width: `${Math.max(pct - 12, 0)}%` as any, backgroundColor: "#10B981" }} />
                              )}
                              {pct > 0 && pct < 100 && (
                                <View style={{ width: "12%", backgroundColor: "#F59E0B", borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
                              )}
                            </View>

                            {/* Label */}
                            <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: "500", marginBottom: 14 }}>{item.label}</Text>

                            {/* Continue button — blue pill */}
                            <Pressable
                              onPress={() => {
                                if (item.type === "quiz") goQuiz(item.raw);
                                else startStudy(item.raw);
                              }}
                              style={({ pressed }) => ({
                                backgroundColor: "#4F46E5",
                                borderRadius: 14,
                                paddingVertical: 10,
                                alignItems: "center",
                                opacity: pressed ? 0.85 : 1,
                              })}
                            >
                              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{t('home.continue_btn') || "Continue"}</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </ScrollView>

                    {/* Dot pagination */}
                    {jumpItems.length > 1 && (
                      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 10 }}>
                        {jumpItems.map((_, idx) => (
                          <View
                            key={idx}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: idx === jumpPage ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* ── Battle Arena Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: jumpItems.length > 0 || !hasContent ? 20 : 16, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 10 }}>{t('home.multiplayer') || "Multiplayer"}</Text>
                    
                    <Pressable
                      onPress={() => {
                        if (appConfig?.featureFlags?.disableBattles) {
                          Alert.alert(
                            t('battle.cant_join') || "Battles Temporarily Unavailable",
                            t('battle.battles_disabled') || "Battle Arena is currently disabled while we perform maintenance. Please try again shortly."
                          );
                          return;
                        }
                        setActiveTab("battle" as any);
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(251, 113, 133, 0.15)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                        <Ionicons name="flame" size={20} color="#FB7185" />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }} numberOfLines={1}>
                          {t('battle.title') || "Battle Arena"}
                        </Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1} ellipsizeMode="tail">
                          {t('battle.subtitle') || "Challenge friends in real-time matches"}
                        </Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={muted} />
                    </Pressable>
                  </View>
                )}

                {/* ── Create Flashcards Banner ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: txt, marginBottom: 10 }}>{t('home.study_need_title') || "Study exactly what you need"}</Text>
                    
                    <View style={{
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: border,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                      }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Ionicons name="albums" size={24} color="#4F46E5" />
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('home.create_flashcards_title') || "Create your own flashcards"}</Text>
                      <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 14 }}>{t('home.study_need_sub') || "Study exactly what's on your test"}</Text>
                      
                      {/* Image placeholder */}
                      <View style={{ height: 88, backgroundColor: "#E0F2FE", borderRadius: 12, marginBottom: 14, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <Ionicons name="document-text" size={48} color="#4F46E5" style={{ opacity: 0.8 }} />
                      </View>
                      
                      <Pressable
                        onPress={() => setShowAddMenu(true)}
                        style={({ pressed }) => ({
                          backgroundColor: "#4F46E5",
                          borderRadius: 14,
                          paddingVertical: 11,
                          alignItems: "center",
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{t('home.create_flashcards_btn') || "Create flashcards"}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* ── More Options ── */}
                {!homeSearch && (
                  <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: txt, marginBottom: 10 }}>{t('home.more') || "More"}</Text>
                    
                    <Pressable
                      onPress={async () => {
                        try {
                          const downloadLink = appConfig?.appLinks?.downloadUrl || appConfig?.appLinks?.playStoreUrl || "https://scorrapp.com/download";
                          await Share.share({
                            message: `Study smarter with Scorr! Create quizzes and flashcards with AI:\n${downloadLink}`,
                            url: downloadLink,
                          });
                        } catch (error) {
                          console.log(error);
                        }
                      }}
                      style={({ pressed }) => ({
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('home.invite_friends') || "Invite your friends"}</Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>{t('home.invite_sub') || "Learn together and grow faster"}</Text>
                      </View>
                      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 26 }}>💌</Text>
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => setShowFeedbackPage(true)}
                      style={({ pressed }) => ({
                        marginTop: 10,
                        backgroundColor: cardBg,
                        borderRadius: 16,
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderWidth: 1,
                        borderColor: border,
                        flexDirection: "row",
                        alignItems: "center",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 2,
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: txt, marginBottom: 2 }}>{t('profile.feedback') || "Feedback"}</Text>
                        <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }} numberOfLines={1}>{t('home.feedback_sub') || "Help us improve"}</Text>
                      </View>
                      <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 26 }}>💡</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            </View>
          );
        })();

    }

}
