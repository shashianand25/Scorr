import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail, Bot, Database } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Scorr",
  description: "Learn how Scorr collects, uses, and protects your personal data, study materials, and AI-generated quizzes.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#090A0F] text-gray-200 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
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

        {/* Header Container */}
        <div className="bg-gradient-to-b from-[#141828] to-[#0D101C] p-8 md:p-12 rounded-3xl border border-white/[0.08] shadow-2xl mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-indigo-400/80 font-medium">Scorr: AI Quiz & Flashcards</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            <strong>Effective Date:</strong> August 18, 2026 &bull; <strong>App Package:</strong>{" "}
            <code className="text-xs bg-white/[0.06] px-2 py-0.5 rounded text-gray-300">com.radium230sorganization.quizforge</code>
          </p>
          <p className="mt-4 text-gray-300 text-sm leading-relaxed">
            Welcome to Scorr (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We are committed to protecting your personal
            privacy and ensuring full transparency regarding how your data, notes, and study content are handled. This Privacy
            Policy describes our practices when you use our mobile application and web services at{" "}
            <a href="https://scorrapp.com" className="text-indigo-400 hover:underline">
              https://scorrapp.com
            </a>
            .
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 bg-[#0D101C] p-8 md:p-12 rounded-3xl border border-white/[0.08] shadow-xl text-gray-300 leading-relaxed text-sm md:text-base">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">1.</span> Information We Collect
            </h2>
            <p>We collect only the necessary information required to operate, synchronize, and improve your study experience:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-gray-300">
              <li>
                <strong className="text-white">Account Information:</strong> When you sign in via Google Authentication or Email, we
                receive your name, email address, and profile avatar solely to create, authenticate, and secure your account.
              </li>
              <li>
                <strong className="text-white">Study Content &amp; Uploaded Materials:</strong> Text notes, documents (PDF, DOCX, PPTX),
                and images you upload to generate quizzes and flashcards.
              </li>
              <li>
                <strong className="text-white">Learning Activity &amp; Analytics:</strong> Your quiz attempt scores, time taken, question
                accuracy, mistake summaries, flashcard ratings (SuperMemo-2 intervals), and daily study streaks.
              </li>
              <li>
                <strong className="text-white">Device &amp; Technical Diagnostics:</strong> Anonymous diagnostic telemetry, app version,
                device model, operating system version, and crash logs to resolve stability issues.
              </li>
            </ul>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <span className="text-indigo-400">2.</span> AI Processing &amp; User Content Privacy
            </h2>
            <p>
              Scorr utilizes Google Gemini artificial intelligence APIs to generate quizzes, flashcard decks, and explanations from your
              uploaded study materials.
            </p>
            <div className="bg-indigo-950/30 border border-indigo-500/20 p-4 rounded-xl text-sm text-indigo-200">
              <strong className="text-white block mb-1">Our AI Privacy Commitment:</strong>
              Your uploaded notes, PDFs, and study documents are processed ephemerally solely to extract questions and educational cards.
              We <strong>do NOT</strong> sell, share, or use your uploaded study content to train public foundational AI models.
            </div>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              <span className="text-indigo-400">3.</span> How We Use Your Information
            </h2>
            <p>Your information is used strictly to:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-300">
              <li>Generate customized practice quizzes and spaced-repetition flashcards.</li>
              <li>Synchronize your study sets, streaks, and progress across mobile and web in real time.</li>
              <li>Power real-time 1v1 Battle Arena matchmaking and live scoreboards.</li>
              <li>Display detailed score progression analytics and identify knowledge gaps.</li>
              <li>Send critical version updates, security alerts, and system notices.</li>
            </ul>
            <p className="text-xs text-gray-400 mt-2">
              We never sell, rent, or monetize your personal data or study history to advertisers or data brokers.
            </p>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">4.</span> Third-Party Service Providers
            </h2>
            <p>We work with trusted, industry-leading infrastructure providers to deliver our service:</p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-gray-300">
              <li>
                <strong className="text-white">Google Firebase Authentication:</strong> Manages secure OAuth2 and email authentication.
              </li>
              <li>
                <strong className="text-white">Google Gemini AI:</strong> Processes text and documents for automated question generation.
              </li>
              <li>
                <strong className="text-white">Neon PostgreSQL:</strong> Encrypted cloud database for persistent user data storage.
              </li>
              <li>
                <strong className="text-white">Vercel:</strong> Secure web hosting, content delivery, and serverless compute.
              </li>
            </ul>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              <span className="text-indigo-400">5.</span> Data Security &amp; Encryption
            </h2>
            <p>
              We implement industry-standard security protocols. All communication between your device, our servers, and third-party APIs
              is protected using <strong>TLS/HTTPS 256-bit encryption</strong>. User authentication tokens are securely encrypted, and
              passwords are never stored in raw text on our servers.
            </p>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-indigo-400" />
              <span className="text-indigo-400">6.</span> Data Retention &amp; Account Deletion
            </h2>
            <p>
              We retain your data only for as long as your account remains active. You have full ownership and right to delete your data at
              any time:
            </p>
            <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl space-y-3">
              <p>
                <strong className="text-white">In-App Deletion:</strong> Go to <em>Profile / Settings &rarr; Danger Zone &rarr; Delete
                Account</em>.
              </p>
              <p>
                <strong className="text-white">Web Deletion Request:</strong> Visit our dedicated{" "}
                <Link href="/delete-account" className="text-indigo-400 underline hover:text-indigo-300 font-medium">
                  Account Deletion Page
                </Link>{" "}
                or email us directly.
              </p>
              <p className="text-xs text-gray-400">
                Upon confirmation, your profile, authentication records, quizzes, flashcards, and attempt history are permanently purged
                from our active databases immediately.
              </p>
            </div>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400">7.</span> Children&rsquo;s Privacy (COPPA &amp; GDPR Compliance)
            </h2>
            <p>
              Scorr is designed for students, educators, and general audiences. We do not knowingly collect personal identifiable
              information from children under 13 (or under 16 in the European Economic Area / UK). If we discover that a child has provided
              us with personal data without parental consent, we take immediate steps to delete such information from our servers.
            </p>
          </section>

          <hr className="border-white/[0.06]" />

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-400" />
              <span className="text-indigo-400">8.</span> Contact Us
            </h2>
            <p>
              If you have any questions, concerns, or privacy inquiries regarding this policy or our data practices, please contact us at:
            </p>
            <div className="bg-white/[0.03] border border-white/[0.08] p-5 rounded-2xl text-sm">
              <p className="text-white font-semibold">Scorr Developer Support</p>
              <p className="text-gray-400">Developer: Shashi Anand</p>
              <p className="text-gray-400">
                Email:{" "}
                <a href="mailto:shashianand2005@gmail.com" className="text-indigo-400 hover:underline">
                  shashianand2005@gmail.com
                </a>
              </p>
              <p className="text-gray-400">
                Website:{" "}
                <a href="https://scorrapp.com" className="text-indigo-400 hover:underline">
                  https://scorrapp.com
                </a>
              </p>
            </div>
          </section>

        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Scorr. All rights reserved. &bull;{" "}
          <Link href="/delete-account" className="hover:underline text-gray-400">
            Account Deletion
          </Link>
        </div>
      </div>
    </div>
  );
}
