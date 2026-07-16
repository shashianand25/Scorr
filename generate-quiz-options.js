const fs = require('fs');

const replacement = `
      {/* Quiz Options Popup Modal (Sleek Compact Format) */}
      {p.selectedQuiz != null && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={false}
          onRequestClose={() => closeOrDismiss(() => { (p.setSelectedQuiz || (() => {}))(null); setQuizSetupStep("presets"); })}
        >
          <KeyboardWrapper style={{ flex: 1, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ flex: 1, paddingTop: Platform.OS === "ios" ? 60 : 40 }}>
              
              {quizSetupStep === "presets" ? (
                // ── PRESETS SCREEN (Screenshot 2) ──
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 24 }}>
                    <Text style={{ fontSize: 24, fontWeight: "500", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14", fontFamily: "serif" }}>How would you like to study?</Text>
                    <Pressable onPress={() => closeOrDismiss(() => (p.setSelectedQuiz || (() => {}))(null))} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 6 })}>
                      <Feather name="x" size={24} color={p.settingsDarkMode ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)"} />
                    </Pressable>
                  </View>

                  <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 100 }}>
                    {[
                      { id: "marathon", title: "Marathon", sub: "All questions, no timer", icon: "help-circle", color: "#3b82f6" },
                      { id: "timed", title: "Timed", sub: "60s per question", icon: "hourglass-outline", color: "#f59e0b" },
                      { id: "pop", title: "Pop Quiz", sub: "10 random questions", icon: "flash", color: "#ef4444" },
                      { id: "exam", title: "Exam", sub: "Timed, shuffled, no feedback", icon: "document-text", color: "#eab308" },
                      { id: "mistakes", title: "Mistakes", sub: "Review incorrect answers", icon: "bandage", color: "#f97316" },
                      { id: "custom", title: "Custom", sub: "Configure your own settings", icon: "build", color: "#6366f1" },
                    ].map((preset) => {
                      const isActive = quizPreset === preset.id;
                      return (
                        <Pressable
                          key={preset.id}
                          onPress={() => {
                            setQuizPreset(preset.id as any);
                            if (preset.id === "marathon") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(false);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "timed") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(Math.ceil(totalQuestions));
                              (p.setTimeLimitText || (()=>{}))(String(Math.ceil(totalQuestions)));
                              (p.setShuffleQuestions || (()=>{}))(false);
                              (p.setShuffleAnswers || (()=>{}))(false);
                              (p.setShowAnswerOnSubmit || (()=>{}))(true);
                            } else if (preset.id === "pop") {
                              (p.setSelectionMode || (()=>{}))("random");
                              (p.setRandomCount || (()=>{}))(Math.min(10, totalQuestions));
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                            } else if (preset.id === "exam") {
                              (p.setSelectionMode || (()=>{}))("all");
                              (p.setQuizTimeLimit || (()=>{}))(Math.ceil(totalQuestions));
                              (p.setTimeLimitText || (()=>{}))(String(Math.ceil(totalQuestions)));
                              (p.setShuffleQuestions || (()=>{}))(true);
                              (p.setShuffleAnswers || (()=>{}))(true);
                              (p.setShowAnswerOnSubmit || (()=>{}))(false);
                            } else if (preset.id === "mistakes") {
                              (p.setSelectionMode || (()=>{}))("wrong");
                              (p.setQuizTimeLimit || (()=>{}))(null);
                              (p.setTimeLimitText || (()=>{}))("");
                            } else if (preset.id === "custom") {
                              // Immediately open custom view
                              setQuizSetupStep("custom");
                            }
                          }}
                          style={({ pressed }) => ({
                            flexDirection: "row", alignItems: "center",
                            backgroundColor: "transparent",
                            borderRadius: 16, padding: 18, marginBottom: 14,
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
                      );
                    })}

                    <Pressable
                      onPress={() => { setQuizPreset("custom"); setQuizSetupStep("custom"); }}
                      style={({ pressed }) => ({
                        backgroundColor: "transparent",
                        borderRadius: 16, padding: 18, marginBottom: 14,
                        borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 15, fontWeight: "500", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Customise</Text>
                    </Pressable>
                  </ScrollView>

                  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, paddingTop: 16, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
                    <Pressable
                      disabled={questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)}
                      onPress={() => { (p.handleStartQuiz || (() => {}))(); setQuizSetupStep("presets"); }}
                      style={({ pressed }) => [
                        { backgroundColor: "#ffffff", borderRadius: 12, paddingVertical: 18, alignItems: "center" },
                        (questionCount === 0 || (quizPreset === "mistakes" && wrongCount === 0)) && { opacity: 0.5 },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#000000" }}>Start Quiz</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                // ── CUSTOM SETTINGS SCREEN (Screenshot 1) ──
                <>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 24 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: "700", color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }} numberOfLines={1}>
                        {p.selectedQuiz?.title}
                      </Text>
                      <Text style={{ fontSize: 14, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginTop: 4 }}>
                        {totalQuestions} Questions Available
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setQuizSetupStep("presets")}
                      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}
                    >
                      <Feather name="x" size={24} color="#64748b" />
                    </Pressable>
                  </View>

                  <ScrollView style={{ paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 16 }}>
                      Question Selection
                    </Text>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                      {[
                        { value: "all" as const, label: "All" },
                        { value: "wrong" as const, label: "Wrong", disabled: wrongCount === 0 },
                        { value: "range" as const, label: "Range" },
                        { value: "unanswered" as const, label: "Unanswered", disabled: unansweredCount === 0 },
                        { value: "random" as const, label: "Random" },
                      ].map(({ value, label, disabled }) => {
                        const isActive = p.selectionMode === value;
                        return (
                          <Pressable
                            key={value}
                            disabled={disabled}
                            onPress={() => (p.setSelectionMode || (() => {}))(value)}
                            style={[
                              { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: p.settingsDarkMode ? "#1e293b" : "#ffffff", borderWidth: 1, borderColor: "transparent" },
                              isActive && { backgroundColor: "#8b5cf6" },
                              disabled && { opacity: 0.4 },
                              !isActive && p.settingsDarkMode && { backgroundColor: "#1e293b" },
                              !isActive && !p.settingsDarkMode && { borderColor: "#e5e7eb" }
                            ]}
                          >
                            <Text style={[
                              { fontSize: 14, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" },
                              isActive && { color: "#ffffff" },
                            ]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <View style={{ padding: 16, borderRadius: 16, marginBottom: 32, backgroundColor: p.settingsDarkMode ? "#171f33" : "#ffffff", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", minHeight: 60, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      {p.selectionMode === "random" ? (
                        <>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Random Count</Text>
                          <Stepper value={p.randomCount} min={1} max={totalQuestions} onChange={(v) => (p.setRandomCount || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                        </>
                      ) : p.selectionMode === "range" ? (
                        <>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>Set Range</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Stepper value={p.rangeStart} min={1} max={p.rangeEnd} onChange={(v) => (p.setRangeStart || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                            <Text style={{ fontSize: 13, fontWeight: "600", color: p.settingsDarkMode ? "#94a3b8" : "#64748b" }}>to</Text>
                            <Stepper value={p.rangeEnd} min={p.rangeStart} max={totalQuestions} onChange={(v) => (p.setRangeEnd || (()=>{ }))(v)} darkMode={p.settingsDarkMode} />
                          </View>
                        </>
                      ) : (
                        <>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#334155" }}>
                            {p.selectionMode === "all" ? "Total Questions" : p.selectionMode === "wrong" ? "Wrong Answers" : "Unanswered"}
                          </Text>
                          <Stepper value={p.selectionMode === "all" ? totalQuestions : p.selectionMode === "wrong" ? wrongCount : unansweredCount} min={1} max={totalQuestions} onChange={() => {}} darkMode={p.settingsDarkMode} disabled={true} />
                        </>
                      )}
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: p.settingsDarkMode ? "#64748b" : "#64748b", marginBottom: 16 }}>
                      Gameplay Configurations
                    </Text>

                    <View style={{ borderRadius: 20, backgroundColor: p.settingsDarkMode ? "#171f33" : "#ffffff", borderWidth: 1, borderColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", paddingVertical: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, zIndex: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b", marginBottom: 2 }}>Quiz time limit</Text>
                          <Text style={{ fontSize: 13, color: p.settingsDarkMode ? "#64748b" : "#64748b" }}>
                            {p.timeLimitText ? \`\${p.timeLimitText} min\` : (p.quizTimeLimit !== null ? \`\${p.quizTimeLimit} min\` : "No time limit")}
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
                                const n = parseInt(p.timeLimitText, 10);
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
                            <Text style={{ color: p.settingsDarkMode ? "#475569" : "#64748b", fontSize: 13, fontWeight: "600" }}>min</Text>
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
                                {[null, 5, 10, 15, 30, 60].map((preset) => {
                                  const isActive = p.quizTimeLimit === preset;
                                  const label = preset === null ? "No limit" : \`\${preset} min\`;
                                  return (
                                    <Pressable key={String(preset)} onPress={() => { (p.setQuizTimeLimit || (()=>{}))(preset); (p.setTimeLimitText || (()=>{}))(preset !== null ? String(preset) : ""); (p.setShowTimeLimitDropdown || (()=>{}))(false); }} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, backgroundColor: isActive ? (p.settingsDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : (pressed ? (p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)") : "transparent"), flexDirection: "row", alignItems: "center", justifyContent: "space-between" })}>
                                      <Text style={{ fontSize: 14, fontWeight: isActive ? "700" : "500", color: isActive ? (p.settingsDarkMode ? "#818cf8" : "#4f46e5") : (p.settingsDarkMode ? "#cbd5e1" : "#475569") }}>{label}</Text>
                                      {isActive && <Ionicons name="checkmark" size={16} color={p.settingsDarkMode ? "#818cf8" : "#4f46e5"} />}
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
                        <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>Shuffle question order</Text>
                        <ToggleSwitch checked={p.shuffleQuestions} onChange={p.setShuffleQuestions} darkMode={p.settingsDarkMode} />
                      </View>
                      
                      <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>Shuffle answer options</Text>
                        <ToggleSwitch checked={p.shuffleAnswers} onChange={p.setShuffleAnswers} darkMode={p.settingsDarkMode} />
                      </View>
                      
                      <View style={{ height: 1, backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb", marginHorizontal: 16 }} />
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 }}>
                        <Text style={{ fontSize: 16, fontWeight: "600", color: p.settingsDarkMode ? "#e2e8f0" : "#1e293b" }}>Show answer after submit</Text>
                        <ToggleSwitch checked={p.showAnswerOnSubmit} onChange={p.setShowAnswerOnSubmit} darkMode={p.settingsDarkMode} />
                      </View>
                    </View>
                  </ScrollView>

                  <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, paddingTop: 16, backgroundColor: p.settingsDarkMode ? "#0f172a" : "#f4f4f8" }}>
                    <Pressable
                      disabled={questionCount === 0}
                      onPress={() => { (p.handleStartQuiz || (() => {}))(); setQuizSetupStep("presets"); }}
                      style={({ pressed }) => [
                        { backgroundColor: "#8b5cf6", borderRadius: 30, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
                        questionCount === 0 && { backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Ionicons name="play" size={18} color={questionCount === 0 ? (p.settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#ffffff"} />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: questionCount === 0 ? (p.settingsDarkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#ffffff" }}>Start Quiz ({questionCount} Qs)</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          </KeyboardWrapper>
        </Modal>
      )}
`;

let modals = fs.readFileSync('mobile/src/components/modals/AppModals.tsx', 'utf8');
const startTag = '{/* Quiz Options Popup Modal (Sleek Compact Format) */}';
const endTag = '{/* ── View Mode Modal ── */}';
const s = modals.indexOf(startTag);
const e = modals.indexOf(endTag);
if (s !== -1 && e !== -1) {
  modals = modals.substring(0, s) + replacement + '\n' + modals.substring(e);
  fs.writeFileSync('mobile/src/components/modals/AppModals.tsx', modals);
  console.log('Replaced Quiz Options Modal');
} else {
  console.log('Could not find bounds in AppModals.tsx');
}
