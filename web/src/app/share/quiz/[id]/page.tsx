import React from "react";

export default async function SharedQuizPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  let quizTitle = "a Shared Quiz";
  let quizQuestionCount = null;
  
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

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", padding: "2rem 1rem", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: "340px", background: "#10142a", borderRadius: "32px", padding: "32px 24px", boxSizing: "border-box", fontFamily: "var(--font-inter, var(--font-sans))", textAlign: "center" }}>
        
        <div style={{ width: "64px", height: "64px", borderRadius: "16px", background: "rgba(139,143,240,0.18)", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", color: "#a5a8f5" }}>
          <i className="ti ti-books" style={{ fontSize: "32px" }}></i>
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "20px", fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>
          You've been invited to {quizTitle}
        </h1>
        
        {quizQuestionCount != null && (
          <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#777d99" }}>
            This quiz contains {quizQuestionCount} questions.
          </p>
        )}

        <a 
          href={deepLinkUrl}
          style={{ 
            display: "block", 
            background: "#8b8ff0", 
            color: "#1a1640", 
            textDecoration: "none",
            fontSize: "15px", 
            fontWeight: 600, 
            padding: "14px 24px", 
            borderRadius: "14px",
            marginBottom: "16px"
          }}
        >
          Open in Scorr App
        </a>

        <p style={{ margin: 0, fontSize: "13px", color: "#5b6080" }}>
          Don't have the app yet? <br/>
          Search for <strong>Scorr</strong> on the App Store or Google Play.
        </p>
      </div>
    </div>
  );
}
