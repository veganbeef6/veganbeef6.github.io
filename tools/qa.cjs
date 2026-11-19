// Browser test for the site. Serve docs/ first (node tools/serve.mjs), then: node tools/qa.cjs
// Needs puppeteer-core in tools/node_modules (cd tools && npm i puppeteer-core) and Chrome installed.
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const B = process.env.SITE || 'http://localhost:4178';
const out = path.join(__dirname, 'qa-out');
fs.mkdirSync(out, { recursive: true });
const games = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'games.json'), 'utf8')).games;
const pages = ['/', '/support/', '/privacy/', '/terms/', '/nope/'].concat(games.map((g) => `/games/${g.slug}/`));
const fails = [];
const ok = (m) => console.log('  ok  ', m);
const bad = (m) => { fails.push(m); console.log('  FAIL', m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const br = await p.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'], userDataDir: path.join(out, 'prof') });
  const pg = await br.newPage();
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error' && !/youtube|ERR_BLOCKED|404/.test(m.text())) errs.push('console ' + m.text()); });
  pg.on('response', (r) => { if (r.url().startsWith(B) && r.status() >= 400 && !r.url().includes('/nope')) errs.push(r.status() + ' ' + r.url()); });

  // Every page at phone, tablet and desktop widths.
  const links = new Set();
  for (const [w, h] of [[360, 740], [414, 900], [768, 1024], [1024, 768], [1440, 900]]) {
    await pg.setViewport({ width: w, height: h });
    for (const u of pages) {
      await pg.goto(B + u, { waitUntil: 'load' });
      const r = await pg.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
        const ids = {};
        document.querySelectorAll('[id]').forEach((e) => { ids[e.id] = (ids[e.id] || 0) + 1; });
        const main = document.querySelector('main');
        const text = main ? main.innerText : '';
        return {
          over: document.documentElement.scrollWidth - innerWidth,
          hrefs: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
          h1: document.querySelectorAll('h1').length,
          noalt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
          dups: Object.keys(ids).filter((k) => ids[k] > 1),
          figures: (text.match(/\b\d[\d,.]*\s*[KM]?\+?\s+(games|installs|downloads|released)\b|\b\d+[KM]\+/gi) || []),
        };
      });
      r.hrefs.forEach((x) => links.add(x));
      if (r.over > 0) bad(`${w}px ${u} scrolls sideways by ${r.over}px`);
      if (r.h1 !== 1) bad(`${u} has ${r.h1} h1`);
      if (r.noalt) bad(`${u} has ${r.noalt} images without alt`);
      if (r.dups.length) bad(`${u} duplicate ids ${r.dups}`);
      if (r.figures.length && w === 1440) bad(`${u} shows figures: ${r.figures.join(' | ')}`);
    }
  }
  ok(`swept ${pages.length} pages at 5 widths`);

  // Every internal link and asset answers 200.
  for (const l of links) {
    if (l.startsWith('/') && !l.startsWith('//')) {
      const r = await fetch(B + l.split('#')[0]);
      if (r.status !== 200) bad(`broken link ${l} ${r.status}`);
    }
  }
  ok(`checked ${links.size} distinct links`);

  // Home: one board spot per game, the two logo buttons, the filters.
  await pg.setViewport({ width: 1440, height: 900 });
  await pg.goto(B + '/', { waitUntil: 'load' });
  await wait(900);
  const spots = await pg.$$eval('.board-sticker', (a) => a.map((e) => e.style.getPropertyValue('--x') + ',' + e.style.getPropertyValue('--y')));
  new Set(spots).size === spots.length ? ok(`home board: ${spots.length} stickers, each in its own spot`) : bad('home board: two stickers share a spot (add a SLOTS entry in build.mjs)');
  const before = spots.join('|');
  await pg.click('.press-red');
  await wait(800);
  (await pg.$$eval('.board-sticker', (a) => a.map((e) => e.style.getPropertyValue('--x') + ',' + e.style.getPropertyValue('--y')).join('|'))) !== before ? ok('red button shuffles the stickers') : bad('red button did nothing');
  await pg.click('.press-yolk');
  await wait(500);
  const pick = await pg.evaluate(() => ({ n: document.querySelectorAll('.is-picked').length, href: document.querySelector('.hero-hint a')?.getAttribute('href'), soon: document.querySelector('.is-picked')?.dataset.soon }));
  pick.n === 1 && pick.href && !pick.soon ? ok(`yellow picks ${pick.href}`) : bad('yellow failed ' + JSON.stringify(pick));
  for (const f of ['puzzle', 'action', 'racing', 'all']) {
    await pg.click(`.chip[data-filter="${f}"]`);
    const v = await pg.$$eval('#game-list .tile', (a) => a.filter((e) => !e.hidden && e.offsetHeight > 0).length);
    const want = f === 'all' ? games.length : games.filter((g) => g.genre === f).length;
    v === want ? ok(`filter ${f} shows ${v}`) : bad(`filter ${f} shows ${v}, want ${want}`);
  }
  await pg.screenshot({ path: path.join(out, 'home.png') });

  // A game page: the loop plays, nothing third-party loads before Play, lightbox and trailer work.
  const g = games.find((x) => x.youtube && fs.existsSync(path.join(__dirname, '..', 'docs', 'media', x.slug, 'loop.mp4')));
  const third = [];
  const onReq = (r) => { if (!r.url().startsWith(B) && !r.url().startsWith('data:')) third.push(r.url()); };
  pg.on('request', onReq);
  await pg.goto(`${B}/games/${g.slug}/`, { waitUntil: 'load' });
  await wait(1500);
  const vid = await pg.$eval('.device video', (v) => ({ t: +v.currentTime.toFixed(2), paused: v.paused }));
  vid.t > 0 && !vid.paused ? ok(`${g.slug}: gameplay loop is playing`) : bad('loop not playing ' + JSON.stringify(vid));
  third.length === 0 ? ok('no third-party requests before pressing play') : bad('third-party requests: ' + third.slice(0, 3).join(' '));
  pg.off('request', onReq);
  await pg.evaluate(() => document.querySelector('.rail').scrollIntoView({ block: 'center' }));
  await pg.click('.rail li:nth-child(2) a');
  await wait(500);
  const lb = await pg.$eval('.lb', (d) => ({ open: d.open, src: d.querySelector('img').src }));
  lb.open && /shot2/.test(lb.src) ? ok('lightbox opens screenshot 2') : bad('lightbox ' + JSON.stringify(lb));
  await pg.keyboard.press('Escape');
  await wait(200);
  await pg.click('.device .play');
  await wait(800);
  const fr = await pg.$eval('.device iframe', (f) => f.src).catch(() => null);
  fr && fr.includes(`youtube-nocookie.com/embed/${g.youtube}`) ? ok('trailer loads in place') : bad('trailer ' + fr);

  console.log('\nJS and asset errors:', errs.length);
  [...new Set(errs)].slice(0, 12).forEach((e) => console.log('  ', e));
  console.log('FAILS:', fails.length);
  await br.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('QA crashed', e); process.exit(1); });
