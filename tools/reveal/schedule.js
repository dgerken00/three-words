// Timing shared by reveal.html (the picture) and music.mjs (the sound), so the soft pops in
// the music land exactly when the words appear. Times are in beats from the start of the
// clip: 96 BPM, one beat = 0.625 s, and the 15-second clip is 24 beats.
(function (w) {
  const BPM = 96, BEAT = 60 / BPM;
  const T = {
    BPM, BEAT, SECONDS: 15,
    mark: 0, label: 0, question: 0.4,   // the question is up within the first second
    stage: 2.4,                         // the empty cloud and its counter
    words: [4, 15],                     // answers land between 2.5 s and 9.4 s
    most: 16,                           // "Most said …" at 10 s
    cta: 20,                            // "Add your three words" at 12.5 s, held to the end
    MAX_WORDS: 30,
  };

  // A well-mixed string hash: the order looks random but is the same on every run.
  const mix = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  };

  // The most-said words of one cloud (data.js), as [{ w, c }], most-said first.
  const wordsOf = (slug) => w.REVEAL.clouds[slug].words.slice(0, T.MAX_WORDS).map(([word, c]) => ({ w: word, c }));

  // When each answer lands. Every word first appears once, in a shuffled order with the
  // most-said word first, over the first part of the window; the repeat answers that make
  // popular words grow are spread over the rest. Returns { hits: { word: [beats…] },
  // firsts: [beats…] } where firsts are the moments new words appear, in order.
  function schedule(words, b0 = T.words[0], b1 = T.words[1], frac = 0.55) {
    const top = words.length ? words[0].w : null;
    const order = words.slice().sort((a, b) => mix(a.w) - mix(b.w));
    const i = order.findIndex((x) => x.w === top);
    if (i > 0) order.unshift(order.splice(i, 1)[0]);
    const hits = {};
    order.forEach((x, k) => { hits[x.w] = [b0 + (b1 - b0) * frac * (k / Math.max(1, order.length - 1))]; });
    const extras = [];
    for (const x of order) for (let k = 1; k < x.c; k++) extras.push({ w: x.w, k, n: x.c });
    extras.sort((a, b) => a.k / a.n - b.k / b.n || mix(a.w + a.k) - mix(b.w + b.k));
    const e0 = b0 + (b1 - b0) * 0.25;
    extras.forEach((e, k) => hits[e.w].push(e0 + (b1 - e0) * (extras.length > 1 ? k / (extras.length - 1) : 1)));
    for (const word in hits) hits[word].sort((a, b) => a - b);
    const firsts = Object.values(hits).map((h) => h[0]).sort((a, b) => a - b);
    return { hits, firsts };
  }

  w.REVEAL_T = { T, mix, wordsOf, schedule };
})(window);
