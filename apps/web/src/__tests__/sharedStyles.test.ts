import {
  THEME_COLORS,
  glassCard,
  tabContainerStyle,
  pillButtonBase,
  getTabButtonStyle,
} from "../styles/sharedStyles";

describe("Shared Web Styles Suite", () => {
  it("exports standardized theme color tokens", () => {
    expect(THEME_COLORS.bgDark).toBe("#0d111d");
    expect(THEME_COLORS.textPrimary).toBe("#ffffff");
    expect(THEME_COLORS.accentPurple).toBe("#6366f1");
  });

  it("exports glassCard and tab container styling", () => {
    expect(glassCard.background).toBe(THEME_COLORS.bgDark);
    expect(tabContainerStyle.display).toBe("flex");
    expect(tabContainerStyle.borderRadius).toBe(14);
  });

  it("generates correct active vs inactive tab button styles", () => {
    const activeStyle = getTabButtonStyle(true);
    expect(activeStyle.background).toBe(THEME_COLORS.borderAccent);
    expect(activeStyle.fontWeight).toBe(700);

    const inactiveStyle = getTabButtonStyle(false);
    expect(inactiveStyle.background).toBe("transparent");
    expect(inactiveStyle.fontWeight).toBe(500);
  });
});
