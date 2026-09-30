# Plan: topic clouds created in the app (v1.3.0)

Status: **2026-09-30: Android 1.3.0 live; Android 1.3.1 (version code 9) and iOS 1.3.1 (build 16) in review. Free limit raised to three open clouds (raise-topic-limit.sql, run 2026-09-30).**

| Step | State |
|---|---|
| 1. Database change (`add-user-topics.sql`) | Run in Supabase by David 2026-09-29; confirmed live. |
| 2. Web (`docs/c/`, report link, labels) | Live. A further update that tells visitors they can start their own cloud is built locally and held until 1.3.0 is in both stores. |
| 3. App screens (`App.js`, v1.3.0) | Tested by David on iPhone through TestFlight; all steps worked. Clouds card moved up the dashboard after that test. |
| 4. Terms and privacy | Live. |
| 5. Store release | iOS in review. Android waiting for upload. |

Decisions made: free limit is 3 open clouds (raised from 1 on 2026-09-30, never to be lowered); David reviews reports weekly (queries are at the top of `add-user-topics.sql`).
User cloud links are `threewordsapp.com/c/?t=<8 characters>`.

## Why

The public "Describe 2026 so far" cloud collected 22 answers in about a day from strangers.
The personal cloud had no signups in the same week. People will answer a topic cloud on the
web with no account; this release lets app users start their own.

## What a user can do

1. In the app, tap **Start a cloud about anything** and type a topic (up to 60 characters),
   for example "our team offsite" or "Grandpa's 80th".
2. Get a link like `threewordsapp.com/c/?t=k7m2qxwp` and share it anywhere.
3. Anyone with the link adds three words on the web. No account, same page as the 2026 cloud.
4. The owner watches the cloud in the app and can hide a word, close or reopen the cloud, or delete it.

## Rules built in from the start

| Rule | Reason |
|---|---|
| Cloud links use a random code, not the topic name | Links can't be guessed or listed |
| User clouds are unlisted and marked `noindex` | They never appear on the public hub or in search |
| Every cloud page has a **Report this cloud** link | App store rules for user content, and basic safety |
| A cloud with 3 reports from different visitors is paused until reviewed | Stops a harmful cloud without waiting for a person |
| Topic names go through the same slur filter as words | |
| The page says "Started by a three·words user" | Visitors know it isn't an official cloud |
| Free limit: 3 open clouds per account (was 1 until 2026-09-30) | Clouds are the growth loop, so the count stays generous and permanent; a paid tier would sell better clouds, not more |

Known gap: nothing can automatically tell that a topic names a private person. The terms will
forbid clouds that target a private individual, and reports plus the pause rule enforce it.

## Work

| Step | Who | What |
|---|---|---|
| 1 | Claude writes, David runs | `add-user-topics.sql`: owner, listing and report columns on `topics`; new functions to create, list, hide a word, open/close, delete and report |
| 2 | Claude | Web: report link, "started by" line, `noindex` for user clouds, hub shows official clouds only |
| 3 | Claude | App: "Your clouds" section on the dashboard, create screen, live cloud view with owner controls |
| 4 | Claude | Terms and privacy pages updated for user-created clouds |
| 5 | Claude builds, David uploads | v1.3.0 to both stores, same routine as v1.2.0 |

## Not in this release

Payments, a public directory of user clouds, printed keepsakes, Google sign-in.

## How we'll judge it

- Clouds created per week
- Answers per cloud
- Store taps coming from user clouds (tracked the same way as the 2026 page)
