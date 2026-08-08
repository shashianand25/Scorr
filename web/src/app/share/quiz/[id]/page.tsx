import React from "react";

export default async function SharedQuizPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  let quizTitle = "a Shared Quiz";
  let quizQuestionCount: number | null = null;
  
  try {
    const res = await fetch(`https://api.scorrapp.com/api/share/quiz/${id}`, { next: { revalidate: 60 } });
    const data = await res.json();
    if (data.quiz && data.quiz.title) {
      quizTitle = data.quiz.title;
      quizQuestionCount = data.quiz.questions;
    }
  } catch (err) {
    console.error("Failed to fetch shared quiz info", err);
  }

  const deepLinkUrl = `scorr://share/quiz/${id}`;
  const playStoreUrl = "https://play.google.com/store/apps/details?id=com.radium230sorganization.quizforge";
  const appStoreUrl = "https://apps.apple.com/app/scorr/id6746505023";

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{quizTitle} — Scorr</title>
        <meta name="description" content={`You've been invited to study "${quizTitle}" on Scorr.`} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #09090f;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }
          .orb {
            position: fixed;
            border-radius: 50%;
            filter: blur(100px);
            pointer-events: none;
          }
          .card {
            position: relative;
            z-index: 10;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 28px;
            padding: 40px 32px 36px;
            max-width: 380px;
            width: calc(100vw - 48px);
            text-align: center;
            backdrop-filter: blur(24px);
            box-shadow: 0 32px 80px rgba(0,0,0,0.6);
          }
          .icon-wrap {
            width: 72px;
            height: 72px;
            margin: 0 auto 24px;
            background: rgba(99,102,241,0.15);
            border: 1px solid rgba(99,102,241,0.3);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(99,102,241,0.15);
            border: 1px solid rgba(99,102,241,0.25);
            border-radius: 100px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 600;
            color: #a5b4fc;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 26px;
            font-weight: 800;
            color: #fff;
            line-height: 1.25;
            margin-bottom: 8px;
          }
          .quiz-title {
            background: linear-gradient(135deg, #818cf8, #34d399);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .subtitle {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            margin-bottom: 32px;
          }
          .btn-primary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            padding: 16px 24px;
            background: linear-gradient(135deg, #6366f1, #4f46e5);
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            text-decoration: none;
            box-shadow: 0 8px 32px rgba(99,102,241,0.4);
            transition: transform 0.15s, box-shadow 0.15s;
            margin-bottom: 12px;
          }
          .btn-primary:active { transform: scale(0.97); }
          .divider {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 20px 0;
            color: rgba(255,255,255,0.2);
            font-size: 12px;
          }
          .divider::before, .divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,0.08);
          }
          .store-row {
            display: flex;
            gap: 10px;
          }
          .btn-store {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            color: rgba(255,255,255,0.7);
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            transition: background 0.15s;
          }
          .btn-store:hover { background: rgba(255,255,255,0.08); }
          .footer {
            margin-top: 24px;
            font-size: 11px;
            color: rgba(255,255,255,0.2);
          }
        `}} />
      </head>
      <body>
        {/* Background orbs */}
        <div className="orb" style={{ top: "-20%", left: "-15%", width: "55%", height: "55%", background: "radial-gradient(circle, rgba(99,102,241,0.25), transparent 70%)" }} />
        <div className="orb" style={{ bottom: "-20%", right: "-15%", width: "55%", height: "55%", background: "radial-gradient(circle, rgba(52,211,153,0.15), transparent 70%)" }} />

        <div className="card">
          <div className="icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>

          <div className="badge">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="#a5b4fc"><circle cx="5" cy="5" r="5"/></svg>
            Scorr Quiz
          </div>

          <h1>
            You&apos;ve been invited to<br />
            <span className="quiz-title">{quizTitle}</span>
          </h1>

          {quizQuestionCount != null && (
            <p className="subtitle">{quizQuestionCount} questions · Tap below to start</p>
          )}

          {/* Smart open button — tries deep link, falls back to stores */}
          <a className="btn-primary" href={deepLinkUrl} id="open-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open in Scorr App
          </a>

          <div className="divider">Don&apos;t have the app?</div>

          <div className="store-row">
            <a className="btn-store" href={playStoreUrl} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l15 8.5-15 8.5c-.5.33-1.5.33-1.5-.5z"/></svg>
              Google Play
            </a>
            <a className="btn-store" href={appStoreUrl} target="_blank" rel="noopener noreferrer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.15-2.17 1.28-2.15 3.8.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.78M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              App Store
            </a>
          </div>

          <p className="footer">scorrapp.com</p>
        </div>
      </body>
    </html>
  );
}
