export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-4 text-emerald-600">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2025</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By downloading or using the Recall app, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use of the App</h2>
            <p className="text-gray-700 leading-relaxed">
              Recall is a personal study tool for creating quizzes, studying flashcards, and tracking learning progress. You may not use Recall for any unlawful purpose or to distribute harmful content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Your Content</h2>
            <p className="text-gray-700 leading-relaxed">
              You own all quiz content, notes, and flashcards you create in Recall. By using the app, you grant us a limited licence to store and process your content solely to provide the Recall service back to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Disclaimer of Warranties</h2>
            <p className="text-gray-700 leading-relaxed">
              Recall is provided "as is" without warranties of any kind. We do not guarantee that the app will be error-free or that AI-generated quiz content will always be accurate.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Contact</h2>
            <p className="text-gray-700 leading-relaxed">
              Questions about these terms? Reach us at <a href="mailto:shashianand2005@gmail.com" className="text-emerald-600 hover:underline">shashianand2005@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
