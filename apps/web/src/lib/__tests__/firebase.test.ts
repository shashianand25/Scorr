import { assertFirebaseConfigured } from "../firebase";

describe("Web Firebase Configuration Environment Assertions", () => {
  const originalEnv = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = originalEnv;
  });

  it("throws a descriptive error when NEXT_PUBLIC_FIREBASE_API_KEY is missing", () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    expect(() => assertFirebaseConfigured()).toThrow(
      /Missing NEXT_PUBLIC_FIREBASE_API_KEY environment variable/
    );
  });

  it("succeeds when NEXT_PUBLIC_FIREBASE_API_KEY is defined", () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = "test_dummy_firebase_api_key_valid";
    expect(() => assertFirebaseConfigured()).not.toThrow();
  });
});
