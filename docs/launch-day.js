// Product Hunt launch day, Sun 25 Oct 2026 (Pacific time): the landing page and the official
// cloud pages show the Product Hunt badge, that day only. On every other day this does nothing,
// so no request goes to Product Hunt. ?launchday=1 shows it on any day, to check the layout.
// A user's own cloud (/c/) doesn't load this file: it isn't our page to advertise on.
(() => {
  const now = Date.now();
  const today = now >= Date.parse('2026-10-25T00:00:00-07:00') && now < Date.parse('2026-10-26T00:00:00-07:00');
  if (!today && !new URLSearchParams(location.search).has('launchday')) return;

  const style = document.createElement('style');
  style.textContent = '.phday { text-align:center; margin:0 auto 26px; max-width:440px; }' +
    '.phday p { margin:0 0 10px; font-size:14px; color:#A9A3B8; }' +
    '.phday img { display:inline-block; vertical-align:middle; }';
  document.head.appendChild(style);

  // ask for comments, never for upvotes (Product Hunt's one firm rule)
  const box = document.createElement('div');
  box.className = 'phday';
  box.innerHTML = "<p>three·words is on Product Hunt today. Come tell us what you'd start a cloud about:</p>" +
    '<a href="https://www.producthunt.com/products/three-words?embed=true&amp;utm_source=badge-featured&amp;utm_medium=badge&amp;utm_campaign=badge-three-words" target="_blank" rel="noopener noreferrer">' +
    '<img alt="three·words - Word clouds on you or anything, three words at a time | Product Hunt" width="250" height="54" ' +
    'src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1285547&amp;theme=light&amp;t=1792429897084"></a>';

  // cloud pages: just above the "Want a cloud of your own?" card; landing page: under the intro
  const cta = document.querySelector('.card.cta');
  if (cta) cta.insertAdjacentElement('beforebegin', box);
  else (document.querySelector('main .sub') || document.querySelector('main')).insertAdjacentElement('afterend', box);
})();
