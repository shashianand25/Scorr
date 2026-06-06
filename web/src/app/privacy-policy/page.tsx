export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-4 text-indigo-600">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2025</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed">
              When you sign in with Google or Email, we collect your name, email address, and profile photo solely to create your Scorr account. If you use the app without signing in, we collect no personal data whatsoever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Quiz & Flashcard Data</h2>
            <p className="text-gray-700 leading-relaxed">
              Your quizzes, flashcard decks, attempt history, correct/wrong answers, and study streaks are stored in our secure database and linked to your account. This enables your progress to sync seamlessly across devices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is used exclusively to power the Scorr experience — syncing your progress, displaying your stats, and personalising your study sessions. We do not sell, rent, or share your data with advertisers or any third parties, ever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Deletion</h2>
            <p className="text-gray-700 leading-relaxed">
              You can permanently delete your account and all associated data at any time from within the app (Settings &rarr; Delete Account) or by visiting our <a href="/delete-account" className="text-indigo-600 hover:underline">Data Deletion page</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about this policy? Reach us at <a href="mailto:shashianand2005@gmail.com" className="text-indigo-600 hover:underline">shashianand2005@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
