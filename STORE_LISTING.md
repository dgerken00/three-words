# Store listing copy — three·words

Draft text for the App Store and Google Play listings. Tweak to taste.

## App name
three·words

## Subtitle / short description (30 / 80 chars)
- iOS subtitle (≤30): `How friends really see you`
- Android short (≤80): `Invite people who know you to describe you in three words. Watch your cloud grow.`

## Promotional / full description
> How do the people who know you *really* see you?
>
> three·words is a simple, honest little app. Invite the people who know you —
> friends, family, the group chat — and each of them sends three words that
> describe you. Named or anonymous. As the words come in, they gather into a
> living word cloud that's unmistakably *you*.
>
> • Send someone your invite code and watch the words arrive live
> • Describe the people who invite you — three honest words each
> • Choose to sign your words or stay anonymous
> • Start a cloud about any subject and share the link; people answer from their browser
> • A gentle filter keeps things kind; report or block anything unwelcome
> • Delete your account and all your words anytime
>
> No feeds, no followers, no ads. Just the people who know you, in their own
> words.

## Keywords (iOS, ≤100 chars, comma-separated)
`words,describe,friends,personality,word cloud,anonymous,honest,how others see me,family,invite`

## Category
Primary: Social Networking (iOS) / Social (Android)

## Age rating
- **17+ / Mature** is the safe choice because the app allows user-generated,
  potentially anonymous content. In the questionnaires, answer YES to
  "user-generated content" and describe the moderation controls (filter, report,
  block). Under-rating a UGC app is a common rejection reason.

## Support + marketing URLs
- Support URL: https://threewordsapp.com (live)
- Privacy policy URL: https://threewordsapp.com/privacy/ (live — see PRIVACY.md)
- Marketing URL (optional): https://threewordsapp.com

## Screenshots needed
- **iOS**: 6.7" (1290×2796) and 6.5" (1242×2688) — 3–5 each.
- **Android**: phone screenshots (min 2), 1080×1920 or similar, plus a 1024×500
  feature graphic.
- Good screens to capture: the welcome/sign-in, a full word cloud, the submit
  screen, the invite/share card.

## What to say in the "notes for reviewer"
> This app contains user-generated content (three-word descriptions). Moderation:
> an automatic profanity filter blocks objectionable words at submission time;
> recipients can report content and block senders in-app; reported content is
> removed immediately and reviewed within 24 hours at admin@threewordsapp.com.
> Test account: enter the review account's email and password in the store console's
> sign-in fields, never in this file (the repository is public). It has a populated cloud.
> Users agree to Terms with a zero-tolerance clause at sign-up
> (https://threewordsapp.com/terms/).

## Listing update for clouds about any subject (David decided 2026-10-04 to apply it now, alongside the landing page)

David's steer (2026-10-01): many people are reluctant to ask about themselves but like clouds
about anything, so the listing must lead with both, not bury the second.

- iOS subtitle (≤30): `Word clouds on you or anything` (30 exactly)
- Android short (≤80): `Live word clouds about you or anything. Three words each, from a link.`

Full description (both stores):
> Ask anyone to describe anything in three words. Watch the answers form a live word cloud.
>
> Start a cloud about any subject — a trip, a team, a wedding, the year so far — and share the
> link. Anyone can add three words from their browser; they never need the app. The words gather
> live into a cloud that's funnier and more honest than any survey.
>
> Or turn it on yourself. Send your invite to the people who know you and find out, in their own
> words, how they really see you. Named or anonymous, their choice.
>
> • Clouds about anything: pick a subject, share a link, watch it grow
> • Your own cloud: how friends, family and the group chat really see you
> • Answers come from a link, so nobody else needs the app
> • Named or anonymous, each person decides
> • A gentle filter keeps things kind; hide, report or block anything unwelcome
> • Up to three clouds open at a time; close or delete them whenever you like
> • Delete your account and all your words anytime
>
> No feeds, no followers, no ads. Just people, in their own words.

Screenshots, in this order: a topic cloud (sets the frame), the personal cloud, the "About anything" tab.

## v1.3.0 (clouds about any subject)

**What's new (both stores)**
> New: start a word cloud about anything. Pick a subject, such as a trip, a team or a year,
> and share the link. Anyone can add three words from their browser, no app needed. You can
> hide words, close the cloud, or delete it at any time.

**Add to the notes for the reviewer**
> New in 1.3.0: users can start a word cloud about a subject and share its link. Answers are
> added anonymously on our website. Moderation: the same automatic word filter applies to
> cloud names and answers; the owner can hide words, close or delete the cloud in the app;
> every cloud page has a "Report this cloud" link, and a cloud reported by three people is
> paused and hidden until we review it. Clouds are unlisted and reachable only by link. Our
> Terms forbid clouds that target a private person.

---

# Public App Store submission — pre-filled answers

Use these when submitting for the full App Store release (beyond TestFlight).

## Screenshots — shot list
Required: **6.7"** display, 1290×2796 px (iPhone 15/16 Pro Max). 3–5 images.
Capture these from the app on your phone, then AirDrop to your Mac:
1. **Welcome / sign-in** — "How do your friends really see you?"
2. **A full word cloud** — use your populated account (Dave G) so it looks alive.
3. **Submit screen** — describing someone (the three word fields).
4. **Invite card** — your code + Share button.
5. (optional) **Recent list** — showing named + anonymous entries.
Tip: screenshots may not show the status bar cleanly; that's fine, Apple accepts as-is.

## Age rating questionnaire → expect 17+
- Unrestricted web access: **No**
- User-generated content / user-to-user: **Yes** → this drives the 17+/mature rating.
  Describe the moderation controls (filter, report, block) in the follow-up.
- Everything else (violence, gambling, mature themes, etc.): **None**

## App Privacy "nutrition label" (Data collected)
Declare these; mark ALL as **not used for tracking** and **linked to identity**
(needed to operate the app), **not** used for advertising:
- **Contact Info → Email address** — App Functionality (account/sign-in).
- **User Content → Other user content** — App Functionality (the three-word submissions).
- **Identifiers → User ID** — App Functionality (your Supabase account id).
No location, contacts, health, financials, browsing, or advertising data collected.

## Pricing & Availability
- Price: **Free**
- Availability: your choice (all territories is fine).

## URLs for the listing
- Support URL: `https://threewordsapp.com/` (landing page)
- Privacy Policy URL: `https://threewordsapp.com/privacy/`
- (App Store Connect also has an optional EULA field — you can paste your Terms URL:
  `https://threewordsapp.com/terms/`)

## Likely rejection risks to pre-empt
- **Guideline 1.2 (UGC):** covered — filter + report + block + 24h contact + Terms
  agreement at sign-up with a zero-tolerance clause. Point the reviewer to all of these.
- **Guideline 4.2 (minimum functionality):** the app is intentionally simple. If
  flagged, respond that the value is the social word-cloud experience, and consider
  adding depth (history, sharing the cloud as an image, etc.) in a later version.
