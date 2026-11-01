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

      server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const {
                recipient,
                domain = 'techhouseksa.com',
                rootUrl = 'https://techhouseksa.com',
                healthScore = 92,
                pagesCount = 180,
                criticalCount = 0,
                warningCount = 14,
                cannibalizationCount = 8,
              } = data;

              if (!recipient || !recipient.includes('@')) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Valid recipient email is required' }));
                return;
              }

              const resendApiKey = process.env.RESEND_API_KEY || '';
              const emailPayload = {
                from: 'SEO GPS <onboarding@resend.dev>',
                to: [recipient],
                subject: `[SEO GPS] تقرير الفحص التقني الشامل: ${domain} (درجة الصحة: ${healthScore}/100)`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5DE; border-radius: 12px; overflow: hidden;">
                    <div style="background: #16140F; padding: 24px; text-align: center; color: #FFFFFF;">
                      <h1 style="color: #B8892B; margin: 0; font-size: 24px; font-weight: 800;">SEO GPS</h1>
                      <p style="color: #98A2B3; margin: 6px 0 0; font-size: 14px;">Instant Full-Site Technical Audit & Regression Report</p>
                    </div>
                    <div style="padding: 24px;">
                      <h2 style="font-size: 18px; color: #16140F; margin: 0 0 4px;">نتائج فحص الموقع: <span style="color: #B8892B;">${domain}</span></h2>
                      <p style="color: #667085; font-size: 13px; margin: 0 0 16px;">الرابط المفحوص: <a href="${rootUrl}" style="color: #B8892B;">${rootUrl}</a></p>
                      
                      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #E5E5DE; border-radius: 8px;">
                        <tr style="background: #FAFAF7; border-bottom: 1px solid #E5E5DE;">
                          <td style="padding: 12px; font-weight: bold; color: #16140F;">درجة الصحة التقنية:</td>
                          <td style="padding: 12px; font-weight: bold; color: #B8892B; font-size: 18px;">${healthScore}/100</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #E5E5DE;">
                          <td style="padding: 12px; font-weight: bold; color: #16140F;">إجمالي الصفحات المفحوصة:</td>
                          <td style="padding: 12px; color: #16140F;">${pagesCount} صفحة (جميع صفحات الـ Sitemap)</td>
                        </tr>
                        <tr style="background: #FAFAF7; border-bottom: 1px solid #E5E5DE;">
                          <td style="padding: 12px; font-weight: bold; color: #16140F;">تنافس الكلمات (Cannibalization):</td>
                          <td style="padding: 12px; color: #DC6803; font-weight: bold;">${cannibalizationCount} حالات تنافس</td>
                        </tr>
                        <tr>
                          <td style="padding: 12px; font-weight: bold; color: #16140F;">أخطاء حرجة (404/5xx):</td>
                          <td style="padding: 12px; color: ${criticalCount > 0 ? '#D92D20' : '#12B76A'}; font-weight: bold;">${criticalCount}</td>
                        </tr>
                      </table>

                      <div style="background: #FAFAF7; border: 1px solid #E5E5DE; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 8px; font-size: 14px; color: #16140F;">الملخص التنفيذي للفحص:</h3>
                        <ul style="margin: 0; padding-right: 20px; font-size: 13px; color: #475467; line-height: 1.6;">
                          <li>تم فحص كافة روابط الموقع المستخرجة من خريطة الموقع بنجاح.</li>
                          <li>تم استخراج كافة وسوم Schema Markup والروابط الداخلية ونصوص الربط.</li>
                          <li>تم الكشف عن فرص توحيد مقالات السيو المتنافسة للحفاظ على تصدر الكلمات المستهدفة.</li>
                        </ul>
                      </div>

                      <div style="text-align: center; margin-top: 24px;">
                        <a href="https://isamilelasiouty.github.io/seo-gps" style="display: inline-block; background: #B8892B; color: #FFFFFF; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">فتح التقرير التفاعلي في المنصة</a>
                      </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 16px; text-align: center; font-size: 12px; color: #667085; border-top: 1px solid #E5E5DE;">
                      SEO GPS — Portfolio-Grade Technical Audit SaaS by Ismail El Asiouty
                    </div>
                  </div>
                `
              };

              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                  'User-Agent': 'SEOGPS/1.0',
                },
                body: JSON.stringify(emailPayload),
              });

              if (resendRes.ok) {
                const resJson = await resendRes.json();
                console.log(`[SendEmail API] Resend email dispatched: ${resJson.id} to ${recipient}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, id: resJson.id }));
              } else {
                const errText = await resendRes.text();
                console.warn('[SendEmail API] Resend returned error:', errText);
                res.writeHead(resendRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: errText }));
              }
            } catch (err: any) {
              console.error('[SendEmail API] Error:', err);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Failed to send email' }));
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
