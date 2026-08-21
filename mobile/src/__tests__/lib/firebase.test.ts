jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ idToken: "test-token" }),
    signOut: jest.fn().mockResolvedValue(undefined),
  },
}));

import { assertFirebaseConfigured } from "../../lib/firebase";

describe("Mobile Firebase Configuration Environment Assertions", () => {
  const originalEnv = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = originalEnv;
  });

  it("throws a descriptive error when EXPO_PUBLIC_FIREBASE_API_KEY is missing", () => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    expect(() => assertFirebaseConfigured()).toThrow(
      /Missing EXPO_PUBLIC_FIREBASE_API_KEY environment variable/
    );
  });

  it("succeeds when EXPO_PUBLIC_FIREBASE_API_KEY is present", () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "AIzaSyDummyMobileKeyForUnitTestingOnly";
    expect(() => assertFirebaseConfigured()).not.toThrow();
  });
});
