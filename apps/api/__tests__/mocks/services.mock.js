/**
 * In-memory Mock Clients & Service Stubs for Isolated Backend Tests.
 * Ensures zero outgoing network calls to live databases or third-party APIs during CI runs.
 */

class MockDatabasePool {
  constructor(initialData = {}) {
    this.data = initialData;
    this.queries = [];
  }

  async query(text, params = []) {
    this.queries.push({ text, params, timestamp: Date.now() });

    // Mock feedback insertion
    if (text.includes('INSERT INTO user_feedback')) {
      return { rowCount: 1, rows: [{ id: params[0] }] };
    }

    // Mock master quiz cache hit/miss
    if (text.includes('SELECT') && text.includes('master_quizzes')) {
      const contentHash = params[0];
      if (this.data[contentHash]) {
        return { rows: [this.data[contentHash]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // Mock history insertion
    if (text.includes('INSERT INTO quiz_history')) {
      return { rowCount: 1, rows: [{ id: params[0] }] };
    }

    // Mock user XP update
    if (text.includes('UPDATE users SET xp')) {
      return { rows: [{ xp: 100, level: 2 }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

class MockResendClient {
  constructor() {
    this.sentEmails = [];
    this.emails = {
      send: async (payload) => {
        this.sentEmails.push(payload);
        return { data: { id: `email_${Date.now()}` }, error: null };
      },
    };
  }
}

module.exports = {
  MockDatabasePool,
  MockResendClient,
};
