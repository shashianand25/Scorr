"use client";

import Link from "next/link";
import { ArrowRight, Brain, Zap, Trophy, Download } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center">
              <span className="text-white text-xl font-black">S</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Scorr</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login" className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">Now available on Web & Mobile</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-8 leading-tight">
            Master any subject with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">AI-powered quizzes</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Generate flashcards and quizzes instantly from any topic or document. Challenge friends in real-time battles and study smarter, not harder.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white text-lg font-semibold rounded-2xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center gap-2">
              Start Learning for Free
              <ArrowRight size={20} />
            </Link>
            
            <a href="#" className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-700 hover:border-slate-600 text-white text-lg font-semibold rounded-2xl transition-all flex items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
              </svg>
              Get the Android App
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
              <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Brain size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">AI Generation</h3>
              <p className="text-slate-400 leading-relaxed">
                Upload your lecture notes, PDFs, or just type a topic. Our AI generates comprehensive quizzes and flashcards in seconds.
              </p>
            </div>

            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
              <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mb-6">
                <Trophy size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Multiplayer Battles</h3>
              <p className="text-slate-400 leading-relaxed">
                Challenge your classmates to real-time multiplayer battles. Prove who knows the material best and climb the leaderboards.
              </p>
            </div>

            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <Zap size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Seamless Sync</h3>
              <p className="text-slate-400 leading-relaxed">
                Start studying on your laptop and finish on your phone. Your progress, history, and library sync instantly across all devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-800 text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
              <span className="text-white font-black">S</span>
            </div>
            <span className="font-bold text-white">Scorr App</span>
          </div>
          
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
          
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} Scorr. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
