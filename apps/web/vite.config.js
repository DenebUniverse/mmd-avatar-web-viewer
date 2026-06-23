import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(webRoot, '../..');

function sendFile(res, filePath) {
  fs.createReadStream(filePath)
    .on('error', () => {
      res.statusCode = 404;
      res.end('Not found');
    })
    .pipe(res);
}

function staticRepoMounts() {
  return {
    name: 'agentstage-static-mounts',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?', 1)[0] || '';
        const decodedUrl = decodeURI(rawUrl);
        if (decodedUrl.startsWith('/assets/')) {
          sendFile(res, path.join(repoRoot, decodedUrl.slice(1)));
          return;
        }
        if (decodedUrl.startsWith('/generated/')) {
          sendFile(res, path.join(repoRoot, '.generated', decodedUrl.slice('/generated/'.length)));
          return;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url?.split('?', 1)[0] || '';
        const decodedUrl = decodeURI(rawUrl);
        if (decodedUrl.startsWith('/assets/')) {
          sendFile(res, path.join(repoRoot, decodedUrl.slice(1)));
          return;
        }
        if (decodedUrl.startsWith('/generated/')) {
          sendFile(res, path.join(repoRoot, '.generated', decodedUrl.slice('/generated/'.length)));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  root: webRoot,
  publicDir: false,
  plugins: [staticRepoMounts()],
  server: {
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      '/api': 'http://127.0.0.1:4310',
    },
  },
  build: {
    outDir: path.resolve(repoRoot, 'dist'),
    emptyOutDir: true,
  },
});
