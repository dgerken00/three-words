# three·words promo kit

Started 2026-10-17. Everything here is organic: no paid promotion, no personal feeds or family
chats, posted from three·words accounts or as David's own project with a plain "my side project"
note. Never ask for upvotes. Numbers in the drafts are from 17 Oct; refresh them on the day
(ask Claude, or `select get_topic_stats();`).

Already done elsewhere (not repeated here): the promo plays on the landing page and every cloud
page; the 16:9 version is the Google Play listing video (YouTube, unlisted); the r/SideProject
video post (drafted in TRACTION_LOG.md) went up on 14 Oct.

**r/SideProject status (17 Oct):** the post was removed by Reddit's filters, which are automatic
and not the moderators. The account is not restricted across Reddit (the profile shows when
logged out), so it's that one post. Most likely trigger: a two-week-old account with 34 karma
whose posts nearly all link to the same new site. Don't repost or rewrite it; that can look like
dodging the removal. Wait for the mods' reply (sent messages: old.reddit.com/message/sent/,
replies: reddit.com/message/inbox/); if nothing by **Wed 21 Oct**, send one short follow-up in the
same thread asking whether they can approve it, or whether a version without links is acceptable.

## Calendar

| Date | What | Who |
|---|---|---|
| Sat 17 Oct | Run `add-promo-events.sql` (video play counter) | David |
| Mon 19 Oct | Product Hunt: go. David switches his profile to a personal photo and neutral headline and signs in; Claude fills the launch form; David approves Schedule for Sun 25 Oct (section 3) | David, Claude |
| Sat 17 Oct | Create the three short-video accounts; first post: the vertical promo | David |
| Sun 18 Oct | r/SampleSize: "what you want more of" question, one line under the title (section 5) | David |
| 24 h after that post | Check its count and call the next r/SampleSize step (section 5) | Claude |
| 18–21 Oct | Record the App Store preview (25 s, script below); Claude cuts it and builds 1.3.3 | David, then Claude |
| Wed 21 Oct | If the r/SideProject mods haven't replied: one short follow-up in the same thread | David |
| Sat 24 Oct | Short-video post 2: the 2026 cloud reveal clip; Claude refreshes the numbers in the Product Hunt first comment and redraws the three gallery clouds | David, Claude |
| Sun 25 Oct | **Product Hunt launch** (goes live by itself at 12:01 a.m. Pacific); reply to comments through the day. The site shows the Product Hunt badge all that day by itself (`docs/launch-day.js`, landing page and official cloud pages). Morning: r/SampleSize results post for "what you want more of", so launch day brings visitors to pages with the badge (the post itself doesn't mention Product Hunt) | David |
| Thu 29 Oct | Indie Hackers post (with the Product Hunt numbers) | David posts, Claude drafts |
| Sat 31 Oct | Short-video post 3: the year-ahead reveal clip | David |
| Fri 13 Nov | Thanksgiving cloud page + database line ready | Claude |
| Mon 16 Nov | Thanksgiving cloud opens (David runs the line) | David |
| Tue 17 Nov | r/SampleSize: Thanksgiving question, if section 5's check says the sub still works | David |
| Mon 23 Nov | r/SampleSize: Thanksgiving results (before the holiday on Thu 26) | David |
| Tue 1 Dec | Year-end push: 2026 results on r/SampleSize; pitch to year-in-review writers | David, Claude drafts |
| Mon 28 Dec | Final "2026 in three words" results | David |
| Fri 1 Jan | Year-ahead results | David |

Avoid Tue 3 Nov (US election day) and Thanksgiving week for anything that needs attention.

## 1. Short-video accounts (YouTube Shorts, TikTok, Instagram Reels)

These platforms show videos to people who don't follow the account, so a brand account starting
from zero can still reach people. Use three·words accounts, not your personal ones.

**Setup, same everywhere**
- Handle: `threewordsapp` (matches the domain). Name: `three·words` (or `three words` if the dot is refused).
- Picture: `store-assets/play-icon-512.png`.
- YouTube: make a separate channel for three·words (YouTube → your picture → Settings →
  "Add or manage your channel(s)" → Create a channel) rather than posting Shorts on your own.
  The Play listing video can stay where it is.
- TikTok only shows a website link in the bio on a business account: switch to one (free) in settings.
- If a platform asks whether the video is AI-generated, answer the way you did on Google Play.

**Bio**

TikTok (80 characters max):
```
Word clouds on you or anything. Ask anyone for three words ✳
```

Instagram and YouTube:
```
Word clouds on you or anything. Ask anyone for three words and watch the cloud grow, live. Free on iPhone and Android.
```

Link: `https://threewordsapp.com`

**Post 1 — the vertical promo** (`store-assets/video/three-words-promo-9x16.mp4`)

TikTok and Instagram caption:
```
Ask anyone to describe anything in three words, and watch the cloud fill in live. 59 people have described 2026 so far; 18 of them said "expensive". What would you say? Link in bio.

#wordcloud #threewords #2026
```

YouTube Shorts title:
```
Ask anyone to describe anything in three words
```

YouTube Shorts description:
```
Start a cloud about anything, share one link, and everyone adds three words from their browser. Add yours to "Describe 2026 so far": https://threewordsapp.com/describe/2026/
```

**Posts 2 and 3 — cloud reveals** (made by `tools/reveal/make.sh`; rebuild on the day so the
numbers are current): a 15-second vertical clip of one cloud filling in with the real answers.

Post 2, `store-assets/shorts/2026-reveal.mp4`:
```
59 people described 2026 so far in three words. 18 of them said "expensive". What's yours? Link in bio.

#wordcloud #threewords #2026
```

Post 3, `store-assets/shorts/year-ahead-reveal.mp4`:
```
19 people told us how they feel about the year ahead, in three words. "Worried" leads, then "hopeful", "tired", "wary" and "dread". How do you feel? Link in bio.

#wordcloud #threewords
```

## 2. App Store preview video

A preview plays automatically (muted) in App Store search results, which is where almost all
iPhone installs come from. Apple only accepts screen recordings of the app itself; captions are
allowed. So the promo can't be used, but a short recording can.

**Before recording:** turn on Do Not Disturb so no notifications appear. Optional, for a full
cloud on screen: give the 2026 cloud to your account for a few minutes (Supabase → SQL Editor):
```sql
update topics set owner_id = (select id from profiles where invite_code = 'AJ4NEV') where slug = '2026';
```
While that's on, the public 2026 page says "Started by a three·words user". Undo it right after:
```sql
update topics set owner_id = null where slug = '2026';
```

**Record** (Control Centre → Screen Recording; tap the red pill to stop), about 25–30 seconds:
1. Start on **About me** with your cloud showing (3 s).
2. Tap **About anything** (2 s).
3. Tap **Start a cloud**, type `our team offsite`, tap **Start my cloud** (6 s).
4. Tap **Share the link**; when the share sheet opens, wait a second and close it (3 s).
5. Tap **Back**, open **2026 so far**, and let the full cloud sit for 4 seconds (6 s).

Several takes are fine. AirDrop the recordings to the Mac (they land in Downloads), delete the
`our team offsite` test cloud in the app, and run the undo line.

**Then (Claude):** cut to under 30 s at Apple's size (886×1920, 30 fps) with three short captions
("Start a cloud about anything", "Share one link", "Watch it grow"), build version 1.3.3, and you
add the preview and submit, as with 1.3.2.

## 3. Product Hunt — Sunday 25 October

One day of attention from people who try new apps, and a lasting link.

**Decided Mon 19 Oct: launch on Sunday 25 October.** What was weighed:
- **Account.** Only personal accounts can post, comment or vote. Product Hunt's help page
  ("Personal account vs company account") says a personal account has a full name and a personal
  profile picture, and that a name matching a website's domain makes it a company account. The
  launch comes from David's own account, which was first set up for another product; it now has a
  personal photo and the headline "Side-project Maker". The username still names that other
  product (it's locked by the once-every-30-days rule); David's call on 19 Oct was to keep it, since
  it only appears in the profile's web address. A second account would be a made-up identity: not
  an option. Keep each launch's text free of the other product.
- **Featuring.** One maker reports (Indie Hackers, unconfirmed by Product Hunt) that launches from
  an account that launched something else in the past six months may not be featured. The
  account's previous launch (Sun 18 Oct) finished #114 with 2 points, so expect little traffic
  unless Product Hunt features this one. Everything is ready, so it's a cheap test.

**Why a weekend.** Product Hunt's own guide (producthunt.com/launch/preparing-for-launch): larger
companies launch on weekdays, weekends suit side projects and personal apps, and weekend launches
get 15% more "Visit" clicks than weekday ones. Launch at 12:01 a.m. Pacific, when Product Hunt's
day starts. It doesn't favour Saturday or Sunday; Sunday keeps a week between this launch and the
account's previous one.

**Set it up now** (producthunt.com → **Launch** → enter `https://threewordsapp.com`), fill in the
fields below, then **Schedule** for Sunday 25 October, 12:01 a.m. Pacific. Product Hunt days start
then; the launch goes live by itself.

- **Name:** `three·words`
- **Tagline** (60 max):
  ```
  Word clouds on you or anything, three words at a time
  ```
- **Description** (500 max; David's wording, as entered 19 Oct):
  ```
  Start a word cloud about anything — a wedding, a retiree, the year so far — and share one link. People answer with three words from their browser, no app needed, and the cloud grows live. Or ask the people who know you how they really see you. Free, no ads.
  ```
- **Topics:** Social Media, iOS, Android
- **Links:** `https://threewordsapp.com`, the App Store and Google Play pages
- **Pricing:** Free
- **Makers:** you ("I worked on this product")
- **Thumbnail:** `store-assets/producthunt/thumbnail-240.png`
- **Gallery, in order:** the YouTube video `https://youtu.be/rFaNs5C0DHY`, then three live clouds,
  `store-assets/producthunt/cloud-2026.png`, `cloud-more-of.png` and `cloud-year-ahead.png`
  (1270×760, Product Hunt's size; drawn from the live answers with
  `tools/make-cloud-image.sh <slug> store-assets/producthunt/cloud-<slug>.png 1270 760` and redrawn
  on Sat 24 Oct), then `cloud-example-you.png` (the "about you" use: Sam, a made-up person, marked
  Example twice; `tools/producthunt/example-cloud.html`), then `gallery-2.png` (the app: start a
  cloud about anything). "Your job" stays out until its cloud has more variety; `gallery-1`, `3`,
  `4` and `5` are spares. The example stays a made-up name: a cloud of invented words under David's
  name, next to his maker profile, would read as real people describing him.

**First comment** (paste it into the launch form's first-comment box; change anything that doesn't
sound like you; Claude refreshes the numbers on Sat 24 Oct):
```
Hi Product Hunt, I'm David and I made three·words.

It started with one question: How do the people who know you really see you? Users share a link and each person answers with three words, creating a live word cloud. Contributors can be named or anonymous. It's their choice.

Then I focused it on a subject rather than a person: "Describe 2026 so far in three words." 67 people answered, and it proved to be even more insightful and fun than I thought. That's when clouds about anything became the main feature: start one about a wedding, a retiree, the year ahead. Share the link and people answer from their browser without installing anything.

The most recent clouds ask about:
* 2026 so far
* The year ahead
* Your job
* What you want more of

No feed, no followers, no ads. Free on iPhone and Android.

Honest feedback is appreciated. I'd also love to hear what you'd start a cloud about. The clouds in the gallery are all still open, if you'd like to add your three words: threewordsapp.com/describe/
```

On the day: reply to every comment; don't ask anyone to upvote (Product Hunt penalises it).

## 4. Indie Hackers — Thursday 29 October

A community that rewards honest numbers. Post in the main feed, as yourself.

**Title:**
```
What happened when I asked strangers to describe 2026 in three words
```

**Post** (add the Product Hunt results before posting):
```
I make three·words, a small app where people describe you, or anything, in three words and the answers form a live word cloud.

The app launched in July and growth was slow: about 25 signups in three months. So I tried something that needed no app at all: a public web page asking "Describe 2026 so far in three words." No account, one set of words per person, and the cloud updates live.

What worked
- r/SampleSize, a subreddit for surveys. The first question post brought 20 answers in a day. A results post with the cloud image got 6,200 views and took the cloud from 23 to 40 answers in a couple of days. It's at 59 now, and 18 of them said "expensive".

What didn't
- Turning answers into installs. Across about 80 answers on the web, two people tapped through to an app store. People happily answer a cloud; very few will install an app to start their own.
- Going back to the same well. Each new question post on r/SampleSize did less than the one before; the fourth brought no answers at all.

What I changed
- The app now lets you start a cloud about anything and share the link. People answer from their browser.
- A 30-second video on every page, and now on Product Hunt: [results here]

The question I'm stuck on: if you've had lots of people enjoy the free web part but not install the app, what moved the needle for you?

The live clouds, if you want to add three words: https://threewordsapp.com/describe/
```

## 5. r/SampleSize rhythm

The best channel so far, and it tires: question posts brought 20 answers in the first day, then 8,
then none ("your job", 14 Oct). Results posts did best (6,200 views). On 18 Oct David chose to
fail fast rather than rest the sub for a month, so each post is a quick test with a number to beat.

**Now:** "What do you want more of in your life right now?" (`/describe/more-of/`,
`add-topic-more-of.sql`). One line under the title, to give Reddit's filters as little as possible:

```
[Casual] What do you want more of in your life right now? Answer in three words (Everyone)
```
```
Anonymous, no sign-up: https://threewordsapp.com/describe/more-of/ (My own side project.)
```

**24 hours after it goes up, Claude checks the count** (`select get_topic_stats();`) and calls it:
- 10 or more answers: the sub still works when the question is right. Results post about five
  days later, then a new question each week.
- 3 to 9: one more question a few days later ("Describe a good life in three words"), to tell a
  weak question from a tired sub.
- Under 3: no more question posts here. The account keeps r/SampleSize for results posts (the
  2026 one on 1 Dec).

Always flaired, always the disclosure, never more than one link. No "your job" results post:
there are no answers to report.

## 6. Seasonal clouds and the year-end push

- **Thanksgiving:** "Describe what you're thankful for in three words" (`/describe/thankful/`).
  Claude builds the page and the database line by Fri 13 Nov; it opens Mon 16 Nov.
- **Year-end:** aim the 2026 cloud at a few hundred answers by early December, then pitch "the
  internet's three words for 2026" to writers doing year-in-review pieces, using outlets' public
  tips pages, with the video and the cloud image. Claude drafts the pitch on Tue 1 Dec.

## 7. Measuring it

- Video plays per page: `select get_promo_stats();` (after `add-promo-events.sql` is run).
- Clouds, answers and store taps: `select get_topic_stats();` and `select get_user_topic_stats();`.
- Signups: `select get_growth_stats();`.
