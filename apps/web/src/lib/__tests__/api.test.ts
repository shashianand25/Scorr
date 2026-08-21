import {
  checkMasterQuizCache,
  saveMasterQuiz,
  syncUser,
  fetchQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  fetchSharedQuiz,
  saveQuizHistory,
  fetchQuizHistory,
  saveBattleHistory,
  fetchBattleHistory,
  checkAiDailyLimit,
  recordAiGeneration,
  fetchAppConfig,
  sendFeedback,
} from "../api";

describe("Web API Client Suite (apps/web/src/lib/api.ts)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("checkMasterQuizCache: returns cache hit when master quiz exists", async () => {
    const mockResponse = {
      hit: true,
      masterQuiz: {
        id: "mq_1",
        contentHash: "hash123",
        title: "Microbiology",
        category: "Biology",
        questionCount: 10,
        flashcardCount: 5,
        sourceText: "Sample text",
        language: "en",
        createdAt: "2026-08-21T00:00:00.000Z",
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await checkMasterQuizCache("hash123", "en");
    expect(result.hit).toBe(true);
    expect(result.masterQuiz?.title).toBe("Microbiology");
    expect(result.error).toBeNull();
  });

  it("checkMasterQuizCache: handles cache miss cleanly", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ hit: false, masterQuiz: null }),
    } as Response);

    const result = await checkMasterQuizCache("non_existent_hash");
    expect(result.hit).toBe(false);
    expect(result.masterQuiz).toBeNull();
  });

  it("saveMasterQuiz: sends POST request and returns created master quiz", async () => {
    const payload = {
      id: "mq_100",
      contentHash: "hash_abc",
      title: "Cell Division",
      category: "Biology",
      questionCount: 5,
      sourceText: "Mitosis and Meiosis...",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ masterQuiz: { ...payload, createdAt: "2026-08-21T00:00:00Z" } }),
    } as Response);

    const result = await saveMasterQuiz(payload);
    expect(result.masterQuiz?.title).toBe("Cell Division");
    expect(result.error).toBeNull();
  });

  it("syncUser: sends user profile and returns synced user record", async () => {
    const mockUser = {
      id: "usr_42",
      email: "student@scorrapp.com",
      name: "Alex",
      image: null,
      xp: 150,
      level: 2,
      streak: 3,
      createdAt: "2026-08-21T00:00:00Z",
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: mockUser }),
    } as Response);

    const result = await syncUser({ uid: "usr_42", email: "student@scorrapp.com" });
    expect(result.user?.id).toBe("usr_42");
    expect(result.user?.xp).toBe(150);
  });

  it("fetchQuizzes: fetches and parses mobile quizzes list", async () => {
    const mockQuizzes = [
      {
        id: "quiz_1",
        title: "Calculus Limits",
        category: "Math",
        questionCount: 5,
        sourceText: "# Limit of f(x)\n= 0\n\n? Find limit\n+ 0\n- 1",
        attempts: [],
        wrongQuestions: [],
        createdAt: "2026-08-21T00:00:00Z",
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ quizzes: mockQuizzes }),
    } as Response);

    const result = await fetchQuizzes("usr_42");
    expect(result.quizzes).toHaveLength(1);
    expect(result.quizzes[0].title).toBe("Calculus Limits");
  });

  it("createQuiz, updateQuiz, deleteQuiz: perform CRUD actions", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quiz: { id: "q_new", title: "New Quiz" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ quiz: { id: "q_new", title: "Updated Quiz" } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      } as Response);

    const createRes = await createQuiz({
      userId: "u1",
      title: "New Quiz",
      category: "Science",
      questionCount: 5,
    });
    expect(createRes.quiz?.title).toBe("New Quiz");

    const updateRes = await updateQuiz({
      userId: "u1",
      quizId: "q_new",
      title: "Updated Quiz",
    });
    expect(updateRes.quiz?.title).toBe("Updated Quiz");

    const deleteRes = await deleteQuiz("u1", "q_new");
    expect(deleteRes.error).toBeNull();
  });

  it("fetchSharedQuiz: fetches quiz by share id", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        quiz: {
          id: "shared_1",
          title: "Physics",
        },
      }),
    } as Response);

    const result = await fetchSharedQuiz("shared_1");
    expect(result.quiz?.title).toBe("Physics");
  });

  it("saveQuizHistory and fetchQuizHistory: manage quiz attempts", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ eventId: "ev_1" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [{ id: "ev_1", metadata: { score: 90 } }] }),
      } as Response);

    const saveRes = await saveQuizHistory({
      userId: "u1",
      quizTitle: "Chemistry",
      totalQuestions: 10,
      correct: 9,
      wrong: 1,
      score: 90,
    });
    expect(saveRes.error).toBeNull();

    const fetchRes = await fetchQuizHistory("u1");
    expect(fetchRes.history).toHaveLength(1);
  });

  it("saveBattleHistory and fetchBattleHistory: manage battle records", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ eventId: "bev_1" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [{ id: "bev_1", room_code: "ABC123" }] }),
      } as Response);

    const saveRes = await saveBattleHistory({
      userId: "u1",
      roomCode: "ABC123",
      quizTitle: "History",
      myScore: 5,
      opponentScore: 4,
      opponentName: "Bob",
      won: true,
    });
    expect(saveRes.error).toBeNull();

    const fetchRes = await fetchBattleHistory("u1");
    expect(fetchRes.history[0].room_code).toBe("ABC123");
  });

  it("checkAiDailyLimit and recordAiGeneration: manage daily quotas", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowed: true, remaining: 8, limit: 10 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

    const limitRes = await checkAiDailyLimit("u1");
    expect(limitRes.allowed).toBe(true);
    expect(limitRes.remaining).toBe(8);

    const recordRes = await recordAiGeneration("u1");
    expect(recordRes.success).toBe(true);
  });

  it("fetchAppConfig: retrieves application and AI parameters", async () => {
    const mockConfig = {
      aiConfig: {
        geminiKey: "mock_key",
        modelUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash",
        promptTemplate: "Generate questions",
        chunkSize: 4000,
        maxChunks: 10,
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockConfig,
    } as Response);

    const result = await fetchAppConfig();
    expect(result.config?.aiConfig.chunkSize).toBe(4000);
    expect(result.error).toBeNull();
  });

  it("sendFeedback: dispatches user feedback messages", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    const result = await sendFeedback({
      userId: "usr_42",
      userEmail: "tester@scorrapp.com",
      message: "The new spaced repetition intervals work great!",
    });

    expect(result.error).toBeNull();
  });

  it("handles network errors and timeouts gracefully", async () => {
    // 500 error
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal Server Error" }),
    } as Response);

    const errorRes = await fetchSharedQuiz("shared_err");
    expect(errorRes.quiz).toBeNull();
    expect(errorRes.error).toBe("Internal Server Error");

    // Network timeout exception
    global.fetch = jest.fn().mockRejectedValue(new Error("Network timeout: Server took too long"));
    const timeoutRes = await fetchSharedQuiz("shared_timeout");
    expect(timeoutRes.error).toContain("timeout");
  });
});
