"use client";

import React, { useEffect, useState } from "react";

export default function DownloadPage() {
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge";
  const appStoreUrl = "https://apps.apple.com/app/scorr/id6746505023";
  const iosDeepLinkUrl = "scorr://";
  const androidIntentUrl = `intent://#Intent;scheme=scorr;package=com.radium230sorganization.quizforge;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  const [platform, setPlatform] = useState<"android" | "ios" | "desktop">("desktop");
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;

    if (isAndroid) {
      setPlatform("android");
      // Android Intent scheme natively launches app if installed, or redirects directly to Play Store if not
      window.location.href = androidIntentUrl;
      return;
    }

    if (isIOS) {
      setPlatform("ios");
      const now = Date.now();
      let appOpened = false;

      const handleVisibilityChange = () => {
        if (document.hidden || document.visibilityState === "hidden") {
          appOpened = true;
        }
      };

      window.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("pagehide", handleVisibilityChange);
      window.addEventListener("blur", handleVisibilityChange);

      // Attempt to launch app via custom scheme
      window.location.href = iosDeepLinkUrl;

      // Fallback to App Store if not installed
      const fallbackTimer = setTimeout(() => {
        const elapsed = Date.now() - now;
        if (!appOpened && elapsed < 2500) {
          window.location.href = appStoreUrl;
        }
      }, 1200);

      return () => {
        clearTimeout(fallbackTimer);
        window.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("pagehide", handleVisibilityChange);
        window.removeEventListener("blur", handleVisibilityChange);
      };
    }

    setPlatform("desktop");
    setRedirecting(false);
  }, [androidIntentUrl]);

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#09090f",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
      color: "#ffffff",
    }}>
      {/* Glow Orbs */}
      <div style={{
        position: "fixed",
        top: "-20%",
        left: "-15%",
        width: "55vw",
        height: "55vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)",
        filter: "blur(100px)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "fixed",
        bottom: "-20%",
        right: "-15%",
        width: "55vw",
        height: "55vw",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(52,211,153,0.15), transparent 70%)",
        filter: "blur(100px)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "relative",
        zIndex: 10,
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "28px",
        padding: "44px 32px 36px",
        maxWidth: "400px",
        width: "100%",
        textAlign: "center",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
      }}>
        {/* App Icon */}
        <div style={{
          width: "76px",
          height: "76px",
          margin: "0 auto 24px",
          background: "rgba(99,102,241,0.15)",
          border: "1px solid rgba(99,102,241,0.3)",
          borderRadius: "22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(99,102,241,0.25)",
        }}>
          <span style={{ fontSize: "38px" }}>⚡</span>
        </div>

        {/* Badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(99,102,241,0.15)",
          border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: "100px",
          padding: "5px 14px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#a5b4fc",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: "16px",
        }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", display: "inline-block" }}></span>
          Scorr App
        </div>

        <h1 style={{
          fontSize: "28px",
          fontWeight: 800,
          color: "#ffffff",
          lineHeight: 1.25,
          marginBottom: "10px",
        }}>
          Get <span style={{
            background: "linear-gradient(135deg, #818cf8, #34d399)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>Scorr</span>
        </h1>

        <p style={{
          fontSize: "14px",
          color: "rgba(255,255,255,0.6)",
          lineHeight: "22px",
          marginBottom: "32px",
        }}>
          {redirecting
            ? "Redirecting to Scorr... If the app is not installed, you'll be taken to the app store."
            : "Turn any notes, PDFs, or PPTs into active quizzes and flashcards in seconds with AI."}
        </p>

        {/* Open in App Button */}
        <a
          href={platform === "android" ? androidIntentUrl : iosDeepLinkUrl}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "16px 24px",
            background: "linear-gradient(135deg, #6366f1, #4f46e5)",
            color: "#ffffff",
            fontSize: "16px",
            fontWeight: 700,
            borderRadius: "16px",
            textDecoration: "none",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            marginBottom: "14px",
            boxSizing: "border-box",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Open Scorr App
        </a>

        {/* Store Links */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginTop: "16px",
        }}>
          <a
            href={playStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "13px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z"/></svg>
            Google Play
          </a>
          <a
            href={appStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "13px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "14px",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.17 1.28-2.15 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.78M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            App Store
          </a>
        </div>

        <p style={{
          marginTop: "28px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.3)",
        }}>
          scorrapp.com
        </p>
      </div>
    </div>
  );
}
