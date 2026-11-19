// Local preview of docs/ on http://localhost:4178 (with video range requests). node tools/serve.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const port = Number(process.env.PORT || 4178);
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

http.createServer((q, s) => {
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { s.writeHead(404, { 'content-type': T['.html'] }); return s.end(fs.readFileSync(path.join(root, '404.html'))); }
  const st = fs.statSync(f);
  const type = T[path.extname(f)] || 'application/octet-stream';
  const r = q.headers.range;
  if (r) {
    const m = /bytes=(\d+)-(\d*)/.exec(r);
    const a = +m[1];
    const b = m[2] ? +m[2] : st.size - 1;
    s.writeHead(206, { 'content-type': type, 'content-range': `bytes ${a}-${b}/${st.size}`, 'accept-ranges': 'bytes', 'content-length': b - a + 1 });
    return fs.createReadStream(f, { start: a, end: b }).pipe(s);
  }
  s.writeHead(200, { 'content-type': type, 'content-length': st.size, 'accept-ranges': 'bytes' });
  fs.createReadStream(f).pipe(s);
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
