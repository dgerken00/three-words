# Publishing guide — three·words

Everything needed to get three·words onto the **App Store** and **Google Play**,
in order. Builds are produced in the cloud by **EAS** (Expo Application Services),
so you don't need Xcode or a Mac build machine for the iOS binary.

Legend: 🧑 = you must do it (account/payment/decision) · 💻 = a command to run.

---

## 0. What it costs
- **Apple Developer Program** — $99/year. Required to ship to the App Store.
- **Google Play Developer** — $25, one-time. Required to ship to Play.
- **EAS Build** — free tier is enough to start; paid tiers only speed up the queue.

---

## 1. Accounts to create first 🧑
1. **Expo account** — sign up free at https://expo.dev/signup (this is what EAS uses).
2. **Apple Developer Program** — https://developer.apple.com/programs/enroll/
   - Enroll as an **Individual** (simplest) or Organization (needs a D-U-N-S number).
   - Enrollment can take 24–48h for Apple to verify. Start this early.
   - After approval, note your **Team ID** (Membership page).
3. **Google Play Console** — https://play.google.com/console/signup
   - Pay the $25 fee. Individual accounts now require identity verification, which
     can take a few days — also start early.

---

## 2. Supabase pre-flight 🧑💻
1. In your Supabase project → **SQL Editor** → paste and run `supabase-schema.sql`.
   (It drops the old test tables and creates the authenticated schema.)
2. **Authentication → Providers → Email**: keep **email + password** enabled.
3. **Authentication → Email** settings — decide on **"Confirm email"**:
   - ON (recommended for production): users must click a confirmation link. You'll
     want to configure a custom SMTP sender so mail actually arrives reliably.
   - OFF (simpler for early family testing): sign-up logs the user straight in.
   The app already handles both cases.
4. Confirm your project URL + anon key in `lib/supabase.js` are the production ones.

---

## 3. One-time EAS project setup 💻
```bash
cd ~/Projects/three-words
npm install -g eas-cli        # or use: npx eas-cli@latest <command>
eas login                     # sign in with your Expo account
eas init                      # links this repo to an EAS project; fills app.json projectId
```
`eas init` writes the real `projectId` into `app.json` (the empty `extra.eas.projectId`).

---

## 4. Fill in the blanks before building 🧑
- [ ] **Bundle IDs** — currently `com.davidgerken.threewords` in `app.json`
      (iOS `bundleIdentifier` + Android `package`). These are **permanent** once
      published. Change now if you want a different reverse-domain id.
- [ ] **Privacy policy live** — deploy `docs/index.html` to any free static host
      (GitHub Pages, Cloudflare Pages, or Netlify Drop), then set `PRIVACY_URL` in
      `App.js` to that live address. Both stores require a reachable URL. The
      current value is a placeholder.
- [ ] **Support email** — `SUPPORT_EMAIL` in `App.js` is `admin@threewordsapp.com`.
      Make sure that inbox exists and is monitored (needed for the UGC review).
- [ ] **eas.json submit block** — replace the `REPLACE_WITH_*` Apple values and add
      your Google Play service-account JSON (see step 7).

---

## 5. Build the apps 💻
EAS builds in the cloud and provisions signing credentials for you (it'll offer to
generate an Apple distribution cert / Android keystore — say yes and let EAS manage
them).

```bash
# A shareable internal build first (great for a final family test on real installs)
eas build --platform android --profile preview      # produces an installable .apk
eas build --platform ios --profile preview           # needs the Apple account; installs via TestFlight/ad-hoc

# Production store builds
eas build --platform android --profile production     # .aab for Play
eas build --platform ios --profile production         # .ipa for the App Store
```

---

## 6. Create the store listings 🧑
Use the copy in `STORE_LISTING.md`.

**App Store Connect** (https://appstoreconnect.apple.com):
- Create a new app; pick the bundle id, name "three words".
- Note the **App ID (ascAppId)** it assigns → put it in `eas.json`.
- Fill: description, keywords, support + privacy URLs, screenshots, **age rating
  (answer YES to user-generated content)**, and the App Privacy "data collected"
  form (email, name, user content — all "not used for tracking").

**Google Play Console** (https://play.google.com/console):
- Create the app; complete the **Data safety** form (email, name, user content),
  content rating questionnaire (declare UGC), target audience, and store listing.

---

## 7. Submit the builds 💻
```bash
# Android: create a Play service account, download its JSON key, save it as
# ./play-service-account.json (already gitignored), then:
eas submit --platform android --profile production

# iOS:
eas submit --platform ios --profile production
```
First Android submission usually has to be uploaded manually to the **Internal
testing** track once, after which `eas submit` works for later builds.

---

## 8. App Store user-generated-content checklist (Guideline 1.2) ⚠️
Apps with UGC get extra scrutiny. three·words already implements all four required
controls — make sure you can point the reviewer to each:
- [x] **Filter objectionable content** — automatic profanity filter at submission (`App.js`).
- [x] **Report mechanism** — the ⋯ menu on any received words → Report.
- [x] **Block abusive users** — the ⋯ menu → Block sender.
- [x] **Published contact** — admin@threewordsapp.com, shown in Account and this policy.
- [x] **Account deletion** — Account → Delete my account (Apple requires this).
- [ ] **Provide a test account** in App Review notes (email + password) so the
      reviewer can sign in. Paste the "notes for reviewer" text from `STORE_LISTING.md`.

---

## 9. Review timelines
- **Apple**: typically 24–48h per review. UGC/rejections add round-trips — the
  checklist above heads off the most common ones.
- **Google**: first review can take several days for a new account; later updates
  are faster.

## 10. Shipping updates later
- JS-only changes: `eas update` (over-the-air, no re-review) once you add
  `expo-updates`.
- Native/config changes or new store metadata: bump `version` (and let
  `autoIncrement` handle build numbers), rebuild, resubmit.
