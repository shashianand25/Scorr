"use client";

import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { PlusCircle, Clock, Award, Flame } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.displayName?.split(" ")[0] || "Quizzer"}! 👋
        </h1>
        <p className="text-slate-400">Ready to conquer your next challenge?</p>
      </header>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/create" className="group block p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl hover:bg-indigo-500/20 transition-all cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <PlusCircle size={100} className="text-indigo-500 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <PlusCircle size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-indigo-400 mb-2">Create New Course</h3>
            <p className="text-slate-400 text-sm max-w-[80%]">Generate a new quiz or flashcard deck instantly using AI from any topic or document.</p>
          </div>
        </Link>

        <Link href="/arena" className="group block p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl hover:bg-rose-500/20 transition-all cursor-pointer relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Flame size={100} className="text-rose-500 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/30">
              <Flame size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-rose-400 mb-2">Battle Arena</h3>
            <p className="text-slate-400 text-sm max-w-[80%]">Challenge your friends to a real-time multiplayer quiz battle and prove your knowledge.</p>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-slate-400" />
            Recent Activity
          </h2>
          <Link href="/library" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
            View Library &rarr;
          </Link>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-sm">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={28} className="text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No recent activity</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            You haven't taken any quizzes yet. Generate your first course to get started!
          </p>
          <Link href="/create" className="inline-block mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl transition-colors border border-slate-700">
            Create Course
          </Link>
        </div>
      </div>
    </div>
  );
}
