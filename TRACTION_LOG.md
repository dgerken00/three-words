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

## Action log (auto-appended)
| Date | Action | Result |
|------|--------|--------|
| 2026-08-08 | Loop initialized | Baseline recorded |

## DRAFT QUEUE (for David — post yourself, as yourself, then move to Done)
_(empty)_

### Done
_(none yet)_
