// VeganBeef site behaviour. Everything here is an enhancement: with scripts off, every game, link and video is still reachable.
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The two arcade buttons in the VB logo.
  const board = document.querySelector('.board');
  if (board) {
    const stickers = $$('.board-sticker', board);
    const hint = document.querySelector('.hero-hint');
    const original = hint ? hint.innerHTML : '';
    const press = (dome) => {
      const el = board.querySelector(dome);
      el.classList.add('is-down');
      setTimeout(() => el.classList.remove('is-down'), 170);
    };
    const clearPick = () => stickers.forEach((s) => s.classList.remove('is-picked'));

    board.querySelector('.press-red').addEventListener('click', () => {
      press('.dome-red');
      clearPick();
      const slots = stickers.map((s) => ['--x', '--y', '--r', '--s'].map((k) => s.style.getPropertyValue(k)));
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      stickers.forEach((s, i) => ['--x', '--y', '--r', '--s'].forEach((k, n) => s.style.setProperty(k, slots[i][n])));
      if (hint) hint.innerHTML = original;
    });

    board.querySelector('.press-yolk').addEventListener('click', () => {
      press('.dome-yolk');
      clearPick();
      const live = stickers.filter((s) => !s.dataset.soon);
      const pick = live[Math.floor(Math.random() * live.length)];
      pick.classList.add('is-picked');
      if (hint) {
        hint.textContent = 'Tonight you are playing ';
        const a = document.createElement('a');
        a.href = pick.getAttribute('href');
        a.textContent = pick.dataset.title;
        hint.append(a, '.');
      }
    });
  }

  // Game filter chips.
  const chips = $$('.chip');
  const tiles = $$('#game-list .tile');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const want = chip.dataset.filter;
    tiles.forEach((t) => { t.hidden = want !== 'all' && t.dataset.genre !== want; });
  }));

  // Trailers load from YouTube only once someone asks for them.
  $$('[data-yt]').forEach((btn) => btn.addEventListener('click', (e) => {
    e.preventDefault();
    const box = btn.closest('.device, .frame');
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = btn.dataset.title || 'Game trailer';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    box.querySelectorAll('video, img, .play, .play-label').forEach((n) => n.remove());
    box.append(iframe);
  }));

  // Loops pause for people who asked for less motion.
  if (calm) $$('video[autoplay]').forEach((v) => { v.removeAttribute('autoplay'); v.pause(); });

  // Screenshot lightbox.
  const lb = document.querySelector('.lb');
  const shots = $$('.rail a');
  if (lb && shots.length && lb.showModal) {
    const img = lb.querySelector('img');
    let at = 0;
    const show = (i) => {
      at = (i + shots.length) % shots.length;
      img.src = shots[at].href;
      img.alt = shots[at].querySelector('img').alt;
    };
    shots.forEach((a, i) => a.addEventListener('click', (e) => { e.preventDefault(); show(i); lb.showModal(); }));
    lb.querySelector('.lb-close').addEventListener('click', () => lb.close());
    lb.querySelector('.lb-prev').addEventListener('click', () => show(at - 1));
    lb.querySelector('.lb-next').addEventListener('click', () => show(at + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(at - 1);
      if (e.key === 'ArrowRight') show(at + 1);
    });
  }
})();
