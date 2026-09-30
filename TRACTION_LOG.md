# Traction Loop — state & audit log

STATUS: RUNNING
(Set to STOPPED to halt the loop; the daily task exits immediately when it sees STOPPED or GOAL_REACHED.)

## Goal
- **100 cumulative installs** across App Store + Google Play, AND
- **≥40 signups** with words actively flowing (database is the primary gauge)

## Baseline (2026-08-08)
- Installs: ~26 (Play ~20 devices, iOS 6)
- Signups: 9 since closed test began; 0 since 2026-07-28 production launch
- Store numbers are updated manually when David is in the dashboards; DB stats are pulled automatically each tick.

## Standing rules (never violated, never re-litigated)
1. Never create accounts, never post to any external platform, never generate reviews, ratings, votes, or testimonials.
2. All community/outreach content is DRAFTED ONLY (in DRAFT_QUEUE section below) for David to post himself, as himself, with disclosure.
3. Website content must be factual; example word clouds are always labeled as examples.
4. No spending of any kind. No changes to app code (App.js etc.) — docs/ website content only.
6. **No personal-network tactics (David, 2026-09-11).** Drafts never ask David to post to his own social feeds, family/friend group chats, or people he knows, and never make him the subject. Outreach targets only strangers already searching for this — public threads, directories, occasion communities.
5. Every change is committed to git with a clear message.

**Standing instruction for ticks (added 2026-09-26):** in Step 1, also call the `get_topic_stats`
RPC (same URL/key pattern as get_growth_stats) and put per-topic `answers_total` and
`clicks_ios + clicks_android` in the metrics row's Notes column. Store taps from the public
clouds are the one funnel number this project can read without the consoles. If the RPC 404s,
David hasn't run `add-topic-clouds.sql` yet — say so in the Notes and move on.

## Last-known store numbers (manually updated)
| Date | Play installs | iOS installs | Source |
|------|--------------|--------------|--------|
| 2026-08-06 | ~20 | 6 | Console/ASC screenshots |
| 2026-08-28 | 1 acquisition in last 28d (impressions 365, **+660%**; monthly active devices 7; listing conversion 60.98%) | not checked (ASC needs David's login) | Play Console → Grow users, pulled by David+Claude |

## Metrics history (auto-appended each tick)
| Date | Signups (total) | Signups (7d) | Words (total) | Words (7d) | Push-enabled | Notes |
|------|-----------------|--------------|---------------|------------|--------------|-------|
| 2026-08-24 | 21 | 0 | 23 | 0 | 10 | First automated RPC pull. 6 in-app senders. Total (21) is higher than the 2026-08-08 baseline note (9) — may be real growth, may be a different counting basis (RPC likely counts all signups ever, baseline may have counted a subset). Treat this row as the real baseline; trend starts next tick. Both 7-day counters are 0 — nothing moved this week. |
| 2026-08-24 (2nd tick) | 21 | 0 | 23 | 0 | 10 | Second run the same day — every figure identical to the row above, in-app senders still 6. No milestone, no spike, nothing unusual. Monday action was already completed in the earlier tick, so this pass was metrics only. |
| 2026-08-25 | 21 | 0 | 23 | 0 | 10 | Flat again — identical to both 08-24 rows, in-app senders still 6. Third consecutive reading with no movement; the teacher page published 08-24 has not produced measurable signups yet (too early — new pages typically take weeks to get indexed and ranked). Tuesday = metrics only. |
| 2026-08-27 | 21 | 0 | 23 | 0 | 10 | Fourth consecutive flat reading — every figure identical to the three rows above, in-app senders still 6. No milestone, no spike, no organic activity. Run started late on Wed 2026-08-26 and the clock rolled past midnight mid-run, so it is logged under 08-27 but carries out the Wednesday optimization action (none had been done this week). No tick was logged for 08-26. |
| 2026-09-01 | 22 | 1 | 24 | 1 | 10 | **FIRST MOVEMENT.** Signups 21→22, words 23→24, in-app senders 6→7, and both 7-day counters are non-zero for the first time since this log began. Timing lines up with v1.2.0 (the welcome-screen + Sign in with Apple conversion fix) reaching users after the 08-28 submission. Caveat, stated plainly: **n=1.** One signup is not yet evidence the fix worked — it could be David, a family member, or coincidence. What would make it real is a second and third over the coming week. Not a goal milestone (thresholds are 10/20/30/40; the total passed 20 before this log's first row). |
| 2026-09-11 | 23 | 1 | 24 | 0 | 11 | Second signup since v1.2.0 (22→23), push-enabled 10→11, in-app senders still 7. No words sent in the last 7 days — the new user signed up but hasn't collected words yet. No ticks ran 09-02 → 09-10 (nine-day gap in this log). No milestone (next is 25). Pace since 09-01: +1 signup in 10 days. |
| 2026-09-20 | 23 | 0 | 24 | 0 | 11 | Flat — every total identical to 09-11 (signups 23, words 24, push 11, in-app senders 7). The only change is signups_7d 1→0, which is just the 09-11 signup aging out of the 7-day window, not a loss. So: no new signups and no new words in the last nine days. No milestone (next is 25), no spike, nothing unusual. Sunday = metrics only. Note: no ticks ran 09-12 → 09-19, so the Mon 09-14 ASO, Wed 09-16 SEO and Fri 09-18 scout/digest slots were all missed; ASO work still has not started since the 08-28 rebalance. |
| 2026-09-22 | 23 | 0 | 24 | 0 | 11 | Flat — every figure identical to the 09-11 and 09-20 rows (signups 23, words 24, push 11, in-app senders 7, both 7-day counters 0). No new signups and no new words in eleven days. No milestone (next is 25), no spike, nothing unusual. Tuesday = metrics only. Housekeeping note: this run started while the clock still read Sun 09-20 and rolled over to Tue 09-22 mid-run, so stats were pulled twice (identical both times) and the row is filed under 09-22. **The Monday 09-21 ASO slot was missed** — no tick ran for it. That makes four consecutive missed action slots (09-14 ASO, 09-16 SEO, 09-18 scout/digest, 09-21 ASO); ASO work still has not started since the 08-28 rebalance. |
| 2026-09-26 | 23 | 0 | 24 | 0 | 11 | Flat — fourth identical reading in a row (signups 23, words 24, push 11, in-app senders 7, both 7-day counters 0). **Fifteen days with no new signup and no new word** (last movement 09-11). No milestone (next is 25), no spike, no drop. Friday scout + digest day; the run started Fri 09-25 and rolled past midnight mid-run, so it is filed under 09-26. Also missed since the last tick: **Wed 09-23 SEO** — that makes five consecutive missed action slots (09-14 ASO, 09-16 SEO, 09-18 scout/digest, 09-21 ASO, 09-23 SEO). Important caveat on reading these flat numbers: v1.2.0 (the conversion fix) has now been live on both stores for ~4 weeks and has produced 0 signups in that time, but **we cannot tell whether the fix failed or simply had no installs to convert**, because store numbers have not been refreshed since 2026-08-06. |

## Action log (auto-appended)
| Date | Action | Result |
|------|--------|--------|
| 2026-08-08 | Loop initialized | Baseline recorded |
| 2026-08-24 | Monday SEO page: published /words-to-describe-a-teacher/ | New page live (back-to-school timing); added to sitemap.xml; contextual inbound link added from /words-to-describe-someone/. HTML + sitemap validated. |
| 2026-08-24 | Metrics tick only (2nd run today) | No numbers moved; Monday action already done this week, so nothing published. |
| 2026-08-25 | Metrics tick only (Tuesday) | No numbers moved. Nothing published — Tuesday is a metrics-only day. |
| 2026-08-27 | Wednesday optimization pass: /words-to-describe-someone/ | Fixed a false claim: the title promised "150+ words" but the page listed only 113 unique ones. Added two new sections — "For how they work" (20 words, also targets coworker/colleague searches) and "For someone you love" (20 words) — bringing it to 153 unique words, so the headline number is now true. Added a "How do you describe someone in just three words?" section (a real question people search; written as a how-to, good snippet candidate) with a contextual link to /describe-yourself-in-three-words/. Added og:type and og:url. HTML nesting and links verified. |
| 2026-08-28 | v1.2.0 submitted to BOTH stores (conversion fix) | Attacks the install-to-signup leak: welcome screen now shows an example cloud + payoff copy BEFORE the account gate, and iOS gets one-tap Sign in with Apple. Android in Google review (auto-publishes); iOS in Apple review (auto-release). Watch signups_7d after both go live — that number is the verdict on this release. |
| 2026-08-28 | Loop rebalanced toward ASO (David-approved) | Rotation now Mon=ASO (screenshots/keyword research, repo-only), Wed=SEO, Fri=scout+digest. Rationale: iOS acquisition ~100% App Store Search and rising; web referrals zero. |
| 2026-08-27 | Fixed misleading example-cloud captions (3 pages) | Standing rule 3 says example clouds must always be labeled as examples. Three captions read as real user data instead: /words-to-describe-someone/ ("one friend's cloud, twelve people in"), /describe-yourself-in-three-words/ ("what ten colleagues and friends actually said"), and /tribute/ ("Grandma Rose's cloud, after seventeen family members answered"). All three now say plainly that the cloud is an example. All four site clouds are now correctly labeled. |
| 2026-09-01 | Metrics re-check only (no action taken) | This run had already spent its one action on the Wednesday SEO pass above, so no second action was taken. **The Monday 09-01 ASO slot is still open for the next tick** — under the 08-28 rebalance that means screenshots / keyword research, repo-only. |
| 2026-09-20 | Metrics tick only (Sunday) | No numbers moved since 09-11. Nothing published — Sunday is a metrics-only day. Flagged in the metrics row that the 09-14 / 09-16 / 09-18 action slots were missed because no ticks ran that week. |
| 2026-09-22 | Metrics tick only (Tuesday) | No numbers moved since 09-11. Nothing published — Tuesday is a metrics-only day. Flagged that the Monday 09-21 ASO slot was also missed, making four consecutive missed action slots. |
| 2026-09-11 | Friday scout + weekly digest | Scouted one opportunity: **National Grandparents Day is Sunday 2026-09-13** (first Sunday after Labor Day) — a direct fit for /tribute/. Ready-to-post draft queued below (David posts as himself, with disclosure). Digest sent. Noted that no runs happened 09-02 → 09-10, so the Mon 09-07 ASO and Wed 09-09 SEO slots were missed; ASO work has not started since the 08-28 rebalance. |
| 2026-09-26 | Built public live clouds (David-directed, outside the loop's rotation) | David asked for a stranger-facing "describe X in three words" live cloud to promote the app; picked "2026 so far" as the launch subject. Shipped: `add-topic-clouds.sql` (own tables + RPCs, RLS with no client policies, salted IP-hash rate limiting, same slur list as the app, per-topic `hidden_words` for post-hoc moderation, store-tap counters), `/describe/2026/` page, `/describe/` hub that renders any topic from `?t=slug`, homepage footer link, sitemap, and an honest privacy-policy section. App code untouched. **Blocked on David running the SQL** — draft queue has the steps, the post draft, and the stats command. |
| 2026-09-26 | Friday scout + weekly digest | Scouted one opportunity and it is a good one: **Apple's App Store featuring nomination form** (ASC → Featuring → Nominations), free, and it aims straight at the only channel with evidence behind it (iOS acquisition is ~100% App Store Search). Complete ready-to-paste draft queued below, all three text fields already trimmed to Apple's limits (name 47/60, description 922/1000, helpful details 498/500). David submits it himself in ASC — this loop never touches the console. No forum/Reddit draft this week: searched for live threads asking for an app like this and found none genuine, so nothing was drafted rather than forcing it. Digest sent. |
| 2026-09-28 | David posted the 2026 cloud himself: personal Facebook (09-27) and r/SampleSize from u/davids-side-project (09-28) | Cloud redesigned first (wide stage, balanced headings, neighbouring words never share a colour; commits cc054b9, e683004). Baseline at posting time: 2 answers, 6 distinct words, 3 share clicks, 0 store clicks. r/SampleSize showed 15 views and 1 comment after 3 minutes. r/SideProject post held until the cloud has more answers. Word packing / vertical words on hold until then too. |
| 2026-09-29 | Shipped to the 2026 page: app offer after answering, link preview image, shuffle fix (commit c0fa965). Started v1.3.0: clouds about any subject, started in the app (David-approved) | At 22 answers the 2026 cloud had 0 store taps, so the offer now appears right after someone answers. v1.3.0 plan and state are in TOPIC_CLOUDS_PLAN.md. New stats function once the database change is run: `get_user_topic_stats()`. Monetization parked: free limit of 1 open cloud leaves room for paid event clouds later; no payments built. |

## DRAFT QUEUE (for David — post yourself, as yourself, then move to Done)

**WITHDRAWN 2026-09-11 — Grandparents Day draft.** Both versions targeted David's own
social feeds and family group chat, which violates the new standing rule 6. No replacement:
no public thread asking for a Grandparents Day tribute idea was found this week. The occasion
itself is still a good SEO target — a Wednesday page ("three words to describe Grandma /
Grandparents Day tribute") for *next* year's search traffic is the constraint-compatible version.

**No post drafts this week.** I looked for a live public thread where someone is actually
asking for an app like this, and for an occasion community worth joining — nothing genuine
turned up, so I'm not drafting filler. See the nomination draft below instead; it's a better
use of the same 15 minutes.

---

### ✳️ NEW 2026-09-26 — Public live cloud: "Describe 2026 so far in three words" (David-directed build)

**What it is.** A website-only feature: a public page where strangers add three anonymous words
about a shared subject and watch the cloud grow live, with a CTA underneath — *"That's how
strangers describe 2026 so far. Now find out how the people who know you describe you."* David
chose "2026 so far" as the launch subject (over Reddit / a public figure) — warm, everyone has an
opinion, nobody gets defamed. It lives entirely in docs/ + its own database tables; the app,
profiles and submissions are untouched, so nothing about the store listings changes.

**STEP 1 — David must run the SQL (I can't; the anon key can't create tables).**
Supabase → SQL Editor → New query → paste the whole of `add-topic-clouds.sql` → Run. It is
non-destructive and idempotent. Until this runs, the page shows "This cloud isn't open yet."

**STEP 2 — check it.** Open https://threewordsapp.com/describe/2026/ (live once the push deploys,
usually within a couple of minutes), add three words, watch them appear. A second browser (or
private window) counts as a second person.

**STEP 3 — post it, as yourself, with disclosure.** (Revised 2026-09-26 after checking rules
via web search; Reddit itself blocks my fetches, so still glance at each sidebar before posting.)

- ⏸ **r/SampleSize — hold, not first.** A 2020 write-up of its rules says links must be on a
  trusted survey host, but in practice own-domain `[Casual] … (US, everyone)` posts do stay up
  there, so that rule is outdated or unenforced. Not first in line; David's call whether to use it.
- **Account:** three·words posts go out from a Reddit account used only for three·words.
- ✅ **r/SideProject — post here first.** Built for "I made this"; links are fine if you give
  context and ask for specific feedback; bare "check it out" posts get removed.
- ⚠️ **r/InternetIsBeautiful — biggest reach, conditional.** Strict 90/10 rule: if most of your
  recent Reddit activity is promoting things you made, the post is removed. Only post here if your
  account history is mostly ordinary participation. It also bans "products with a sign-up" — our
  page has none, so say so in the comment.
- Site-wide: no more than ~1 in 10 of your posts/comments should link to your own stuff, so
  space these out (different days) and don't repost.

**Draft A — r/SideProject** (text post):

> **Title:** I built a live "describe 2026 so far in three words" cloud — no signup, three words.
> Does the format work?
>
> https://threewordsapp.com/describe/2026/
>
> What it is: you type three words for how 2026 has felt so far, anonymously, and they land in a
> live cloud with everyone else's. One set per person (you can change yours, not add more).
>
> Why: I make a small app called three·words — you invite the people who know you and each sends
> three words that describe you. Almost nobody discovers it, so I'm trying a public version
> pointed at a subject strangers already have opinions about, with the app mentioned underneath.
> This page *is* the experiment.
>
> Tech, since people ask: static site on GitHub Pages, Supabase Postgres with everything behind
> RPCs (no client can read rows), vanilla JS polling every few seconds. No framework.
>
> Feedback I'd actually like: after you've added your words, does the "now find out how *your*
> people describe you" line make sense, or does it feel like a bait-and-switch? And would you
> share the cloud with anyone?

**Draft B — r/InternetIsBeautiful** (link post to the page, then this as your first comment):

> **Title:** A live word cloud of how strangers describe 2026 so far — add your three words [OC]
>
> **Comment:** I made this. No sign-up, no account — the only thing stored beyond your three
> words is a browser token so each person gets one set (editable). It's a public spin-off of a
> small app I built where the people who know you describe you in three words; the app is
> mentioned at the bottom of the page and that's the only ask.

**What to watch — the number this exists to move.** Not answers; *store taps*. Pull it any time:

```
curl -s -X POST "https://iyphfzubdebuenbiplzy.supabase.co/rest/v1/rpc/get_topic_stats" -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>" -H "Content-Type: application/json" -d '{}'
```

If 500 people answer and 5 tap a store button, the format works as a poll but not as a funnel —
and that's worth knowing before spending another subject on it.

**Moderation.** Slurs are rejected before saving (same list as the app). To hide a word after the
fact, close the topic, or open a new one, see the cheat-sheet at the top of `add-topic-clouds.sql`.
New topics need only one SQL insert — `/describe/?t=<slug>` renders them without a new page.

---

### ✳️ NEW DRAFT 2026-09-26 — App Store featuring nomination (you submit this, in ASC)

**Why this one.** The one thing we know for certain is that iOS installs come almost entirely
from App Store Search, and that Play impressions jumped 660% without producing installs. A
featuring nomination is the only free lever that pushes on the channel that's actually working.
Apple added this form so small developers can pitch editors directly. It costs nothing and takes
about 15 minutes.

**Honest odds:** low. Apple features a tiny fraction of nominations, and ours is a late pitch
(v1.2.0 has been live ~4 weeks; Apple prefers to hear about things 3+ months ahead). But the
downside is 15 minutes and the upside is a category of traffic we cannot buy. Worth the stamp.

**Where:** App Store Connect → **Featuring** → **Nominations** → **＋** (needs Account Holder,
Admin, App Manager or Marketing role — you're the Account Holder, so you're fine).

**Fill it in exactly like this:**

- **Related Apps:** `6786531783`
- **Nomination Type:** `App Enhancements`
  *(This is the honest choice. "App Launch" is past, and "New Content" would mean promising
  seasonal in-app content we don't have. App Enhancements = v1.2.0's welcome screen + Sign in
  with Apple, which is real and shipped.)*
- **Platforms:** `iOS (iPhone)`
- **Publish Date (Start):** leave blank (v1.2.0 is already live)
- **Relevant Countries or Regions:** `USA`
- **Do you plan to launch in certain markets first?** `No`
- **Do you intend to submit a new In-App Event?** `No`
- **Does this app or game include a pre-order?** `No`
- **Supplemental Materials:** `https://threewordsapp.com`

- **Nomination Name** (47/60 chars):

```
three·words 1.2 — a kinder first thirty seconds
```

- **Nomination Description** (922/1000 chars):

```
three·words is a small, quiet app with one idea: invite the people who know you, and each of them sends three words that describe you. The words gather into a living word cloud — signed or anonymous, their choice.

Version 1.2 rebuilt the first thing a new person sees. Before, the app asked you to make an account before it showed you anything at all. Now the welcome screen shows an example cloud and explains the payoff first, and iPhone gets one-tap Sign in with Apple — so the distance from "just installed" to "my cloud exists" is a few seconds.

The part people react to: the people describing you don't need the app. You send a link, they answer in a browser, and the words land on your phone live.

No feed, no followers, no ads, no algorithm. A profanity filter plus in-app report and block keep it kind, and deleting your account deletes every word with it.

I built it on my own — I'm not a developer by trade.
```

- **Helpful Details** (498/500 chars):

```
Three things of possible interest: (1) The people describing you never install anything — the invite is a link that opens in any browser, so a cloud can fill with words from people who have never heard of it. (2) It is deliberately not a social network: no feed, no follower count, no public profile. The only thing there is to see is how people chose to describe you. (3) Moderation is at submission (filter) and by the recipient (report, block); accounts and all their words are deletable in-app.
```

**Two notes.** Every sentence above is checkable against the app as it ships — please don't let
me talk you into adding a claim we can't back. And if you're planning *any* update in
October–December, tell me: re-nominating against a real future release date is a meaningfully
stronger pitch than this one, and we'd file it 3+ weeks ahead.

Apple replies only if interested, by email to the address on the nomination. Move this to Done
once submitted.

---

**Note for David — install numbers are stale, and this is now the blocking problem (updated
2026-09-26).** The last store figures in this log are from 2026-08-06 (~20 Play / 6 iOS) — seven
weeks ago. iOS has never been read at all. Half the goal ("100 cumulative installs") is therefore
unmeasured, but the bigger cost is this: v1.2.0 shipped the conversion fix four weeks ago and
signups have not moved since 09-11, and **I cannot tell you whether that means the fix didn't work
or that nobody installed the app for it to work on.** Those two answers point at completely
different next actions — one says redesign the signup screen again, the other says the listing
isn't earning installs. Five minutes in Play Console (Grow users → installs, 28d) and ASC
(Analytics → app units) settles it. Please add a row to "Last-known store numbers" above next time
you're in there; it's the highest-value five minutes available to this project right now.

**RESOLVED 2026-08-28 — signup count discrepancy.** Both numbers were right, different windows:
21 = all signups ever (what get_growth_stats returns); 9 = signups since 2026-07-11 only (a
filtered query run during the closed test). Use **21 as the real total**; goal is ≥40.

**KEY FINDING 2026-08-28 — iOS acquisition is ~100% App Store Search.** ASC → Analytics →
Acquisition → Sources (May 30–Aug 27, product page views by source): App Store Search accounts for
nearly every product page view, and its frequency clearly increases after the Aug 7 ASO update
(near-daily small spikes through August vs. sparse in June/July). **Web Referrer is zero** — the
threewordsapp.com content pages have sent nobody to the App Store yet, consistent with them not
being ranked yet. Implication for loop strategy: ASO is the proven channel and SEO is still
pre-revenue; consider rebalancing effort toward store-listing work (screenshots, keyword coverage)
rather than SEO pages alone. Second implication: the sharpest leak is now install→signup
(installs trickling in, 0 signups in 7 days), i.e. the sign-up screen, not discovery.

**RESOLVED 2026-08-28 — store numbers refreshed** (see table above). Key finding: Play impressions
are up 660% over 28 days (365) — the Aug 7 ASO update is getting the listing SHOWN far more — but
that produced only 1 acquisition. The bottleneck is now listing→install conversion and, beneath
that, install→signup conversion, not visibility. iOS numbers still need David (ASC login).

### Done
_(none yet)_
