const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
if (!fs.existsSync(path.join(root, 'index.html'))) {
  console.error('Build EventPilot first: npm run build:web');
  process.exit(1);
}
http.createServer((req, res) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  let file;
  try { file = path.resolve(root, `.${decodeURIComponent(new URL(req.url, 'http://localhost').pathname)}`); }
  catch { res.writeHead(400).end(); return; }
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!path.extname(file)) file = path.join(root, 'index.html');
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream');
    res.writeHead(200).end(content);
  });
}).listen(port, '127.0.0.1', () => console.log(`EventPilot: http://127.0.0.1:${port}`));
