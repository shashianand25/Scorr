describe("Modal Visibility Mapping", () => {
  function getActiveModalCount(modalStates: Record<string, boolean | object | null>): number {
    return Object.values(modalStates).filter((v) => Boolean(v)).length;
  }

  it("accurately counts open modal layers", () => {
    const states = {
      showQuizActions: null,
      showDeleteConfirm: true,
      showSettings: false,
      showFeedback: { text: "Great app" },
    };
    expect(getActiveModalCount(states)).toBe(2);
  });
});
