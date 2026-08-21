describe("Date and Relative Time Utilities", () => {
  function formatRelativeTime(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "Just now";
    if (diffMin < 60) return diffMin + "m ago";
    if (diffHours < 24) return diffHours + "h ago";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return diffDays + "d ago";
    return new Date(timestamp).toLocaleDateString();
  }

  it("formats very recent timestamps as Just now", () => {
    expect(formatRelativeTime(Date.now() - 5000)).toBe("Just now");
  });

  it("formats minutes ago correctly", () => {
    expect(formatRelativeTime(Date.now() - 15 * 60 * 1000)).toBe("15m ago");
  });

  it("formats hours ago correctly", () => {
    expect(formatRelativeTime(Date.now() - 3 * 3600 * 1000)).toBe("3h ago");
  });

  it("formats yesterday correctly", () => {
    expect(formatRelativeTime(Date.now() - 25 * 3600 * 1000)).toBe("Yesterday");
  });
});
