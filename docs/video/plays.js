// Counts plays of the promo video, per page: one "play" when someone starts it and one
// "finish" when it runs to the end. Counts only — nothing about the viewer is sent.
// Totals: select get_promo_stats(); in Supabase (see add-promo-events.sql).
(() => {
  const RPC = 'https://iyphfzubdebuenbiplzy.supabase.co/rest/v1/rpc/track_promo_event';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5cGhmenViZGVidWVuYmlwbHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NDI5NDMsImV4cCI6MjA5ODUxODk0M30.sPUWJJ3-oyjQRTVpGBWBAPnPBG47Ojndu8MC2Ej4FdQ';
  const path = location.pathname.replace(/^\/+|\/+$/g, '');
  // "home" for the landing page; clouds that app users start (/c/?t=…) are counted together,
  // never by their private link
  const page = path === '' ? 'home' : path === 'c' ? 'c' : path;

  const send = (event) => {
    try {
      fetch(RPC, {
        method: 'POST', keepalive: true,
        headers: { apikey: KEY, authorization: 'Bearer ' + KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ p_event: event, p_page: page }),
      }).catch(() => {});
    } catch {}
  };
  const hook = (video) => {
    if (video.dataset.counted) return;
    video.dataset.counted = '1';
    let played = false, finished = false;      // once per page view: replays aren't new viewers
    video.addEventListener('play', () => { if (!played) { played = true; send('video_play'); } });
    video.addEventListener('ended', () => { if (!finished) { finished = true; send('video_end'); } });
  };
  const scan = () => document.querySelectorAll('video').forEach(hook);
  scan();
  // cloud pages add their video after the page loads
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();
