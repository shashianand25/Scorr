# Scorr — Pre-Launch Checklist

> Work through this top to bottom. Don't launch until every 🔴 is checked off.

---

## 🔴 Backend & Config (Do First)

- [ ] Hit `/api/app-config` in production — verify it returns `featureFlags`, `aiConfig`, `fileLimits`, `appLinks`
- [ ] Hit `/api/version-config` — verify it returns `minimumVersion`, `latestVersion`, `updatePromptScheduleDays`
- [ ] Confirm no `console.error` logs appear in Vercel → Functions → Logs on a clean load
- [ ] Verify `MAINTENANCE_MODE`, `DISABLE_AI`, `DISABLE_BATTLES` are all `false` in Vercel
- [ ] Test the maintenance flag: set `MAINTENANCE_MODE=true`, open the app, confirm the maintenance screen appears, set it back to `false`
- [ ] Test the AI kill-switch: set `DISABLE_AI=true`, try generating a quiz, confirm the alert appears, set it back
- [ ] Confirm the backend enforces rate limits / request size (try sending a 15 MB body — should get a 413)
- [ ] Verify DB connection pool doesn't time out under idle (send a request after 5 min of no traffic)

---

## 🔴 Full User Flow (New Account)

Do this on a **real device**, not the simulator.

- [ ] Sign up with a brand-new email — no errors, reaches home screen
- [ ] Create a quiz manually (type questions)
- [ ] Import a quiz from a PDF file
- [ ] Import a quiz from a PPT file
- [ ] Generate a quiz using AI from a PDF
- [ ] Solve the quiz — answers register correctly
- [ ] View the results / report card
- [ ] Check quiz history — attempt appears
- [ ] Open Insights — stats are correct
- [ ] Create a flashcard deck and study it
- [ ] Share a quiz — link opens correctly on another device
- [ ] Import a shared quiz from a deep link
- [ ] Create a Battle room, join from a second device, complete a match
- [ ] Log out
- [ ] Log back in — all data is still there
- [ ] **Uninstall** the app, reinstall, log in — data is still there (confirmed server-side persistence)

---

## 🔴 Error & Edge Cases

- [ ] Turn on **airplane mode** mid-quiz — app doesn't crash, shows a useful error
- [ ] Turn on airplane mode before opening — app loads gracefully (cached data shows, no white screen)
- [ ] Upload a file that is too large — error message is clear, not a raw JSON dump
- [ ] Upload a corrupt or empty PDF — error message is clear
- [ ] Let the AI generation time out (60 s) — user sees a useful message, not a spinner forever
- [ ] Kill the backend mid-generation — app shows an error and recovers
- [ ] Join a Battle with an invalid room code — error message is clear
- [ ] Create a Battle, second player never joins — host can exit cleanly
- [ ] Sign up with an already-used email — error message is clear
- [ ] Sign in with wrong password — error message is clear (not "something went wrong")

---

## 🔴 Auth & Data Safety

- [ ] Password reset flow works end to end
- [ ] Session persists after force-closing and reopening the app
- [ ] A logged-out user cannot access any authenticated API routes
- [ ] Confirm quiz data is scoped per user — user A cannot see user B's quizzes

---

## 🟠 Performance

- [ ] App cold-start time on a mid-range Android device is under 3 seconds
- [ ] Scrolling the home feed with 20+ quizzes is smooth (no jank)
- [ ] AI generation completes within 60 s on a normal connection for a 5-page PDF
- [ ] App bundle size is acceptable (run `expo export` and check the output)
- [ ] No memory leak after navigating between all tabs 10+ times (watch Xcode/Android Studio profiler)
- [ ] Battery usage is normal — no background loops running when idle

---

## 🟠 Network Conditions

- [ ] Test on a **slow 3G** connection (use Network Link Conditioner on iOS / Developer options on Android)
  - [ ] Loading states appear, not blank screens
  - [ ] Errors are shown if requests fail, not infinite spinners
- [ ] Test with **intermittent network** (toggle airplane mode every few seconds)
  - [ ] No crashes
  - [ ] Retry is possible without restarting the app

---

## 🟠 Analytics & Crash Reporting

- [ ] Crash reporting tool is integrated (Sentry / Firebase Crashlytics) and receiving events
- [ ] Send a test crash — confirm it appears in the dashboard within 60 s
- [ ] Key events are tracked: quiz created, quiz completed, AI generation started, AI generation succeeded/failed, battle started, battle completed
- [ ] Confirm analytics are **not** tracking PII (no email addresses, no raw quiz content)

---

## 🟠 Play Store / App Store Readiness

- [ ] App icon is set (all required sizes)
- [ ] Splash screen is set
- [ ] App name and bundle ID are correct in `app.json` / `app.config.js`
- [ ] `APP_MINIMUM_VERSION` and `APP_LATEST_VERSION` match the version in `app.json`
- [ ] Screenshots are prepared for the store listing (at least 3)
- [ ] Short and long store descriptions are written
- [ ] Content rating questionnaire filled out
- [ ] In-app purchases declared if any (or confirmed none)
- [ ] Deep link / App Link (scorrapp.com) is verified in Play Console / App Store Connect

---

## 🟠 Legal & Support

- [ ] Privacy policy is written and hosted at a public URL
- [ ] Privacy policy URL is added to the Play Store / App Store listing
- [ ] Support email address is set up and monitored
- [ ] Support email is visible somewhere in the app (Settings / Profile screen)
- [ ] Terms of service exist (even a simple one)

---

## 🟡 Security

- [ ] API keys are **not** committed to Git — check git history before release
- [ ] Firebase rules prevent users from reading/writing other users' data
- [ ] Confirm Neon/Postgres is not publicly accessible without auth
- [ ] All backend routes that mutate data require a valid Firebase auth token
- [ ] No sensitive data (tokens, keys) is logged to the console in production builds

---

## 🟡 Accessibility

- [ ] Text is readable at system large font size
- [ ] Buttons have enough tap target size (minimum 44×44 pt)
- [ ] Colour contrast is sufficient on light mode

---

## 🟡 Final Smoke Test (Day of Launch)

- [ ] Build and submit the production binary (not Expo Go)
- [ ] Install the production build from TestFlight / Internal Testing track
- [ ] Run through the core flow one more time on the production build:
  - Sign up → generate quiz with AI → solve it → view history
- [ ] Confirm `/api/app-config` and `/api/version-config` return correct data in production
- [ ] Keep Vercel logs open for the first hour after launch

---

## 🚨 Know Your Emergency Switches

Before you press publish, make sure you can answer these in under 2 minutes:

| Situation | Your response |
|---|---|
| Backend is down | Set `MAINTENANCE_MODE=true` in Vercel → redeploy |
| AI is returning garbage | Set `DISABLE_AI=true` in Vercel → redeploy |
| Battles are broken | Set `DISABLE_BATTLES=true` in Vercel → redeploy |
| Critical bug, need to block old version | Raise `APP_MINIMUM_VERSION` in Vercel → redeploy |
| Need to roll back backend | Revert commit → push → Vercel auto-deploys |