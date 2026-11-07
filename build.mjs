// Generates the static site into docs/ from data/games.json. No dependencies: `node build.mjs`.
// media/, assets/fonts/, assets/brand/ and app-ads.txt live in docs/ and are left alone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'docs');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { site, games } = JSON.parse(read('data/games.json'));
const media = JSON.parse(read('data/media.json'));
const logo = JSON.parse(read('data/logo-paths.json'));
const POLICY_DATE = '7 November 2026';
const ASSET_V = Date.now().toString(36);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const live = games.filter((g) => g.status === 'live');
const play = (g) => `https://play.google.com/store/apps/details?id=${g.pkg}`;
const hasLoop = (g) => fs.existsSync(path.join(OUT, 'media', g.slug, 'loop.mp4'));
const isWide = (g) => media[g.slug].w > media[g.slug].h;
const monthYear = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const year = (g) => (g.released ? g.released.slice(0, 4) : null);
const kFloor = (n) => `${Math.floor(n / 10000) * 10}K+`;
const totalInstalls = games.reduce((n, g) => n + g.installs, 0);
const totalLabel = totalInstalls >= 1e6 ? `${Math.floor(totalInstalls / 1e6)}M+` : `${Math.floor(totalInstalls / 1e3)}K+`;
const released2026 = live.filter((g) => year(g) === '2026').length;

function inkOn(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (1.05) / (L + 0.05) >= 4.5 ? '#fff' : '#061543';
}

// The VB logo. Traced from the studio's logo; the two domes are drawn so they can be pressed.
function dome(cls, cx, cy, ry, h, top, side, id) {
  const rx = 90;
  return `<g class="dome ${cls}" clip-path="url(#${id})">
    <ellipse cx="${cx}" cy="${cy + h + 7}" rx="${rx + 1}" ry="${ry}" fill="#46506f"/>
    <g class="dome-cap">
      <path fill="${side}" d="M${cx - rx} ${cy}v${h}a${rx} ${ry} 0 0 0 ${rx * 2} 0v-${h}z"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${top}"/>
      <ellipse cx="${cx - 18}" cy="${cy - 31}" rx="31" ry="9" fill="#fff" opacity=".92" transform="rotate(-8 ${cx - 18} ${cy - 31})"/>
    </g>
  </g>`;
}
function clip(id, cx, cy, ry, h) {
  const rx = 92;
  return `<clipPath id="${id}"><path d="M${cx - rx} ${cy - ry - 8}h${rx * 2}v${ry + 8 + h + 7}a${rx} ${ry} 0 0 1 ${-rx * 2} 0z"/></clipPath>`;
}
let vbId = 0;
const vb = (label = '') => {
  const n = ++vbId;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg viewBox="0 0 839 601" ${a11y}>
  <defs>${clip(`cr${n}`, 573.5, 179, 51, 44)}${clip(`cy${n}`, 582.5, 415, 52, 46)}</defs>
  <g transform="scale(.33333)"><path fill="#fff" d="${logo.outer}"/><path fill="#061543" d="${logo.body}"/></g>
  ${dome('dome-red', 573.5, 179, 51, 44, '#e20012', '#aa0012', `cr${n}`)}
  ${dome('dome-yolk', 582.5, 415, 52, 46, '#fee413', '#eeab00', `cy${n}`)}
</svg>`;
};

// What we make, for the band under the hero. Words only: no counts.
const CATEGORIES = ['Color sorts', 'Logic puzzles', 'Word games', 'Block puzzles', 'Physics smash', 'Castle battles', 'Traffic puzzles', 'Racing', 'Truck driving'];

const icon = (g, cls = '') => `<span class="sticker ${cls}" style="display:block"><img src="/media/${g.slug}/icon.webp" width="384" height="384" alt="" loading="lazy" decoding="async"></span>`;

function tile(g, i, { more = false } = {}) {
  const sizes = more ? '(max-width: 560px) 46vw, (max-width: 1000px) 46vw, 290px' : '(max-width: 560px) 92vw, (max-width: 1000px) 46vw, 390px';
  const flag = g.status === 'soon' ? '<span class="tile-flag is-soon">Coming soon</span>' : '';
  return `<li class="tile" data-genre="${g.genre}">
    <a href="/games/${g.slug}/">
      <span class="tile-art">
        <img src="/media/${g.slug}/header-640.webp" srcset="/media/${g.slug}/header-640.webp 640w, /media/${g.slug}/header.webp 1024w" sizes="${sizes}" width="640" height="313" alt="" loading="${i < 3 && !more ? 'eager' : 'lazy'}" decoding="async">
        ${icon(g, 'tile-icon')}
        ${flag}
      </span>
      <span class="tile-kind">${esc(g.kind)}${g.released ? ` · ${monthYear(g.released)}` : ''}</span>
      <h3>${esc(g.title)}</h3>
      <p>${esc(g.tagline)}</p>
    </a>
  </li>`;
}

const header = (current = '') => {
  const link = (href, label, key) => `<a href="${href}"${current === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<a class="skip" href="#main">Skip to content</a>
<header class="top"><div class="wrap top-in">
  <a class="brand" href="/" aria-label="VeganBeef home">${vb('')}<span>VeganBeef</span></a>
  <nav class="nav" aria-label="Main">${link('/#games', 'Games', 'games')}${link('/#studio', 'Studio', 'studio')}${link('/support/', 'Support', 'support')}${link('/privacy/', 'Privacy', 'privacy')}</nav>
  <a class="btn btn-sm" href="${site.playDeveloper}">Google Play</a>
</div></header>`;
};

const footer = () => `<footer class="foot"><div class="wrap foot-in">
  <div class="foot-top">
    <a class="brand" href="/" aria-label="VeganBeef home">${vb('')}<span style="color:#fff">VeganBeef</span></a>
    <nav aria-label="Footer"><a href="/#games">Games</a><a href="/support/">Support</a><a href="/privacy/">Privacy policy</a><a href="${site.playDeveloper}">Google Play</a><a href="${site.youtube}">YouTube</a></nav>
  </div>
  <small>© ${new Date().getFullYear()} VeganBeef, ${esc(site.city)}. Google Play and the Google Play logo are trademarks of Google LLC.</small>
</div></footer>`;

function page({ urlPath, title, desc, og = '/assets/brand/og.jpg', body, current, jsonld, robots }) {
  const url = site.url + urlPath;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots ? `<meta name="robots" content="${robots}">` : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#061543">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VeganBeef">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${site.url}${og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/brand/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/bowlby-one.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${ASSET_V}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
${header(current)}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/site.js?v=${ASSET_V}" defer></script>
</body>
</html>
`;
}

function write(rel, html) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
}

// Sticker positions on the hero board: x, y, rotation, size, all in percent of the board.
const SLOTS = [
  [14, 13, -8, 21], [37, 9, 6, 17], [60, 12, -5, 21], [84, 12, 9, 19],
  [8, 37, 7, 16], [92, 33, -7, 16], [9, 62, -6, 18], [91, 58, 6, 18],
  [15, 86, 7, 20], [38, 90, -5, 18], [61, 87, 6, 21], [85, 84, -8, 19],
  [29, 28, 11, 14], [72, 30, -9, 14], [50, 75, -6, 15],
];

function home() {
  const rocket = games.find((g) => g.slug === 'rocket-kingdoms');
  const stickers = games.map((g, i) => {
    const [x, y, r, s] = SLOTS[i % SLOTS.length];
    return `<a class="board-sticker sticker" href="/games/${g.slug}/" data-title="${esc(g.title)}"${g.status === 'soon' ? ' data-soon="1"' : ''} style="--x:${x};--y:${y};--r:${r};--s:${s};--i:${i};--z:${(i % 4) + 1}" aria-label="${esc(g.title)}"><img src="/media/${g.slug}/icon.webp" width="384" height="384" alt="" decoding="async"></a>`;
  }).join('\n      ');

  const groups = [
    ['2026', live.filter((g) => year(g) === '2026').concat(games.filter((g) => g.status === 'soon')), 'Puzzles of every kind, and a castle war'],
    ['2023', live.filter((g) => year(g) === '2023'), 'Heavy trucks, offroad'],
    ['2022', live.filter((g) => year(g) === '2022'), 'Where it started: racing'],
  ];
  const years = groups.map(([y, list, note]) => `<div class="year"><div><b>${y}</b><small>${note}</small></div><div class="year-icons">${list.map((g) => `<a href="/games/${g.slug}/" aria-label="${esc(g.title)}" title="${esc(g.title)}">${icon(g)}</a>`).join('')}</div></div>`).join('\n');

  const body = `<section class="hero mat on-ink">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <p class="eyebrow">Mobile games from ${esc(site.city)}</p>
      <h1 aria-label="No beef. Just games."><span class="die die-1" data-t="NO BEEF." aria-hidden="true">NO BEEF.</span><span class="die die-2" data-t="JUST" aria-hidden="true">JUST</span><span class="die die-3" data-t="GAMES." aria-hidden="true">GAMES.</span></h1>
      <p class="hero-lead">Lots of games in lots of flavors: color sorts, logic and word puzzles, physics smashers, castle battles, racing and driving. All free to play on Google Play.</p>
      <div class="hero-cta"><a class="btn" href="#games">See the games</a><a class="btn btn-white" href="${site.playDeveloper}">Open Google Play</a></div>
      <p class="hero-hint" aria-live="polite">Our logo has two buttons. <b class="red">Red</b> shuffles the stickers. <b>Yellow</b> picks your next game.</p>
    </div>
    <div class="board">
      ${stickers}
      <div class="vb-wrap">
        ${vb('VeganBeef logo')}
        <button class="press press-red" type="button" aria-label="Shuffle the stickers"></button>
        <button class="press press-yolk" type="button" aria-label="Pick a game for me"></button>
      </div>
    </div>
  </div>
</section>
<section class="cats" aria-label="What we make"><div class="wrap"><ul>
  ${CATEGORIES.map((c) => `<li>${c}</li>`).join('')}
</ul></div></section>
<section class="sec" id="games"><div class="wrap">
  <div class="sec-head">
    <h2>Our games</h2>
    <div class="chips" role="group" aria-label="Filter games by type">
      <button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>
      <button class="chip" type="button" data-filter="puzzle" aria-pressed="false">Puzzle</button>
      <button class="chip" type="button" data-filter="action" aria-pressed="false">Action</button>
      <button class="chip" type="button" data-filter="racing" aria-pressed="false">Racing and driving</button>
    </div>
  </div>
  <ul class="tiles" id="game-list">
    ${games.map((g, i) => tile(g, i)).join('\n    ')}
  </ul>
</div></section>
<section class="sec spot mat on-ink"><div class="wrap spot-grid">
  <div class="frame">
    <video src="/media/${rocket.slug}/loop.mp4" poster="/media/${rocket.slug}/poster.webp" autoplay muted loop playsinline preload="metadata" width="768" height="432" aria-label="Rocket Kingdoms gameplay"></video>
    <a class="play" href="https://www.youtube.com/watch?v=${rocket.youtube}" data-yt="${rocket.youtube}" data-title="Rocket Kingdoms trailer" aria-label="Play the Rocket Kingdoms trailer with sound"><span></span></a>
  </div>
  <div class="spot-copy">
    <p class="eyebrow">The loud one</p>
    <h2>${esc(rocket.title)}</h2>
    <p>${esc(rocket.intro)}</p>
    <ul>
      <li>Heroes with weapons of their own, from bee hives to frost stones</li>
      <li>Build your fortress from timber to stone and iron</li>
      <li>Climb the leagues and beat each king at his own gate</li>
    </ul>
    <div class="hero-cta" style="margin-top:8px"><a class="btn btn-red" href="/games/${rocket.slug}/">See the game</a><a class="btn btn-white" href="${play(rocket)}">Get it on Google Play</a></div>
  </div>
</div></section>
<section class="sec" id="studio"><div class="wrap studio-grid">
  <div class="studio-copy">
    <h2>Yes, the name is a contradiction.</h2>
    <p>So is a relaxing game about firing cannons at jam jars.</p>
    <p>VeganBeef is a mobile game studio in ${esc(site.city)}. We make games you can pick up for a few minutes and put down happy: short levels, bright art and something satisfying happening all the time.</p>
    <p>We started with racing and driving games. Today we make puzzles of every kind, word games and action games too, and there is always another one on the way.</p>
  </div>
  <div class="years">${years}</div>
</div></section>
<section class="hello" id="contact"><div class="wrap hello-grid">
  <div>
    <h2>Say hello</h2>
    <p>Stuck on a level, found a bug or want to work together? Write to us.</p>
  </div>
  <div style="display:grid;gap:12px;justify-items:start">
    <a class="mail" href="mailto:${site.email}">${site.email}</a>
    <a class="btn btn-sm btn-red" href="/support/">Player support</a>
  </div>
</div></section>`;

  return page({
    urlPath: '/',
    title: 'VeganBeef Games',
    desc: `VeganBeef is a mobile game studio in ${site.city}, making free-to-play puzzle, word, action, racing and driving games for Android.`,
    body,
    jsonld: { '@context': 'https://schema.org', '@type': 'Organization', name: 'VeganBeef', url: site.url + '/', logo: site.url + '/assets/brand/apple-touch-icon.png', email: site.email, address: { '@type': 'PostalAddress', addressLocality: 'Islamabad', addressCountry: 'PK' }, sameAs: [site.playDeveloper, site.youtube] },
  });
}

function gamePage(g) {
  const m = media[g.slug];
  const wide = isWide(g);
  const shots = Array.from({ length: m.shots }, (_, i) => i + 1);
  const video = hasLoop(g)
    ? `<video src="/media/${g.slug}/loop.mp4" poster="/media/${g.slug}/poster.webp" autoplay muted loop playsinline preload="metadata" aria-label="${esc(g.title)} gameplay"></video>`
    : `<img src="/media/${g.slug}/shot1.webp" width="${m.w}" height="${m.h}" alt="${esc(g.title)} screenshot">`;
  const trailer = g.youtube ? `<a class="play" href="https://www.youtube.com/watch?v=${g.youtube}" data-yt="${g.youtube}" data-title="${esc(g.title)} trailer" aria-label="Play the ${esc(g.title)} trailer with sound"><span></span></a><span class="play-label">Watch with sound</span>` : '';
  const cta = g.status === 'live'
    ? `<a class="badge" href="${play(g)}"><img src="/assets/brand/google-play-badge.png" width="646" height="250" alt="Get it on Google Play"></a>`
    : '<span class="soon">Coming soon to Google Play</span>';
  const facts = [g.released ? `Released ${monthYear(g.released)}` : null, 'Android', 'Free to play'].filter(Boolean);
  const others = games.filter((o) => o.slug !== g.slug);
  const related = [...others.filter((o) => o.genre === g.genre), ...others.filter((o) => o.genre !== g.genre)].slice(0, 4);

  const body = `<section class="ghero" style="--g:${g.accent};--g-ink:${inkOn(g.accent)}">
  <div class="wrap ghero-grid${wide ? ' is-wide' : ''}">
    <div class="ghero-copy">
      <a class="back" href="/#games">← All games</a>
      <span class="sticker" style="display:block"><img src="/media/${g.slug}/icon.webp" width="384" height="384" alt="${esc(g.title)} icon"></span>
      <p class="eyebrow">${esc(g.kind)}</p>
      <h1>${esc(g.title)}</h1>
      <p class="lead">${esc(g.tagline)}</p>
      ${cta}
      <ul class="facts">${facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
    </div>
    <div class="ghero-media"><div class="device${wide ? ' is-wide' : ''}">${video}${trailer}</div></div>
  </div>
</section>
<section class="rail-sec" aria-label="Screenshots"><div class="wrap">
  <ul class="rail${wide ? ' is-wide' : ''}">
    ${shots.map((n) => `<li><a href="/media/${g.slug}/shot${n}.webp"><img src="/media/${g.slug}/shot${n}.webp" width="${m.w}" height="${m.h}" alt="${esc(g.title)} screenshot ${n}" loading="lazy" decoding="async"></a></li>`).join('\n    ')}
  </ul>
</div></section>
<section class="wrap">
  <p style="max-width:44em;font-size:1.15rem;padding-top:20px">${esc(g.intro)}</p>
  <div class="info${g.how.length ? '' : ' is-single'}">
    ${g.how.length ? `<div><h2>How to play</h2><ol class="steps">${g.how.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol></div>` : ''}
    <div><h2>What's inside</h2><ul class="bullets">${g.highlights.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
  </div>
  <div class="fine">${g.note ? `<p>${esc(g.note)}</p>` : ''}<p>${esc(g.money)}</p></div>
</section>
<section class="wrap more">
  <h2>More from VeganBeef</h2>
  <ul class="tiles is-more">${related.map((o, i) => tile(o, i, { more: true })).join('')}</ul>
</section>
<dialog class="lb" aria-label="Screenshot viewer"><img src="data:," alt=""><button class="lb-close" type="button" aria-label="Close">×</button><button class="lb-prev" type="button" aria-label="Previous screenshot">‹</button><button class="lb-next" type="button" aria-label="Next screenshot">›</button></dialog>`;

  return page({
    urlPath: `/games/${g.slug}/`,
    title: `${g.title} | VeganBeef`,
    desc: g.tagline,
    og: `/media/${g.slug}/og.jpg`,
    body,
    current: 'games',
    jsonld: {
      '@context': 'https://schema.org', '@type': 'MobileApplication', name: g.title, description: g.tagline,
      operatingSystem: 'ANDROID', applicationCategory: 'GameApplication', image: `${site.url}/media/${g.slug}/og.jpg`,
      author: { '@type': 'Organization', name: 'VeganBeef', url: site.url + '/' },
      ...(g.status === 'live' ? { installUrl: play(g), offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } } : {}),
    },
  });
}

const textPage = ({ urlPath, title, heading, sub, file, current, desc }) => page({
  urlPath, title, desc, current,
  body: `<section class="page-head mat on-ink"><div class="wrap"><h1>${esc(heading)}</h1><p>${esc(sub)}</p></div></section>
<div class="wrap"><article class="prose">${read(file)}</article></div>`,
});

write('index.html', home());
games.forEach((g) => write(`games/${g.slug}/index.html`, gamePage(g)));
write('privacy/index.html', textPage({ urlPath: '/privacy/', title: 'Privacy Policy | VeganBeef', heading: 'Privacy policy', sub: `Last updated ${POLICY_DATE}`, file: 'src/privacy.html', current: 'privacy', desc: 'How VeganBeef games handle your information, which ad and analytics partners they use, and the choices you have.' }));
write('support/index.html', textPage({ urlPath: '/support/', title: 'Player Support | VeganBeef', heading: 'Player support', sub: 'Something wrong in one of our games? We can help.', file: 'src/support.html', current: 'support', desc: 'Help with VeganBeef games: contact us, purchases, refunds, ads and your data.' }));
write('404.html', page({ urlPath: '/404.html', title: 'Page not found | VeganBeef', desc: 'This page does not exist.', robots: 'noindex', body: `<section class="mat on-ink"><div class="wrap lost"><h1>Wrong stop.</h1><p>That page doesn't exist. The games do.</p><a class="btn" href="/">Back to the games</a></div></section>` }));

fs.copyFileSync(path.join(ROOT, 'src/site.css'), path.join(OUT, 'assets/site.css'));
fs.copyFileSync(path.join(ROOT, 'src/site.js'), path.join(OUT, 'assets/site.js'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
const urls = ['/', ...games.map((g) => `/games/${g.slug}/`), '/support/', '/privacy/'];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log(`built ${urls.length} pages · ${live.length} live · ${totalInstalls.toLocaleString('en-US')} installs (${totalLabel}) · ${released2026} in 2026`);
