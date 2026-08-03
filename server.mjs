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

// Selon l'entrée serveur, Start exporte soit le handler directement (entrée
// applicative, src/server.ts), soit un objet `{ fetch }` (entrée générée par
// défaut). On accepte les deux plutôt que de dépendre d'un détail interne.
const fetchHandler =
  typeof handler === 'function' ? handler : handler.fetch.bind(handler);

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
      pipeSafely(createReadStream(filePath), res, req.url);
      return;
    }

    const response = await fetchHandler(toWebRequest(req));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) {
      pipeSafely(Readable.fromWeb(response.body), res, req.url);
    } else {
      res.end();
    }
  } catch (error) {
    fail(res, req.url, error);
  }
});

// Une erreur survenue APRÈS l'envoi des en-têtes ne peut plus donner lieu à un
// 500 : la seule issue correcte est de couper la réponse. Sans ce garde,
// l'erreur remontait non gérée et tuait le process — une page en échec mettait
// donc tout le site à terre.
function pipeSafely(source, res, url) {
  const onError = (error) => {
    source.destroy();
    fail(res, url, error);
  };
  source.on('error', onError);
  res.on('error', onError);
  res.on('close', () => source.destroy());
  source.pipe(res);
}

function fail(res, url, error) {
  console.error('[server] échec du rendu', url, error);
  if (res.writableEnded || res.destroyed) return;
  if (res.headersSent) {
    res.destroy();
    return;
  }
  res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Internal Server Error');
}

// Filet de dernier recours : on journalise sans quitter. Le défaut d'une requête
// ne doit jamais emporter les requêtes en vol ni provoquer un redémarrage.
process.on('uncaughtException', (error) => {
  console.error('[server] exception non gérée', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] rejet non géré', reason);
});

server.listen(PORT, () => {
  console.log(`[server] SSR à l'écoute sur :${PORT}`);
});
