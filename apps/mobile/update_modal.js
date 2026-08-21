const fs = require('fs');
const file = '/Users/shashi/Documents/mcq-generator/mobile/src/components/modals/AppModals.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStart = `<View style={{
            backgroundColor: p.settingsDarkMode ? "#1E293B" : "#ffffff",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 36 : 24,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>`;

const targetEnd = `              </View>
            </AnimatedPressable>
          </View>`;

const startIndex = content.indexOf(targetStart);
if (startIndex === -1) { console.log("Start not found"); process.exit(1); }
const endIndex = content.indexOf(targetEnd, startIndex) + targetEnd.length;
if (endIndex === -1 + targetEnd.length) { console.log("End not found"); process.exit(1); }

const originalBlock = content.slice(startIndex, endIndex);

const extractBody = (searchStr) => {
  const searchIdx = originalBlock.indexOf(searchStr);
  const startOnPress = originalBlock.indexOf("onPress={() => {", searchIdx) + 15;
  let count = 1;
  let i = startOnPress + 1;
  while(count > 0 && i < originalBlock.length) {
    if(originalBlock[i] === '{') count++;
    else if(originalBlock[i] === '}') count--;
    i++;
  }
  return originalBlock.slice(startOnPress, i);
}

const aiOnPress = extractBody('/* Generate with AI */');
const importOnPress = extractBody('/* Import from File */');
const manualOnPress = extractBody('/* Create Quiz */');

const newBlock = `<View style={{
            backgroundColor: p.settingsDarkMode ? "#090A0F" : "#F4F4F8",
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingBottom: Platform.OS === "ios" ? 44 : 24,
            paddingHorizontal: 16,
            overflow: "hidden",
          }} onStartShouldSetResponder={() => true}>

            {/* Drag handle */}
            <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 24 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2,
                backgroundColor: p.settingsDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
            </View>

            {/* Block 1 (Main Actions) */}
            <View style={{
              backgroundColor: p.settingsDarkMode ? "#252B43" : "#ffffff",
              borderRadius: 20,
              paddingVertical: 12,
              marginBottom: 16,
            }}>
              {/* Generate with AI */}
              <AnimatedPressable
                onPress={() => ${aiOnPress}}
                style={{ paddingVertical: 16, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="sparkles" size={28} color="#a855f7" />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>Generate with AI</Text>
                  </View>
                </View>
              </AnimatedPressable>

              {/* Create quiz manually */}
              <AnimatedPressable
                onPress={() => ${manualOnPress}}
                style={{ paddingVertical: 16, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="create-outline" size={30} color="#3b82f6" />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.create_manual') || "Create quiz manually"}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </View>

            {/* Block 2 (Folder/Import) */}
            <View style={{
              backgroundColor: p.settingsDarkMode ? "#252B43" : "#ffffff",
              borderRadius: 20,
              paddingVertical: 12,
            }}>
              {/* Import from File */}
              <AnimatedPressable
                onPress={() => ${importOnPress}}
                style={{ paddingVertical: 16, paddingHorizontal: 20 }}
                scaleTo={0.97}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                  <Ionicons name="folder-outline" size={28} color={p.settingsDarkMode ? "#e2e8f0" : "#64748b"} />
                  <View style={{ flexDirection: "column", flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "600",
                      color: p.settingsDarkMode ? "#ffffff" : "#0d0f14" }}>{t('create_menu.import_txt') || "Import file (.txt, .docx, .pdf)"}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            </View>
          </View>`;

content = content.slice(0, startIndex) + newBlock + content.slice(endIndex);
fs.writeFileSync(file, content);
console.log("REPLACED SUCCESSFULLY");
