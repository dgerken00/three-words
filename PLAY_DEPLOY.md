# Google Play deployment — three·words

The path from approved developer account to public Play listing. The hard gate:
**new personal accounts must run a closed test with 12+ testers opted in for 14
continuous days** before Google grants production access. This guide gets that
clock started as fast as possible.

Assets ready in this repo:
- App icon 512×512 → `store-assets/play-icon-512.png`
- Feature graphic 1024×500 → `store-assets/play-feature-1024x500.png`
- Listing copy → `STORE_LISTING.md` (short + full description)
- Privacy policy URL → https://threewordsapp.com/privacy/
- Production `.aab` → built by EAS (`eas build -p android --profile production`)

## 1. Create the app (Play Console)
[play.google.com/console](https://play.google.com/console) → **Create app**
- Name: `three words` · Default language: English (US)
- App or game: **App** · Free or paid: **Free**
- Accept the declarations.

## 2. Finish the "Set up your app" checklist (Dashboard)
Work down the Dashboard checklist — every item must be done before any release:
- **Privacy policy** → `https://threewordsapp.com/privacy/`
- **App access** → "All functionality is available without special access" is
  WRONG for us (login required). Choose **"All or some functionality is
  restricted"** and add credentials: `dgerken+appreview@gmail.com` / `ReviewMe2026!`
  with a note that any user can self-register.
- **Ads** → No ads.
- **Content rating** → fill the questionnaire; declare **user-generated content**
  with moderation (filter, report, block). Expect a Teen/Mature-adjacent rating.
- **Target audience** → 13+ (do NOT include children).
- **News app** → No.
- **Data safety** → declare: Email address, Name, Other user-generated content —
  all collected, not shared, encrypted in transit, deletable (in-app account
  deletion). Purpose: App functionality. No ads/tracking.
- **Government app** → No.
- **Store listing** → paste from `STORE_LISTING.md`; upload
  `play-icon-512.png`, `play-feature-1024x500.png`, and at least 2 phone
  screenshots (capture from the installed APK on any Android phone; 1080×1920+).

## 3. Create the closed test + start the 14-day clock
**Testing → Closed testing → Create track** (name it e.g. "Family & friends"):
1. **Testers tab** → create an email list; paste your 12+ testers' Google-account
   emails (your brother + sister-in-law + the testers you recruit). You can add
   more emails later without resetting anything.
2. **Releases tab** → **Create release** → upload the production **.aab**
   (download it from the EAS build page). Let Play App Signing manage the key
   (default — say yes).
3. Release notes: "First test release." → **Review & roll out**.
4. First closed-testing release goes through a Google review (hours–days for a
   new account).
5. Once live, the Testers tab shows an **opt-in link** — send it to all testers.
   They tap it, accept, and install from Play like a normal app.

⏱️ **The 14-day clock counts continuous days with 12+ opted-in testers.** Get
everyone opted in the same day if you can; dropping below 12 pauses progress.
Testers just need it installed — Google doesn't require daily usage, but real
usage strengthens the production application.

## 4. After 14 days: apply for production
Dashboard → **Apply for production access**. Google asks short questions about
your testing (what you tested, feedback, who your users are). Answer honestly —
your family test gives real answers. Approval typically takes a few days, then
**Production → Create release** with the same .aab flow, and three·words is
publicly on Google Play.

## 5. Optional: wire up `eas submit` for later releases
First upload must be manual (step 3). For future releases:
- Play Console → Users and permissions → invite a **service account** (created in
  Google Cloud Console) with release permissions; download its JSON key as
  `./play-service-account.json` (gitignored).
- Then: `eas submit -p android --profile production` uploads new builds directly.

## Android push notifications (configured 2026-07-04)
Firebase project `three-words-a0117` provides FCM; `google-services.json` is
committed and wired via `expo.android.googleServicesFile`, and builds from this
date onward are push-capable. Server-side delivery requires the **FCM V1 service
account key** uploaded at expo.dev → three-words → Credentials → Android (a
Workspace org policy blocks key generation by default — override
"Disable service account key creation" for the project, generate, upload,
optionally re-enable the policy; existing keys keep working).
