import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles/shared";
import type { HomeScreenProps } from "../types/HomeScreenProps";

const KeyboardWrapper = Platform.OS === "ios" ? KeyboardAvoidingView : View;

export function AuthScreen({ p }: { p: any }) {
  const {
    // Auth view state
    authView,
    setAuthView,
    authMode,
    setAuthMode,
    signupStep,
    setSignupStep,
    otpCode,
    setOtpCode,
    otpResendCountdown,
    setOtpResendCountdown,
    otpDevCode,
    setOtpDevCode,
    authViewAnim,
    // Auth form fields
    authName,
    setAuthName,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    showAuthPassword,
    setShowAuthPassword,
    // Auth status
    authLoading,
    setAuthLoading,
    authError,
    setAuthError,
    // Auth actions
    setShowAuthScreen,
    setCustomToast,
    // Firebase / API
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    sendOtpEmail,
    verifyOtpCode,
  } = p;

  // ── Auth view: "landing" | "email" ──────────────────────────────
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCountdown((prev: number) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCountdown]);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const switchAuthView = (view: "landing" | "email") => {
    const toValue = view === "email" ? 1 : 0;
    Animated.timing(authViewAnim, {
      toValue,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setAuthView(view));
    setAuthView(view);
  };

  const handleSendSignupOtp = async () => {
    setAuthError(null);
    const name = authName.trim();
    const email = authEmail.trim();
    const password = authPassword;

    if (!name) {
      setAuthError("Please enter your full name.");
      return;
    }
    if (!email || !isValidEmail(email)) {
      setAuthError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }
    if (!password || password.length < 6) {
      setAuthError("Password must be at least 6 characters long.");
      return;
    }

    setAuthLoading(true);
    const { ok, error, devCode } = await sendOtpEmail(email);
    setAuthLoading(false);

    if (!ok) {
      setAuthError(error || "Failed to send verification code. Please check your email.");
      return;
    }

    if (devCode) setOtpDevCode(devCode);
    setSignupStep("otp");
    setOtpCode("");
    setOtpResendCountdown(30);
  };

  const handleVerifyAndSignup = async () => {
    setAuthError(null);
    const email = authEmail.trim();
    const code = otpCode.trim();

    if (!code || code.length < 6) {
      setAuthError("Please enter the full 6-digit passcode sent to your email.");
      return;
    }

    setAuthLoading(true);
    const { valid, error: otpError } = await verifyOtpCode(email, code);
    if (!valid) {
      setAuthLoading(false);
      setAuthError(otpError || "Incorrect passcode. Please check your email and try again.");
      return;
    }

    // Passcode verified! Complete Firebase Signup
    const { error: signUpErr } = await signUpWithEmail(email, authPassword, authName.trim());
    setAuthLoading(false);
    if (signUpErr) {
      setAuthError(signUpErr);
      return;
    }

    setShowAuthScreen(false);
    setSignupStep("details");
    setOtpCode("");
    setCustomToast({
      message: "Account created successfully! Welcome to Scorrapp.",
      icon: "checkmark-circle",
      color: "#10b981",
    });
    setTimeout(() => setCustomToast(null), 4000);
  };

  const handleSigninSubmit = async () => {
    setAuthError(null);
    const email = authEmail.trim();
    if (!email || !isValidEmail(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (!authPassword) {
      setAuthError("Please enter your password.");
      return;
    }

    setAuthLoading(true);
    const { error } = await signInWithEmail(email, authPassword);
    setAuthLoading(false);
    if (error) {
      setAuthError(error);
      return;
    }
    setShowAuthScreen(false);
  };

  const handleResetPassword = async () => {
    if (!authEmail.trim() || !isValidEmail(authEmail)) {
      setAuthError("Please enter a valid email address to reset password.");
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    const { error } = await resetPassword(authEmail.trim());
    setAuthLoading(false);
    if (error) {
      setAuthError(error);
    } else {
      Alert.alert("Check your email", "A password reset link has been sent to " + authEmail);
    }
  };

  const renderAuthScreen = () => {
    if (authView === "email") {
      // ── Email form sub-screen ────────────────────────────────
      const slideX = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
      const fadeIn = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
      return (
        <Animated.View style={[styles.authRoot, { opacity: fadeIn, transform: [{ translateX: slideX }] }]}>
          {/* Back */}
          <Pressable onPress={() => { setAuthError(null); if (signupStep === "otp") setSignupStep("details"); else switchAuthView("landing"); }} style={styles.authBackBtn}>
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
            <Text style={styles.authBackText}>{signupStep === "otp" ? "Change Details" : "Back"}</Text>
          </Pressable>

          <View style={styles.authEmailBody}>
            <Text style={styles.authBigTitle}>
              {authMode === "signup" ? (signupStep === "otp" ? "Verify your email" : "Create account") : "Welcome back"}
            </Text>
            <Text style={styles.authBigSub}>
              {authMode === "signup"
                ? (signupStep === "otp" ? `We sent a 6-digit passcode to ${authEmail}` : "Start mastering any subject today")
                : "Sign in to access your quizzes"}
            </Text>

            {/* Mode toggle (signup details or signin) */}
            {signupStep === "details" && (
              <View style={styles.authPillToggle}>
                <Pressable
                  onPress={() => { setAuthMode("signup"); setAuthError(null); }}
                  style={[styles.authPillBtn, authMode === "signup" && styles.authPillBtnOn]}
                >
                  <Text style={[styles.authPillText, authMode === "signup" && styles.authPillTextOn]}>Sign Up</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setAuthMode("signin"); setAuthError(null); }}
                  style={[styles.authPillBtn, authMode === "signin" && styles.authPillBtnOn]}
                >
                  <Text style={[styles.authPillText, authMode === "signin" && styles.authPillTextOn]}>Sign In</Text>
                </Pressable>
              </View>
            )}

            {/* Step 1: Signup Details / Signin Form */}
            {signupStep === "details" ? (
              <>
                {/* Name (signup only) */}
                {authMode === "signup" && (
                  <View style={styles.authField}>
                    <Ionicons name="person-outline" size={16} color="#8888aa" style={{ marginRight: 10 }} />
                    <TextInput
                      style={styles.authFieldInput}
                      placeholder="Full name"
                      placeholderTextColor="#666688"
                      value={authName}
                      onChangeText={setAuthName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View style={styles.authField}>
                  <Ionicons name="mail-outline" size={16} color="#8888aa" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.authFieldInput}
                    placeholder="Email address"
                    placeholderTextColor="#666688"
                    value={authEmail}
                    onChangeText={(val) => { setAuthEmail(val); setAuthError(null); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.authField}>
                  <Ionicons name="lock-closed-outline" size={16} color="#8888aa" style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.authFieldInput, { flex: 1 }]}
                    placeholder="Password (min. 6 characters)"
                    placeholderTextColor="#666688"
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    secureTextEntry={!showAuthPassword}
                  />
                  <Pressable onPress={() => setShowAuthPassword(!showAuthPassword)}>
                    <Ionicons name={showAuthPassword ? "eye-off-outline" : "eye-outline"} size={16} color="#8888aa" />
                  </Pressable>
                </View>

                {authMode === "signin" && (
                  <Pressable onPress={handleResetPassword} style={{ alignSelf: "flex-end", marginTop: -4, marginBottom: 12, marginRight: 4 }}>
                    <Text style={{ color: "#6366f1", fontSize: 13, fontWeight: "600" }}>Forgot Password?</Text>
                  </Pressable>
                )}

                {/* Fixed-height Error Container — Prevents layout shift of the button */}
                <View style={{ minHeight: 44, justifyContent: "center", marginVertical: 4 }}>
                  {authError ? (
                    <View style={styles.authErrBox}>
                      <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
                      <Text style={styles.authErrTxt} numberOfLines={2}>{authError}</Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  disabled={authLoading || !authEmail || !authPassword}
                  onPress={authMode === "signup" ? handleSendSignupOtp : handleSigninSubmit}
                  style={({ pressed }) => [
                    styles.authBigGreenBtn,
                    (!authEmail || !authPassword) && { opacity: 0.45 },
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={styles.authBigGreenBtnText}>
                    {authLoading ? "Sending passcode…" : authMode === "signup" ? "Send Passcode →" : "Sign In"}
                  </Text>
                </Pressable>
              </>
            ) : (
              /* Step 2: OTP Passcode Input */
              <>
                <View style={{ marginVertical: 14, alignItems: "center" }}>
                  <Text style={{ fontSize: 13, color: "#94a3b8", marginBottom: 16, textAlign: "center" }}>
                    Enter 6-digit passcode sent to{"\n"}
                    <Text style={{ color: "#818cf8", fontWeight: "700" }}>{authEmail}</Text>
                  </Text>

                  {/* Passcode Field */}
                  <View style={[styles.authField, { width: "100%", height: 56, justifyContent: "center", backgroundColor: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.3)" }]}>
                    <Ionicons name="key-outline" size={20} color="#818cf8" style={{ marginRight: 12 }} />
                    <TextInput
                      style={[styles.authFieldInput, { fontSize: 22, fontWeight: "800", letterSpacing: 8, color: "#ffffff" }]}
                      placeholder="000000"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={otpCode}
                      onChangeText={(val) => { setOtpCode(val.replace(/[^0-9]/g, '')); setAuthError(null); }}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />
                  </View>
                </View>

                {/* Fixed-height Error Container */}
                <View style={{ minHeight: 44, justifyContent: "center", marginVertical: 4 }}>
                  {authError ? (
                    <View style={styles.authErrBox}>
                      <Ionicons name="alert-circle-outline" size={15} color="#f87171" />
                      <Text style={styles.authErrTxt} numberOfLines={2}>{authError}</Text>
                    </View>
                  ) : null}
                </View>

                <Pressable
                  disabled={authLoading || otpCode.length < 6}
                  onPress={handleVerifyAndSignup}
                  style={({ pressed }) => [
                    styles.authBigGreenBtn,
                    otpCode.length < 6 && { opacity: 0.45 },
                    pressed && styles.pressedScale,
                  ]}
                >
                  <Text style={styles.authBigGreenBtnText}>
                    {authLoading ? "Verifying…" : "Verify & Complete Signup"}
                  </Text>
                </Pressable>

                {/* Resend Passcode Row */}
                <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10 }}>
                  <Text style={{ fontSize: 13, color: "#8888aa" }}>Didn't receive passcode? </Text>
                  <Pressable
                    disabled={otpResendCountdown > 0 || authLoading}
                    onPress={handleSendSignupOtp}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color: otpResendCountdown > 0 ? "#64748b" : "#818cf8" }}>
                      {otpResendCountdown > 0 ? `Resend (${otpResendCountdown}s)` : "Resend Code"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            <Pressable onPress={() => setShowAuthScreen(false)} style={[styles.authSkipRow, { marginTop: 12 }]}>
              <Text style={styles.authSkipTxt}>Continue as guest</Text>
            </Pressable>
          </View>
        </Animated.View>
      );
    }

    // ── Landing sub-screen ─────────────────────────────────────────
    const slideX = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    const fadeOut = authViewAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
    return (
      <Animated.View style={[styles.authRoot, { opacity: fadeOut, transform: [{ translateX: slideX }] }]}>
        {/* Hero image */}
        <View style={styles.authHeroWrap}>
          <Image
            source={require("../../assets/images/auth_hero.jpeg")}
            style={styles.authHeroImg}
            resizeMode="cover"
          />
        </View>

        {/* Copy */}
        <View style={styles.authCopyBlock}>
          <Text style={styles.authBigTitle}>The smartest way{"\n"}to study.</Text>
          <Text style={styles.authBigSub}>Sign up for free — no account needed to start.</Text>
        </View>

        {/* Buttons */}
        <View style={styles.authBtnStack}>
          {/* Google */}
          <Pressable
            disabled={authLoading}
            onPress={async () => {
              setAuthLoading(true);
              const user = await signInWithGoogle();
              setAuthLoading(false);
              if (user) setShowAuthScreen(false);
            }}
            style={({ pressed }) => [styles.authGooglePill, pressed && styles.pressedScale, authLoading && { opacity: 0.7 }]}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.authGooglePillText}>
              {authLoading ? "Signing in…" : "Continue with Google"}
            </Text>
          </Pressable>

          {/* Email */}
          <Pressable
            onPress={() => { switchAuthView("email"); setAuthMode("signup"); }}
            style={({ pressed }) => [styles.authEmailPill, pressed && styles.pressedScale]}
          >
            <Ionicons name="mail-outline" size={20} color="#ccccee" />
            <Text style={styles.authEmailPillText}>Sign up with email</Text>
          </Pressable>

          {/* Already have account */}
          <View style={styles.authLoginRow}>
            <Text style={styles.authLoginRowTxt}>Have an account?</Text>
            <Pressable onPress={() => { switchAuthView("email"); setAuthMode("signin"); }}>
              <Text style={styles.authLoginLink}>  Log in</Text>
            </Pressable>
          </View>
        </View>

        <Pressable onPress={() => setShowAuthScreen(false)} style={styles.authSkipRow}>
          <Text style={styles.authSkipTxt}>Continue as guest</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.landingSafeArea]} edges={["top", "left", "right", "bottom"]}>
      <KeyboardWrapper
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderAuthScreen()}
        </ScrollView>
      </KeyboardWrapper>
    </SafeAreaView>
  );
}
