import { logger, formatWebLogEntry } from "../logger";

describe("Web Structured Logger", () => {
  it("formats structured JSON log objects with required fields", () => {
    const entry = formatWebLogEntry("info", "WebAuth", "User logged in", { userId: "123" });
    expect(entry).toHaveProperty("timestamp");
    expect(entry.level).toBe("info");
    expect(entry.tag).toBe("WebAuth");
    expect(entry.message).toBe("User logged in");
    expect(entry.context).toEqual({ userId: "123" });
  });

  it("handles debug logging without throwing", () => {
    const entry = logger.debug("QuizClient", "Rendering quiz", { quizId: "q_456" });
    expect(entry.level).toBe("debug");
    expect(entry.tag).toBe("QuizClient");
    expect(entry.message).toBe("Rendering quiz");
  });

  it("handles warning logging and produces valid structured entry", () => {
    const entry = logger.warn("CacheService", "Cache miss", { key: "master_1" });
    expect(entry.level).toBe("warn");
    expect(entry.tag).toBe("CacheService");
  });

  it("handles error logging with Error object serialization", () => {
    const testError = new Error("Network timeout");
    const entry = logger.error("API", "Request failed", testError, { endpoint: "/api/config" });
    expect(entry.level).toBe("error");
    expect(entry.context).toEqual(
      expect.objectContaining({
        error: "Network timeout",
        endpoint: "/api/config",
      })
    );
  });
});
