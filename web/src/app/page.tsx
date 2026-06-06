import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 font-sans">
      <main className="max-w-2xl w-full bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Scorr</h1>
        <p className="text-lg text-gray-600 mb-12">
          Your AI-powered flashcards and quizzes, built for seamless studying and progress tracking.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <Link href="/privacy-policy" className="flex flex-col items-center justify-center p-6 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-colors border border-indigo-100/50 group">
            <h2 className="text-lg font-semibold text-indigo-700 group-hover:text-indigo-800">Privacy Policy</h2>
          </Link>
          
          <Link href="/terms-of-service" className="flex flex-col items-center justify-center p-6 bg-emerald-50 rounded-2xl hover:bg-emerald-100 transition-colors border border-emerald-100/50 group">
            <h2 className="text-lg font-semibold text-emerald-700 group-hover:text-emerald-800">Terms of Service</h2>
          </Link>

          <Link href="/delete-account" className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors border border-red-100/50 group">
            <h2 className="text-lg font-semibold text-red-700 group-hover:text-red-800">Account Deletion</h2>
          </Link>
        </div>
      </main>

      <footer className="mt-12 text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Scorr App. All rights reserved.
      </footer>
    </div>
  );
}
