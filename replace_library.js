const fs = require('fs');
const filePath = 'mobile/src/app/index.tsx';
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('case "library": {')) {
    startIdx = i;
  }
  if (startIdx !== -1 && i > startIdx && lines[i].includes('case "battle":')) {
    endIdx = i;
    break;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx);
  
  const newLibraryCode = `      case "library": {
        // ── Redesigned Library Screen (My Library) ─────────────────────────
        const isDark = settingsDarkMode;
        const bg = "#0B0F1E";
        const cardBg = "#131624";
        const border = "rgba(255,255,255,0.08)";
        const muted = "#8B8FA8";
        const txt = "#ffffff";

        const filteredQuizzes = [...quizzes].reverse().filter((q: any) =>
          !librarySearch || q.title.toLowerCase().includes(librarySearch.toLowerCase())
        );
        const filteredDecks = flashcardDecks.filter((d: any) =>
          !librarySearch || d.title.toLowerCase().includes(librarySearch.toLowerCase())
        );

        const currentItems = libraryTab === "courses" ? filteredQuizzes : filteredDecks;

        const renderItem = (item: any) => {
          const isCourse = libraryTab === "courses";
          
          return (
            <AnimatedPressable
              key={item.id}
              onPress={() => {
                if (isCourse) {
                  setViewingInsightsQuiz(item);
                  setViewingInsightsQuizFromTab("library");
                  setActiveTab("insights");
                } else {
                  startStudy(item);
                }
              }}
              style={{
                flexDirection: "row", alignItems: "center",
                backgroundColor: cardBg, borderRadius: 16,
                marginBottom: 12, borderWidth: 1, borderColor: border,
              }}
              scaleTo={0.97}
            >
              <View style={{
                width: 90, height: 80,
                backgroundColor: "#ffffff",
                borderRadius: 15,
                alignItems: "center", justifyContent: "center",
              }}>
                <Ionicons
                  name={isCourse ? "layers" : "albums"}
                  size={36}
                  color={isCourse ? "#4F46E5" : "#EC4899"}
                />
              </View>
              <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: txt, lineHeight: 22 }} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </AnimatedPressable>
          );
        };

        return (
          <View style={{ flex: 1, backgroundColor: bg }}>
            <View style={{ paddingTop: 32, paddingBottom: 16, paddingHorizontal: 20 }}>
              <Text style={{
                fontSize: 28, fontWeight: "600", color: txt,
                fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
              }}>
                My Library
              </Text>
            </View>

            <View style={{
              height: 1, backgroundColor: border,
              marginHorizontal: 20, marginBottom: 24
            }} />

            <View style={{
              flexDirection: "row", marginHorizontal: 20, marginBottom: 24,
              backgroundColor: "#1A1D2E", borderRadius: 12, padding: 4,
            }}>
              {(["courses", "uploads"] as const).map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => { setLibraryTab(tab as any); setLibrarySearch(""); }}
                  style={{
                    flex: 1, paddingVertical: 12, borderRadius: 10,
                    backgroundColor: libraryTab === "flashcards" && tab === "uploads" || libraryTab === "courses" && tab === "courses" || libraryTab === tab ? "#2B2F42" : "transparent",
                    alignItems: "center"
                  }}
                >
                  <Text style={{
                    fontSize: 14, fontWeight: "500", textTransform: "capitalize",
                    color: libraryTab === tab ? "#FFFFFF" : muted,
                  }}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={{
              flexDirection: "row", alignItems: "center", gap: 10,
              marginHorizontal: 20, marginBottom: 24,
              backgroundColor: "transparent", borderRadius: 12,
              paddingHorizontal: 16, paddingVertical: 12,
              borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
            }}>
              <Ionicons name="search-outline" size={18} color={muted} />
              <TextInput
                placeholder="Search Library..."
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

            <Text style={{
              fontSize: 20, fontWeight: "500", color: txt,
              fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              textTransform: "capitalize",
              marginHorizontal: 20, marginBottom: 16
            }}>
              {libraryTab}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            >
              {currentItems.length === 0 ? (
                <View style={{ alignItems: "center", paddingTop: 40, gap: 12 }}>
                  <Ionicons name="document-text-outline" size={32} color={muted} />
                  <Text style={{ fontSize: 14, color: muted }}>
                    {librarySearch ? "No matches found" : \`No \${libraryTab} yet\`}
                  </Text>
                </View>
              ) : (
                currentItems.map(renderItem)
              )}
            </ScrollView>
          </View>
        );
      }
`;
  
  const newContent = [...before, newLibraryCode, ...after].join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log("Successfully replaced library case.");
} else {
  console.log("Could not find start or end bounds.");
}
