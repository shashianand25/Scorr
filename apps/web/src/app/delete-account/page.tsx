import Link from "next/link";
import { ArrowLeft, Trash2, ShieldAlert, Mail } from "lucide-react";

export const metadata = {
  title: "Delete Account | Scorr",
  description: "Request deletion of your Scorr account and all associated personal and study data.",
};

export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-[#090A0F] text-gray-200 font-sans selection:bg-red-500/30 selection:text-red-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Top Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#0D101C] p-8 md:p-12 rounded-3xl border border-red-500/20 shadow-2xl space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Account Deletion</h1>
              <p className="text-sm text-red-400/80 font-medium">Scorr: AI Quiz &amp; Flashcards</p>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed text-sm md:text-base">
            We believe you should have complete control over your data. If you no longer wish to use Scorr, you can permanently delete your account and all associated data at any time.
          </p>

          <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              Method 1: Instant In-App Deletion
            </h2>
            <ol className="list-decimal list-inside text-gray-300 text-sm space-y-1.5 pl-1">
              <li>Open the Scorr app and ensure you are logged in.</li>
              <li>Tap your <strong>Profile / Settings</strong> tab (bottom right).</li>
              <li>Scroll down to the <strong>Danger Zone</strong> section.</li>
              <li>Tap <strong className="text-red-300">Delete Account</strong>.</li>
              <li>Confirm your deletion. Your profile, quizzes, and history will be deleted immediately.</li>
            </ol>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] p-6 rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              Method 2: Request Deletion via Email
            </h2>
            <p className="text-gray-400 text-sm">
              If you uninstalled the app or cannot sign in, email our support team with the email address registered with your Scorr account:
            </p>
            <a
              href="mailto:shashianand2005@gmail.com?subject=Scorr%20Account%20Deletion%20Request"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-500/20"
            >
              <Mail className="w-4 h-4" />
              Email Deletion Request
            </a>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs text-gray-400">
            <strong>Important:</strong> Deletion is irreversible. Once your account is deleted, your quizzes, flashcard progress, attempt statistics, and study streaks cannot be recovered under any circumstances.
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <Link href="/privacy-policy" className="hover:underline text-gray-400">
            View Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
