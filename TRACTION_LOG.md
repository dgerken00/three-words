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
5. Every change is committed to git with a clear message.

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

## Action log (auto-appended)
| Date | Action | Result |
|------|--------|--------|
| 2026-08-08 | Loop initialized | Baseline recorded |
| 2026-08-24 | Monday SEO page: published /words-to-describe-a-teacher/ | New page live (back-to-school timing); added to sitemap.xml; contextual inbound link added from /words-to-describe-someone/. HTML + sitemap validated. |
| 2026-08-24 | Metrics tick only (2nd run today) | No numbers moved; Monday action already done this week, so nothing published. |
| 2026-08-25 | Metrics tick only (Tuesday) | No numbers moved. Nothing published — Tuesday is a metrics-only day. |
| 2026-08-27 | Wednesday optimization pass: /words-to-describe-someone/ | Fixed a false claim: the title promised "150+ words" but the page listed only 113 unique ones. Added two new sections — "For how they work" (20 words, also targets coworker/colleague searches) and "For someone you love" (20 words) — bringing it to 153 unique words, so the headline number is now true. Added a "How do you describe someone in just three words?" section (a real question people search; written as a how-to, good snippet candidate) with a contextual link to /describe-yourself-in-three-words/. Added og:type and og:url. HTML nesting and links verified. |
| 2026-08-28 | Loop rebalanced toward ASO (David-approved) | Rotation now Mon=ASO (screenshots/keyword research, repo-only), Wed=SEO, Fri=scout+digest. Rationale: iOS acquisition ~100% App Store Search and rising; web referrals zero. |
| 2026-08-27 | Fixed misleading example-cloud captions (3 pages) | Standing rule 3 says example clouds must always be labeled as examples. Three captions read as real user data instead: /words-to-describe-someone/ ("one friend's cloud, twelve people in"), /describe-yourself-in-three-words/ ("what ten colleagues and friends actually said"), and /tribute/ ("Grandma Rose's cloud, after seventeen family members answered"). All three now say plainly that the cloud is an example. All four site clouds are now correctly labeled. |

## DRAFT QUEUE (for David — post yourself, as yourself, then move to Done)

**No post drafts this week** (drafts are scouted on Fridays).

**Note for David — install numbers are stale.** The last store figures in this log are from
2026-08-06 (~20 Play / 6 iOS). Half the goal is "100 cumulative installs" and I can't read the
consoles, so that half is currently unmeasured. Next time you're in Play Console / App Store
Connect, add a row to the "Last-known store numbers" table above.

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
