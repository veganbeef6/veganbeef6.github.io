# VeganBeef website

The studio site at https://veganbeef6.github.io, served by GitHub Pages from the `docs/` folder of `main`.

## Change something

1. Edit `data/games.json` (games and their text), `src/site.css`, `src/site.js`, `src/privacy.html` or `src/support.html`.
2. Run `node build.mjs`. It rewrites the HTML in `docs/`, plus `sitemap.xml` and `robots.txt`.
3. Commit and push. Pages updates within a minute or two.

`build.mjs` needs Node 18 or newer and nothing else.

## Add a game

1. Add an entry to `data/games.json`. Games show in the order they are listed. Use `"status": "soon"` until it is live on Google Play, then `"live"` with its `released` date.
2. Put its media in `docs/media/<slug>/`:
   - `icon.webp` 384×384
   - `header.webp` 1024 wide, `header-640.webp` 640 wide, `og.jpg` 1024 wide (the Play feature graphic)
   - `shot1.webp` … phone screenshots, 1080 tall (portrait) or 1280 wide (landscape)
   - optional `loop.mp4` (8 seconds, silent, 432×768 or 768×432) and `poster.webp` (its first frame)
3. Add the slug to `data/media.json` with the screenshot count and size.
4. Add `"youtube": "<video id>"` if the game has a trailer. The site loads YouTube only when a visitor presses play.

## Other files in `docs/`

- `app-ads.txt` is served at the site root, ready for when the Play listings point here.
- `.nojekyll` makes Pages serve the files as they are.
