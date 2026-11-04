// Owner tools for a cloud started on the website (/start/). The private key lives in this browser
// (localStorage) or arrives in the private "manage" link (#k=…). It is never part of the link people
// share, and it is wiped from the address bar on arrival so it can't be copied by mistake.
// Everything goes through get_web_topic_owner and manage_web_topic in add-web-clouds.sql.
(() => {
  const SUPABASE_URL = 'https://iyphfzubdebuenbiplzy.supabase.co';
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGhmenViZGVidWVuYmlwbHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDI5NDMsImV4cCI6MjA5ODUxODk0M30.sPUWJJ3-oyjQRTVpGBWBAPnPBG47Ojndu8MC2Ej4FdQ';
  const HEADERS = { apikey: ANON_KEY, authorization: 'Bearer ' + ANON_KEY, 'content-type': 'application/json' };
  const slug = (new URLSearchParams(location.search).get('t') || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  if (!slug) return;

  const hash = new URLSearchParams(location.hash.slice(1));
  const isNew = hash.get('new') === '1';
  const storeKey = 'tw_owner_' + slug;
  let key = hash.get('k');
  try { if (key) localStorage.setItem(storeKey, key); else key = localStorage.getItem(storeKey); } catch {}
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (!key) return;

  async function rpc(fn, args) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: HEADERS, body: JSON.stringify(args) });
      const t = await r.text();
      let j = null; try { j = t ? JSON.parse(t) : null; } catch {}
      return { ok: r.ok, body: j };
    } catch { return { ok: false, body: null }; }
  }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shareUrl = location.origin + '/c/?t=' + slug;
  const manageUrl = shareUrl + '#k=' + key;

  const style = document.createElement('style');
  style.textContent = `
    .owner { text-align:left; }
    .owner .oh { font-family:Georgia,serif; font-size:21px; color:#F2EEE8; margin:0 0 4px; }
    .owner .ot, .owner .ol { color:#C9C4D6; font-size:15px; margin:0 0 10px; }
    .owner p { text-wrap:balance; }
    .owner .ol { color:#A9A3B8; font-size:14px; margin:14px 0 8px; }
    .owner .olink { display:flex; gap:8px; margin:0 0 8px; }
    .owner .olink input { flex:1; min-width:0; margin:0; font-size:14px; }
    .owner .olink button { width:auto; margin:0; padding:10px 16px; font-size:14px; }
    .owner .ostat { color:#8B8698; font-size:13px; margin:10px 0 6px; }
    .owner .tip { color:#A8D8B0; font-size:14px; margin:0 0 8px; }
    .owner .chips { display:flex; flex-wrap:wrap; gap:6px; }
    .owner .chips button { width:auto; margin:0; padding:6px 12px; font-size:14px; font-weight:500;
      background:#1B1827; color:#F2EEE8; border:1px solid #3D3852; border-radius:999px; }
    .owner .chips.hidden button { color:#8B8698; text-decoration:line-through; }
    .owner details { margin-top:8px; }
    .owner summary { color:#F5C95D; font-size:14px; cursor:pointer; }
    .owner .danger { color:#E88C9C !important; border-color:#5A3340 !important; }
    .owner .okeep { margin-top:14px; padding-top:12px; border-top:1px solid #322E44; }
    .owner .okeep p { color:#C9C4D6; font-size:14px; margin:0 0 6px; }
    .owner .okeep em { color:#F5C95D; font-style:italic; }
    .owner .oerr { color:#E88C9C; font-size:13px; margin:8px 0 0; min-height:1em; }`;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'card owner';
  panel.id = 'owner';
  const ask = document.getElementById('ask');
  (ask || document.querySelector('main')).insertAdjacentElement(ask ? 'beforebegin' : 'afterbegin', panel);

  let state = null, words = [], deleteArmed = false;
  const say = (msg) => { const e = document.getElementById('oerr'); if (e) e.textContent = msg; };

  async function load() {
    const [o, c] = await Promise.all([
      rpc('get_web_topic_owner', { p_slug: slug, p_key: key }),
      rpc('get_topic_cloud', { p_slug: slug, p_limit: 300 }),
    ]);
    if (o.ok && !o.body) {           // this browser's key doesn't belong to the cloud (or it was deleted)
      try { localStorage.removeItem(storeKey); } catch {}
      panel.remove();
      return;
    }
    if (!o.ok) { panel.innerHTML = '<p class="oerr">Couldn\'t load your cloud\'s settings. Reload to try again.</p>'; return; }
    state = o.body;
    words = (c.ok && c.body && c.body.words) ? c.body.words.map((x) => x.w) : [];
    render();
  }

  function render() {
    const s = state;
    const closes = new Date(s.closes_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    const status = s.paused ? 'Paused while reports about it are reviewed.'
      : s.expired ? 'Closed automatically 30 days after it started.'
      : s.is_open ? `Open to new words until ${closes}.` : 'Closed to new words.';
    const n = Number(s.total) || 0;
    const hidden = Array.isArray(s.hidden_words) ? s.hidden_words : [];
    const keepsakeDone = (() => { try { return !!localStorage.getItem('tw_keepsake_' + slug); } catch { return false; } })();
    const wasOpen = !!(panel.querySelector('details') || {}).open;   // keep the menu open across redraws
    panel.innerHTML = `
      <p class="oh">${isNew ? 'Your cloud is ready' : 'Your cloud'}</p>
      <p class="ot">Share this link. Everyone who opens it can add three words.</p>
      ${isNew ? '<p class="tip">Send it to the group now: clouds get most of their answers on the first day.</p>' : ''}
      <div class="olink"><input id="ourl" readonly value="${esc(shareUrl)}" aria-label="Link to share" /><button id="ocopy">Copy</button></div>
      ${navigator.share ? '<button class="ghost small" id="oshare">Share…</button>' : ''}
      <p class="ostat">${n} ${n === 1 ? 'answer' : 'answers'} · ${status}</p>
      ${s.paused || s.expired ? '' : `<button class="ghost small" id="oopen">${s.is_open ? 'Close to new words' : 'Reopen'}</button>`}
      <details>
        <summary>Hide words, private link, delete</summary>
        <p class="ol">${words.length ? 'Tap a word to hide it from the cloud.' : 'Words will appear here as people answer. You can hide any of them.'}</p>
        <div class="chips" id="owords">${words.map((w) => `<button data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>
        ${hidden.length ? `<p class="ol">Hidden (tap to show again)</p><div class="chips hidden" id="ohidden">${hidden.map((w) => `<button data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div>` : ''}
        <p class="ol">Your private link manages this cloud from another device. Keep it to yourself: anyone with it can change or delete the cloud.</p>
        <button class="ghost small" id="okey">Copy private link</button>
        ${s.paused ? '' : '<button class="ghost small danger" id="odel">Delete this cloud</button>'}
      </details>
      <div class="okeep">
        <p>Want a printed keepsake of this cloud? <em>Coming soon.</em></p>
        ${keepsakeDone ? '<p>Thanks, noted. We\'ll build it if enough people want one.</p>' : '<button class="ghost small" id="okeepb">I\'d want one</button>'}
      </div>
      <p class="oerr" id="oerr"></p>`;
    if (wasOpen) panel.querySelector('details').open = true;
    wire();
  }

  const copy = async (text, btn, done) => {
    try { await navigator.clipboard.writeText(text); btn.textContent = done; }
    catch { const i = document.getElementById('ourl'); if (i) { i.focus(); i.select(); } btn.textContent = 'Select and copy'; }
    setTimeout(() => { if (btn.isConnected) btn.textContent = btn.id === 'okey' ? 'Copy private link' : 'Copy'; }, 2000);
  };
  async function act(action, word) {
    say('');
    const { ok, body } = await rpc('manage_web_topic', { p_slug: slug, p_key: key, p_action: action, p_word: word || null });
    if (!ok) {
      const m = (body && body.message) || '';
      say(m.includes('under_review') ? 'This cloud is paused while reports are reviewed.' :
          m.includes('expired') ? 'Clouds close for good 30 days after they start.' :
          "That didn't work. Try again in a moment.");
      return false;
    }
    return true;
  }

  function wire() {
    const $ = (id) => document.getElementById(id);
    $('ocopy').addEventListener('click', (e) => copy(shareUrl, e.currentTarget, 'Copied'));
    if ($('oshare')) $('oshare').addEventListener('click', () =>
      navigator.share({ title: `Describe ${state.title} in three words`, url: shareUrl }).catch(() => {}));
    if ($('oopen')) $('oopen').addEventListener('click', async () => { if (await act(state.is_open ? 'close' : 'open')) load(); });
    panel.querySelectorAll('#owords button').forEach((b) => b.addEventListener('click', async () => {
      if (await act('hide', b.dataset.w)) load();
    }));
    panel.querySelectorAll('#ohidden button').forEach((b) => b.addEventListener('click', async () => {
      if (await act('unhide', b.dataset.w)) load();
    }));
    $('okey').addEventListener('click', (e) => copy(manageUrl, e.currentTarget, 'Copied. Keep it private'));
    if ($('odel')) $('odel').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      if (!deleteArmed) {
        deleteArmed = true; b.textContent = 'Tap again to delete it for good';
        setTimeout(() => { deleteArmed = false; if (b.isConnected) b.textContent = 'Delete this cloud'; }, 5000);
        return;
      }
      if (await act('delete')) {
        try { localStorage.removeItem(storeKey); } catch {}
        panel.innerHTML = '<p class="oh">Deleted</p><p class="ot">The cloud and every answer in it are gone.</p>';
        setTimeout(() => { location.href = '/start/'; }, 1800);
      }
    });
    if ($('okeepb')) $('okeepb').addEventListener('click', async () => {
      await rpc('track_topic_click', { p_slug: slug, p_target: 'keepsake' });
      try { localStorage.setItem('tw_keepsake_' + slug, '1'); } catch {}
      render();
    });
  }

  load();
})();
