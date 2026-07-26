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
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-slate-950">
      
      {/* Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-rose-600/20 blur-[100px] pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-[380px] bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-[32px] p-8 text-center shadow-2xl">
        
        {/* Icon Container with Glow */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-[20px] blur-xl" />
          <div className="relative w-full h-full bg-indigo-500/10 border border-indigo-500/30 rounded-[20px] flex items-center justify-center text-indigo-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 leading-snug">
          You've been invited to<br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400">
            {quizTitle}
          </span>
        </h1>
        
        {quizQuestionCount != null && (
          <p className="text-slate-400 text-sm mb-8 font-medium">
            This course contains {quizQuestionCount} questions.
          </p>
        )}

        <a 
          href={deepLinkUrl}
          className="group relative flex items-center justify-center w-full bg-indigo-500 hover:bg-indigo-400 transition-all duration-300 text-white text-[16px] font-semibold py-4 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] mb-6 overflow-hidden"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:animate-[shimmer_1.5s_infinite]" />
          Open in Scorr App
        </a>

        <div className="pt-6 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 leading-relaxed">
            Don't have the app yet? <br/>
            Search for <strong className="text-slate-300">Scorr</strong> on the App Store or Google Play.
          </p>
        </div>
      </div>
      
      {/* Global Style for the shimmer animation since it might not be in tailwind config */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
