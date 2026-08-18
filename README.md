<div align="center">
  <img src="scorr_store_icon.png" width="150" alt="Scorr Logo" />
  <h1>Scorr - AI MCQ & Flashcard Generator</h1>
  <p>
    <strong>Supercharge your study sessions with AI-generated quizzes, flashcards, and a dual-study strategy.</strong>
  </p>
  <p>
    <a href="https://scorrapp.com"><img src="https://img.shields.io/badge/Website-scorrapp.com-blue?style=for-the-badge&logo=vercel" alt="Website" /></a>
    <a href="#"><img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" /></a>
    <a href="#"><img src="https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" /></a>
    <a href="#"><img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node" /></a>
  </p>
</div>

<br />

<div align="center">
  <img src="scorr_feature_graphic.png" alt="Scorr Feature Graphic" width="100%" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</div>

## ✨ Features

* **🧠 AI-Powered Generation:** Instantly convert PDFs, PPTXs, DOCX, and text into interactive multiple-choice questions (MCQs) and flashcards using Google Gemini AI.
* **📚 Dual-Study Strategy:** Learn concepts efficiently through spaced repetition flashcards and test your knowledge with mock quizzes.
* **⚡ Offline Support:** Study anytime, anywhere. Scorr gracefully handles offline capabilities and syncs when you're back online.
* **📊 In-Depth Insights:** Track your progress, review wrong answers, and visualize your learning curve over time.
* **🎨 Premium UI/UX:** A stunning, responsive, and native-feeling interface built with React Native and Expo.
* **📱 Cross-Platform:** Available and optimized for both iOS and Android devices.

## 🛠️ Tech Stack

### Mobile Frontend
- **Framework:** React Native & Expo (SDK 51)
- **Routing:** Expo Router (File-based routing)
- **Styling:** Native StyleSheet with custom theme tokens
- **Auth:** Firebase Authentication & Google Sign-In

### Backend Service
- **Environment:** Node.js with Express
- **Database:** PostgreSQL (hosted on Neon)
- **AI Integration:** Google Gemini API
- **File Parsing:** `officeparser`, `pdf-parse`, `mammoth` (for parsing docs/presentations)

## 🚀 Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo CLI
- A Firebase project
- A Neon PostgreSQL database
- Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shashianand25/Scorr.git
   cd Scorr
   ```

2. **Setup the Backend:**
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory:
   ```env
   PORT=3000
   DATABASE_URL=your_neon_postgres_url
   GEMINI_API_KEY=your_gemini_key
   ```
   Run the backend:
   ```bash
   npm run dev
   ```

3. **Setup the Mobile App:**
   ```bash
   cd ../mobile
   npm install
   ```
   Create a `.env` file in the `mobile` directory (or use Expo's `app.json` config):
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000
   ```
   Start the Expo development server:
   ```bash
   npx expo start
   ```

## 📂 Project Structure

```
Scorr/
├── backend/                # Express server handling file parsing & AI
│   ├── api/                # API endpoints
│   └── package.json        # Backend dependencies
├── mobile/                 # React Native (Expo) mobile app
│   ├── src/
│   │   ├── app/            # Expo Router screens (Home, Flashcards, Profile)
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # Utilities, API integrations, Auth
│   │   └── constants/      # Theme, colors, typography
│   ├── assets/             # Images, fonts, icons
│   └── app.json            # Expo configuration
├── web/                    # Landing page
```

## 🤝 Contributing

Contributions are always welcome! Feel free to open an issue or submit a pull request if you have ideas for improvements, new features, or bug fixes.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Copyright © 2026 Shashi Anand. All rights reserved. Proprietary software — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ by Shashi Anand</sub>
</div>
