import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { executeSiteCrawl } from './src/lib/siteCrawler';

function quickAuditApiPlugin(): Plugin {
  return {
    name: 'seo-gps-quick-audit-api',
    configureServer(server) {
      server.middlewares.use('/api/quick-audit', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const { rootUrl, sitemapUrl, maxPages, targetYear, locale } = data;
              if (!rootUrl) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'rootUrl is required' }));
                return;
              }

              console.log(`[QuickAudit API] Starting deep crawl for: ${rootUrl} (Max: ${maxPages || 50})`);
              const result = await executeSiteCrawl({
                rootUrl,
                sitemapUrl,
                maxPages: maxPages || 50,
                targetYear: targetYear || 2027,
                locale: locale || 'ar',
              });

              console.log(`[QuickAudit API] Completed crawl for: ${rootUrl} -> Discovered ${result.summary.total_crawled} pages, ${result.issues.length} issues`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
            } catch (err: any) {
              console.error('[QuickAudit API] Error during crawl:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Crawl failed' }));
            }
          });
        } else {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), quickAuditApiPlugin()],
  base: './',
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
