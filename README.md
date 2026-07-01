# three·words — family test

Get the real app running on Carol, Maggie, and Thomas's phones in about 30 minutes,
no App Store, no developer accounts.

## What you need
- Node.js 18+ on your Mac/PC (check with `node -v`; install from nodejs.org if missing)
- A free Supabase account (supabase.com)
- Everyone installs the free **Expo Go** app (App Store / Google Play)

## 1. Set up the backend (~5 min)
1. Go to supabase.com → New project (free tier). Name it `three-words`.
2. When it finishes provisioning: **SQL Editor → New query** → paste the contents of
   `supabase-schema.sql` → **Run**. You should see "Success".
3. **Settings → API** → copy the **Project URL** and the **anon public** key.
4. Open `lib/supabase.js` and paste both values where indicated.

## 2. Run the app (~5 min)
```bash
cd three-words
npm install
npx expo install --fix     # aligns native package versions with the Expo SDK
npx expo start --tunnel
```
`--tunnel` matters: it makes the app reachable over the internet, so Thomas and
Maggie can join from anywhere, not just your wifi. The first tunnel start may
prompt you to install @expo/ngrok — say yes.

A QR code appears in the terminal.

## 3. Get the family in (~2 min each)
- **iPhone:** open the Camera app, point at the QR code, tap the banner.
- **Android:** open Expo Go, tap "Scan QR code".
- The app loads inside Expo Go. Each person creates their profile or taps
  "I have an invite" and pastes a code.

Text the QR code screenshot (or the exp:// link the terminal prints) to anyone
who isn't in the room.

## 4. The test itself
1. Create your profile → tap **Share invite link** → text it to the family.
2. They paste the code, send three words (anonymous or named).
3. Watch your dashboard — new words appear **live** (the "· live" indicator
   next to the count means realtime is connected). No refresh needed.

## Things to know
- Your dev machine must stay running with `expo start` active — it's serving
  the app. Close the laptop and the family's sessions pause.
- Profiles persist on each phone; submissions persist in Supabase. Quit and
  reopen freely.
- The database policies are wide open (fine for family; not for strangers).
  Locking this down with real auth is part of the store-release build.

## What to collect from the test
Ask each family member: Was pasting a code annoying? (Real deep links fix
this in the store version.) Did anonymous vs. named feel right? Did they want
to see who said which word? Their answers shape the production build.
