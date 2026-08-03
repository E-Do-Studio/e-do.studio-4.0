// Serveur de production.
//
// TanStack Start ne fournit pas de runner Node dans cette version : le build
// émet `dist/server/server.js`, qui exporte un handler `fetch` (standard
// Request → Response). Ce fichier lui donne une façade HTTP et sert les assets
// client, comme le prescrit la doc de déploiement Start.
//
// Caddy reste devant (redirections 301 legacy, en-têtes de sécurité, 404,
// mode maintenance) et proxifie vers ce process.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { Readable } from 'node:stream';

import handler from './dist/server/server.js';

const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIR = new URL('./dist/client/', import.meta.url).pathname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// Résout un chemin d'URL vers un fichier de dist/client, ou null. `normalize`
// puis le préfixe vérifié écartent les remontées `../`.
async function resolveStatic(pathname) {
  if (pathname.endsWith('/')) return null;
  const filePath = normalize(join(CLIENT_DIR, decodeURIComponent(pathname)));
  if (!filePath.startsWith(CLIENT_DIR)) return null;
  try {
    const info = await stat(filePath);
    return info.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

function toWebRequest(req) {
  const url = `http://${req.headers.host ?? 'localhost'}${req.url}`;
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? 'half' : undefined,
  });
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');

    const filePath = await resolveStatic(pathname);
    if (filePath) {
      // /assets porte un hash de contenu : immuable. Le reste (polices, favicons,
      // vidéos) est stable mais peut être remplacé — cache plus court.
      res.writeHead(200, {
        'Content-Type': MIME[extname(filePath)] ?? 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/assets/')
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=3600',
      });
      createReadStream(filePath).pipe(res);
      return;
    }

    const response = await handler.fetch(toWebRequest(req));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    // Une erreur de rendu ne doit pas tuer le process : on log et on renvoie 500.
    console.error('[server] échec du rendu', req.url, error);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`[server] SSR à l'écoute sur :${PORT}`);
});
