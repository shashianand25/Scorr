describe("Unified Storage Key Helpers", () => {
  function getStorageKey(type: "quizzes" | "flashcards" | "settings", userId?: string | null): string {
    if (userId) return "quizforge_" + type + "_" + userId;
    return "quizforge_" + type + "_global";
  }

  it("generates user-scoped storage key when userId is present", () => {
    expect(getStorageKey("quizzes", "user_123")).toBe("quizforge_quizzes_user_123");
    expect(getStorageKey("settings", "user_abc")).toBe("quizforge_settings_user_abc");
  });

  it("generates global storage key when userId is omitted or null", () => {
    expect(getStorageKey("quizzes", null)).toBe("quizforge_quizzes_global");
    expect(getStorageKey("flashcards")).toBe("quizforge_flashcards_global");
  });
});
