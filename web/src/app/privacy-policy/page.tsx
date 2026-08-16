export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-4 text-indigo-600">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: August 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed">
              When you sign in with Google or Email, we collect your name, email address, and profile photo solely to create and authenticate your Scorr account. If you use the app without signing in, we collect no personal data whatsoever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Quiz & Flashcard Data</h2>
            <p className="text-gray-700 leading-relaxed">
              Your quizzes, flashcard decks, attempt history, correct/wrong answers, and study streaks are stored in our secure database and linked to your account. This enables your progress to sync seamlessly across your devices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. AI Processing (Google Gemini)</h2>
            <p className="text-gray-700 leading-relaxed">
              When you use AI Quiz Generation from text, PDFs, or PPTs, the content is securely processed via Google Gemini APIs exclusively to extract questions and flashcards. We do not sell or use your uploaded study materials to train public AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Multiplayer Battles & Sharing</h2>
            <p className="text-gray-700 leading-relaxed">
              When you participate in multiplayer Battle Mode or share a quiz, your public display name and in-game match scores are visible in real-time to other participants in that battle room or to anyone with your shared quiz link.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How We Use Your Data</h2>
            <p className="text-gray-700 leading-relaxed">
              Your data is used exclusively to power the Scorr experience — syncing your progress, displaying your stats, and personalizing your study sessions. We do not sell, rent, or share your data with advertisers or any third parties, ever.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              All data in transit is protected by HTTPS/TLS encryption. Authentication is managed securely via Firebase Authentication. We never store or have access to raw user passwords.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Deletion</h2>
            <p className="text-gray-700 leading-relaxed">
              You can permanently delete your account and all associated data at any time from within the mobile app (Profile &rarr; Delete account) or by visiting our <a href="/delete-account" className="text-indigo-600 hover:underline">Data Deletion page</a>. Deletion immediately removes your profile, quizzes, flashcards, and history from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about this policy or requests for data deletion? Reach us at <a href="mailto:shashianand2005@gmail.com" className="text-indigo-600 hover:underline">shashianand2005@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
