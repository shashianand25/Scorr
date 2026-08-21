export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-3xl font-bold mb-4 text-emerald-600">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: August 2026</p>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By downloading, accessing, or using the Scorr web or mobile applications, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, please discontinue using the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use of the App</h2>
            <p className="text-gray-700 leading-relaxed">
              Scorr is an active recall study platform designed for creating quizzes, studying flashcards, and engaging in multiplayer learning battles. You agree to use Scorr only for lawful personal educational purposes and not to distribute harmful, abusive, or infringing content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. AI-Generated Content</h2>
            <p className="text-gray-700 leading-relaxed">
              Scorr integrates Google AI technologies to convert study material into questions and flashcards. While we strive for educational precision, AI outputs may occasionally contain inaccuracies. Users are encouraged to verify important facts with official academic sources. You agree not to upload content that violates third-party copyrights or laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. User Content & Ownership</h2>
            <p className="text-gray-700 leading-relaxed">
              You retain full ownership of all notes, quizzes, and flashcards you create or upload. You grant Scorr a limited license solely to store, process, and display your content to provide the service back to you and your authorized share recipients.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Multiplayer Battles & Fair Play</h2>
            <p className="text-gray-700 leading-relaxed">
              When participating in multiplayer Battle Mode, you agree to play fairly, avoid offensive display names, and respect fellow learners. We reserve the right to restrict access to multiplayer features for users who abuse or disrupt the community.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cloud Sync & Availability</h2>
            <p className="text-gray-700 leading-relaxed">
              When signed in, your study materials and history sync to our cloud servers on a best-effort basis. While we maintain high availability, Scorr is provided "as is" and we cannot guarantee 100% uninterrupted service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Prohibited Activities</h2>
            <p className="text-gray-700 leading-relaxed">
              You agree not to: reverse-engineer or attempt to decompile the app, abuse or spam API endpoints, exploit automated scrapers, or attempt unauthorized access to our servers or other users' data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              Have questions about these terms? Contact our team at <a href="mailto:shashianand2005@gmail.com" className="text-emerald-600 hover:underline">shashianand2005@gmail.com</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
