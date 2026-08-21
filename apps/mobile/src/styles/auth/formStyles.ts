import { StyleSheet, Platform, Dimensions } from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/** Form inputs, buttons, and login/signup controls */
export const formStyles = StyleSheet.create({
  switchSubCompact: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  stepperSubRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingTop: 4,
  },
  stepperSubRowTextCompact: {
    color: "#6e727a",
    fontSize: 12,
  },
  switchRowSeparator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  modalStickyFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 16,
    marginTop: 8,
  },
  settingsBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.025)",
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderRadius: 18,
    height: 64,
    paddingHorizontal: 20,
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  settingsBoxLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingsBoxText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 16,
    letterSpacing: 0.3,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
  signOutCompactBtn: {
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  signOutCompactBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  lightRootContainer: {
    backgroundColor: "#f4f4f8",
  },
  lightText: {
    color: "#0d0f14",
  },
  lightTextSub: {
    color: "#6e727a",
  },
  lightCard: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.07)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  lightTabBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "rgba(0, 0, 0, 0.02)",
  },
  lightModal: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.08)",
  },
  lightInput: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  lightCodeBlock: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  lightCodeLine: {
    color: "#374151",
  },
  lightBorder: {
    borderColor: "rgba(0, 0, 0, 0.06)",
  },
  lightBorderTop: {
    borderTopColor: "rgba(0, 0, 0, 0.06)",
  },
  lightProgressBg: {
    backgroundColor: "rgba(0, 0, 0, 0.06)",
  },
  lightSessionContainer: {
    backgroundColor: "#f5f6f8",
  },

  // ────────────────────────────────────────────
  //  Press animation
  // ────────────────────────────────────────────
  pressedScale: {
    transform: [{ scale: 0.96 }],
    opacity: 0.88,
  },

  // ────────────────────────────────────────────
  //  Tab bar active dot indicator
  // ────────────────────────────────────────────
  tabActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00e5a0",
    marginTop: 4,
  },

  // ────────────────────────────────────────────
  //  Landing Screen
  // ────────────────────────────────────────────
  landingSafeArea: {
    flex: 1,
    backgroundColor: "#0B0F1C",
  },
  landingContainer: {
    flex: 1,
    backgroundColor: "#0B0F1C",
    paddingHorizontal: 28,
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 36,
  },
  landingBlob1: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(0, 229, 160, 0.07)",
    top: -60,
    right: -80,
  },
  landingBlob2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59, 130, 246, 0.06)",
    bottom: 80,
    left: -60,
  },
  landingBlob3: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(168, 85, 247, 0.05)",
    top: SCREEN_HEIGHT * 0.42,
    right: -30,
  },
  landingTopSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  landingLogoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "rgba(0, 229, 160, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 229, 160, 0.06)",
    marginBottom: 24,
    shadowColor: "#00e5a0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  landingLogoInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#00e5a0",
    alignItems: "center",
    justifyContent: "center",
  },
  landingAppName: {
    fontSize: 38,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 10,
    fontFamily: Platform.OS === "web" ? "Outfit, Montserrat, Inter, sans-serif" : undefined,
  },
});
