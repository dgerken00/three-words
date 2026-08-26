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

## Metrics history (auto-appended each tick)
| Date | Signups (total) | Signups (7d) | Words (total) | Words (7d) | Push-enabled | Notes |
|------|-----------------|--------------|---------------|------------|--------------|-------|
| 2026-08-24 | 21 | 0 | 23 | 0 | 10 | First automated RPC pull. 6 in-app senders. Total (21) is higher than the 2026-08-08 baseline note (9) — may be real growth, may be a different counting basis (RPC likely counts all signups ever, baseline may have counted a subset). Treat this row as the real baseline; trend starts next tick. Both 7-day counters are 0 — nothing moved this week. |
| 2026-08-24 (2nd tick) | 21 | 0 | 23 | 0 | 10 | Second run the same day — every figure identical to the row above, in-app senders still 6. No milestone, no spike, nothing unusual. Monday action was already completed in the earlier tick, so this pass was metrics only. |
| 2026-08-25 | 21 | 0 | 23 | 0 | 10 | Flat again — identical to both 08-24 rows, in-app senders still 6. Third consecutive reading with no movement; the teacher page published 08-24 has not produced measurable signups yet (too early — new pages typically take weeks to get indexed and ranked). Tuesday = metrics only. |

## Action log (auto-appended)
| Date | Action | Result |
|------|--------|--------|
| 2026-08-08 | Loop initialized | Baseline recorded |
| 2026-08-24 | Monday SEO page: published /words-to-describe-a-teacher/ | New page live (back-to-school timing); added to sitemap.xml; contextual inbound link added from /words-to-describe-someone/. HTML + sitemap validated. |
| 2026-08-24 | Metrics tick only (2nd run today) | No numbers moved; Monday action already done this week, so nothing published. |
| 2026-08-25 | Metrics tick only (Tuesday) | No numbers moved. Nothing published — Tuesday is a metrics-only day. |

## DRAFT QUEUE (for David — post yourself, as yourself, then move to Done)

**No post drafts this week** (drafts are scouted on Fridays).

**Note for David — install numbers are stale.** The last store figures in this log are from
2026-08-06 (~20 Play / 6 iOS). Half the goal is "100 cumulative installs" and I can't read the
consoles, so that half is currently unmeasured. Next time you're in Play Console / App Store
Connect, add a row to the "Last-known store numbers" table above.

**Note for David — signup count discrepancy.** The database says 21 total signups; the 2026-08-08
baseline in this log said 9. Worth a glance to confirm which is right — it changes how far along
we actually are toward the ≥40 signups half of the goal.

### Done
_(none yet)_
