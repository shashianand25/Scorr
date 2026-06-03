export default function DeleteAccount() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8 md:p-16">
      <div className="max-w-2xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-red-100">
        <h1 className="text-3xl font-bold mb-4 text-red-600">Account Deletion</h1>
        <p className="text-gray-700 leading-relaxed mb-8">
          We believe you should have complete control over your data. If you no longer wish to use Recall, you can permanently delete your account and all associated data.
        </p>
        
        <div className="space-y-6">
          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <h2 className="text-lg font-bold text-red-800 mb-2">How to delete your account (In-App)</h2>
            <ol className="list-decimal list-inside text-red-900 space-y-2">
              <li>Open the Recall app and ensure you are signed in.</li>
              <li>Tap the Menu icon (bottom right).</li>
              <li>Scroll down to the Danger Zone section.</li>
              <li>Tap <strong>Delete account</strong>.</li>
              <li>Confirm your decision. This will immediately erase your profile, quizzes, and history.</li>
            </ol>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Request deletion via email</h2>
            <p className="text-gray-700 mb-4">
              If you have uninstalled the app or cannot sign in, you can request account deletion by emailing us from the address associated with your account.
            </p>
            <a 
              href="mailto:shashianand2005@gmail.com?subject=Account Deletion Request" 
              className="inline-block bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Email Deletion Request
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-6">
            <strong>Note:</strong> Deletion is irreversible. Once your data is deleted, it cannot be recovered under any circumstances.
          </p>
        </div>
      </div>
    </div>
  );
}
