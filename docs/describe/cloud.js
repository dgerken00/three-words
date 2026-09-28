// Public topic clouds — shared logic for /describe/ pages.
// Reads the topic from <main data-topic="…"> (a dedicated page like /describe/2026/)
// or from ?t=… (the generic /describe/ page). Everything goes through the RPCs in
// add-topic-clouds.sql; nothing here can read individual submissions.
(() => {
  const SUPABASE_URL = 'https://iyphfzubdebuenbiplzy.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGhmenViZGVidWVuYmlwbHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDI5NDMsImV4cCI6MjA5ODUxODk0M30.sPUWJJ3-oyjQRTVpGBWBAPnPBG47Ojndu8MC2Ej4FdQ';
  const HEADERS = { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY, 'content-type': 'application/json' };

  const $ = (id) => document.getElementById(id);
  const main = document.querySelector('main');
  const slug = ((main && main.dataset.topic) || new URLSearchParams(location.search).get('t') || '')
    .toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);

  // Never throws: a dropped connection comes back as { ok: false } so buttons always recover.
  async function rpc(fn, args, opts) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify(args || {}), ...(opts || {}),
      });
      const t = await r.text();
      let j = null; try { j = t ? JSON.parse(t) : null; } catch {}
      return { ok: r.ok, status: r.status, body: j };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // The generic /describe/ page carries both layouts; show the one that applies.
  document.querySelectorAll('[data-when]').forEach((n) => { n.hidden = n.dataset.when !== (slug ? 'topic' : 'hub'); });

  // ---------- hub (no topic chosen) ----------
  if (!slug) {
    const hub = $('hub'); if (!hub) return;
    (async () => {
      const { ok, body } = await rpc('list_topics');
      if (!ok || !Array.isArray(body) || !body.length) {
        hub.innerHTML = '<p class="whisper">No clouds are open right now.</p>';
        return;
      }
      hub.innerHTML = body.map((t) => {
        const n = Number(t.total) || 0;
        return `<a class="topic" href="/describe/?t=${encodeURIComponent(t.slug)}">
          <span class="tprompt">${esc(t.prompt)}</span>
          <span class="tcount">${n} ${n === 1 ? 'answer' : 'answers'} →</span></a>`;
      }).join('');
    })();
    return;
  }

  // ---------- topic page ----------
  const PALETTE = ['#F5C95D', '#E88C9C', '#8FB8C9', '#C9A6E8', '#A8D8B0'];
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  const BLOCKED = /(fuck|nigg|cunt|faggot|bitch|whore|slut|retard|shit|asshole|dickhead)/i;

  // A random per-browser token: sha256'd server-side, it's what makes "one set of
  // words per person" work without an account. Clearing site data resets it.
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };
  let token = store.get('tw_voter');
  if (!token || token.length < 16) {
    token = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''))
      + '-' + Date.now().toString(36);
    store.set('tw_voter', token);
  }
  const mineKey = 'tw_mine_' + slug;

  const el = {
    title: document.querySelectorAll('.tname'), h1: $('h1title'), ask: $('ask'), mine: $('mine'),
    mywords: $('mywords'), send: $('send'), change: $('change'), err: $('err'),
    total: $('total'), totallabel: $('totallabel'), cloud: $('cloud'), empty: $('empty'),
    most: $('most'), share: $('share'), closed: $('closed'), live: $('live'),
  };

  let shown = new Set();      // words currently in the cloud, to animate newcomers
  let lastTotal = -1;
  let lastData = null;        // kept so the cloud can re-fit when the window is resized
  let topicTitle = '';

  // Type scale that follows both the stage width and how full the cloud is: a handful of
  // answers render large and confident, hundreds settle into a few giants over a haze.
  function sizer(n, max) {
    const box = el.cloud.parentElement;
    const W = Math.max(240, ((box && box.clientWidth) || 480) - 40);
    const biggest = Math.max(34, Math.min(120, W / 7.5));
    const crowd = Math.sqrt(Math.max(n, 6) / 6);           // 1 for ≤6 words, grows as the cloud fills
    const floor = Math.max(15, (biggest * 0.7) / crowd);
    return (x) => {
      // with no repeats yet every word is equal; keep them mid-scale, easing down as words pile up
      const t = max === 1 ? 0.5 / crowd : (x.c - 1) / (max - 1);
      const fit = W / (0.6 * x.w.length);                   // a long word can't spill past the edge
      return { t, size: Math.round(Math.min(floor + t * (biggest - floor), fit)) };
    };
  }

  function setTitle(t) {
    topicTitle = t;
    el.title.forEach((n) => { n.textContent = t; });
    if (el.h1 && el.h1.dataset.generic === '1') el.h1.innerHTML = `Describe <em>${esc(t)}</em> in three words`;
    if (el.h1 && el.h1.dataset.generic === '1') document.title = `Describe ${t} in three words — a live word cloud`;
  }

  function render(data) {
    lastData = data;
    const words = Array.isArray(data.words) ? data.words : [];
    const total = Number(data.total) || 0;
    if (el.total) el.total.textContent = total.toLocaleString();
    if (el.totallabel) el.totallabel.textContent = total === 1 ? 'person has answered' : 'people have answered';
    if (el.empty) el.empty.style.display = words.length ? 'none' : 'block';
    if (el.share) el.share.style.display = words.length ? '' : 'none';

    // Place words in a stable pseudo-random order (not biggest-first) so it reads as a cloud, not a ranking.
    const max = words.reduce((m, x) => Math.max(m, x.c), 1);
    const placed = words.slice().sort((a, b) => hash(a.w) - hash(b.w));
    const next = new Set(placed.map((x) => x.w));
    const firstPaint = shown.size === 0;
    const sizeOf = sizer(placed.length, max);
    let lastColor = -1;
    el.cloud.innerHTML = placed.map((x) => {
      const { t, size } = sizeOf(x);
      // A word's colour comes from its hash, nudged along the palette so neighbours never match.
      let ci = hash(x.w) % PALETTE.length;
      if (ci === lastColor) ci = (ci + 1 + (hash(x.w) % (PALETTE.length - 1))) % PALETTE.length;
      lastColor = ci;
      const color = PALETTE[ci];
      const tilt = ((hash(x.w) % 7) - 3) * 1.2;
      const fresh = !firstPaint && !shown.has(x.w) ? ' fresh' : '';
      return `<span class="w${fresh}" style="font-size:${size}px;color:${color};font-weight:${t > 0.55 ? 600 : 400};transform:rotate(${tilt}deg)">${esc(x.w)}${x.c > 1 ? `<span class="n">${x.c}</span>` : ''}</span>`;
    }).join('');
    shown = next;

    if (el.most) {
      const top = words.filter((x) => x.c > 1).sort((a, b) => b.c - a.c).slice(0, 3);
      el.most.textContent = top.length
        ? 'Most said: ' + top.map((x) => `${x.w} (${x.c})`).join(' · ')
        : '';
    }
    if (lastTotal >= 0 && total > lastTotal && el.live) {
      el.live.classList.add('ping'); setTimeout(() => el.live.classList.remove('ping'), 900);
    }
    lastTotal = total;
  }

  function setClosed(msg) {
    if (el.ask) el.ask.style.display = 'none';
    if (el.mine) el.mine.style.display = 'none';
    if (el.closed) { el.closed.textContent = msg; el.closed.style.display = 'block'; }
  }
  // undo setClosed once the topic is reachable and open (e.g. after a transient error)
  function setOpen() {
    if (el.closed) el.closed.style.display = 'none';
    const haveMine = !!store.get(mineKey);
    if (el.mine) el.mine.style.display = haveMine ? 'block' : 'none';
    // '' rather than 'block': the stylesheet decides whether the ask is a card or a one-row grid
    if (el.ask) el.ask.style.display = haveMine ? 'none' : '';
  }

  let pollTimer = null, failures = 0;
  async function refresh() {
    const { ok, body } = await rpc('get_topic_cloud', { p_slug: slug });
    if (!ok || !body) {
      failures++;
      if (failures === 1) setClosed("This cloud isn't open yet — check back soon.");
      return;
    }
    failures = 0;
    if (body.title && body.title !== topicTitle) setTitle(body.title);
    if (!body.is_open) setClosed('This cloud is closed to new words, but here is how it ended up.');
    else setOpen();
    render(body);
  }
  function schedule() {
    clearTimeout(pollTimer);
    // 4s while visible, slower after errors; paused entirely in background tabs
    const delay = document.visibilityState === 'visible' ? Math.min(4000 * (1 + failures), 30000) : 60000;
    pollTimer = setTimeout(async () => { await refresh(); schedule(); }, delay);
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh(); } schedule(); });
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (lastData) render(lastData); }, 150);
  });

  // ---------- my words ----------
  function showMine(words) {
    if (!el.mine) return;
    el.mywords.textContent = words.join(' · ');
    el.mine.style.display = 'block';
    if (el.ask) el.ask.style.display = 'none';
  }
  const mineRaw = store.get(mineKey);
  if (mineRaw) { try { const m = JSON.parse(mineRaw); if (Array.isArray(m) && m.length === 3) showMine(m); } catch {} }

  if (el.change) el.change.addEventListener('click', () => {
    el.mine.style.display = 'none'; el.ask.style.display = '';
    try { const m = JSON.parse(store.get(mineKey)); ['w1', 'w2', 'w3'].forEach((id, i) => { $(id).value = m[i] || ''; }); } catch {}
    $('w1').focus();
  });

  if (el.send) el.send.addEventListener('click', async () => {
    const words = ['w1', 'w2', 'w3'].map((id) => $(id).value.trim().toLowerCase());
    el.err.textContent = '';
    if (words.some((w) => !w)) { el.err.textContent = 'All three words are needed.'; return; }
    if (words.some((w) => /\s/.test(w))) { el.err.textContent = 'One word each — no spaces.'; return; }
    if (words.some((w) => !/^[a-z'-]{1,20}$/.test(w) || !/[a-z]/.test(w))) { el.err.textContent = 'Letters only, up to 20 per word.'; return; }
    if (new Set(words).size < 3) { el.err.textContent = 'Three different words, please.'; return; }
    if (words.some((w) => BLOCKED.test(w))) { el.err.textContent = "Let's keep it kind — try different words."; return; }
    el.send.disabled = true; el.send.textContent = 'Adding…';
    const { ok, body } = await rpc('submit_topic_words', { p_slug: slug, p_words: words, p_token: token });
    el.send.disabled = false; el.send.textContent = 'Add my three words';
    if (!ok) {
      const msg = (body && body.message) || '';
      el.err.textContent =
        msg.includes('rate_limited') ? 'This cloud is getting a lot of words right now — try again in a bit.' :
        msg.includes('blocked_word') ? "Let's keep it kind — try different words." :
        msg.includes('topic_closed') ? 'This cloud is closed to new words.' :
        msg.includes('need_three_different_words') ? 'Those words are too similar once simplified — try three that are more different.' :
        msg.includes('bad_word_length') ? 'Each word should be a single word, 1–20 letters.' :
        "Couldn't add your words. Try again in a moment.";
      return;
    }
    store.set(mineKey, JSON.stringify(words));
    showMine(words);
    refresh();
  });
  ['w1', 'w2', 'w3'].forEach((id, i) => {
    const n = $(id); if (!n) return;
    n.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (i < 2) $(['w1', 'w2', 'w3'][i + 1]).focus(); else el.send.click();
    });
  });

  // ---------- share + store taps (the number this page exists to move) ----------
  function track(target) {
    // keepalive so the beacon survives the navigation to the store
    rpc('track_topic_click', { p_slug: slug, p_target: target }, { keepalive: true }).catch(() => {});
  }
  document.querySelectorAll('[data-track]').forEach((a) => a.addEventListener('click', () => track(a.dataset.track)));
  if (el.share) el.share.addEventListener('click', async () => {
    const url = location.origin + location.pathname + (main && main.dataset.topic ? '' : `?t=${slug}`);
    const text = `Describe ${topicTitle || slug} in three words — a live word cloud`;
    track('share');
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
      await navigator.clipboard.writeText(url);
      const old = el.share.textContent; el.share.textContent = 'Link copied ✓';
      setTimeout(() => { el.share.textContent = old; }, 1600);
    } catch {}
  });

  refresh().then(schedule);
})();
