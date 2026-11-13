import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
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
                userName = '',
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

              let resendApiKey = process.env.RESEND_API_KEY || '';
              if (!resendApiKey) {
                const candidatePaths = [
                  path.resolve(process.cwd(), '.env'),
                  path.resolve(process.cwd(), '../.env'),
                  path.resolve(process.cwd(), 'frontend/.env'),
                ];
                for (const cp of candidatePaths) {
                  try {
                    if (fs.existsSync(cp)) {
                      const envContent = fs.readFileSync(cp, 'utf-8');
                      const match = envContent.match(/RESEND_API_KEY\s*=\s*(.+)/);
                      if (match && match[1]) {
                        resendApiKey = match[1].trim().replace(/^["']|["']$/g, '');
                        if (resendApiKey) break;
                      }
                    }
                  } catch (e) {}
                }
              }

              if (!resendApiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'RESEND_API_KEY not configured' }));
                return;
              }

              const emailFrom = process.env.EMAIL_FROM || 'SEO GPS <onboarding@resend.dev>';
              const emailPayload = {
                from: emailFrom,
                to: [recipient],
                subject: `[SEO GPS] تقرير الفحص التقني الشامل: ${domain} (درجة الصحة: ${healthScore}/100)`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E5DE; border-radius: 12px; overflow: hidden;">
                    <div style="background: #FFFFFF; padding: 24px; text-align: center; border-bottom: 2px solid #E9D9A8;">
                      <img src="https://isamilelasiouty.github.io/seo-gps/brand/logo.png" alt="SEO GPS" style="height: 44px; width: auto; display: block; margin: 0 auto;" />
                    </div>
                    <div style="padding: 24px;">
                      <h2 style="font-size: 18px; color: #16140F; margin: 0 0 4px;">نتائج فحص الموقع: <span style="color: #B8892B;">${domain}</span></h2>
                      <p style="color: #667085; font-size: 13px; margin: 0 0 16px;">الرابط المفحوص: <a href="${rootUrl}" style="color: #B8892B;">${rootUrl}</a></p>
                      ${userName ? `<p style="color: #667085; font-size: 12px; margin: 0 0 16px;">المستلم / صاحب الطلب: <strong>${userName}</strong> (${recipient})</p>` : ''}
                      
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
                        <a href="https://isamilelasiouty.github.io/seo-gps/#/site-report" style="display: inline-block; background: #B8892B; color: #FFFFFF; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px;">عرض التقرير التفاعلي الكامل في المنصة &rarr;</a>
                      </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 16px; text-align: center; font-size: 12px; color: #667085; border-top: 1px solid #E5E5DE;">
                      SEO GPS &bull; منصة مراقبة تراجعات السيو بواسطة إسماعيل الأسيوطي
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
                if (resendRes.status === 403 && (errText.includes('testing emails') || errText.includes('resend.com/domains'))) {
                  // Resend sandbox active (onboarding@resend.dev): forward full report to Ismail El Asiouty
                  try {
                    const ownerPayload = {
                      from: emailFrom,
                      to: ['ismailelasiouty3@gmail.com'],
                      subject: `[SEO GPS - طلب تقرير عميل] ${userName || recipient} - موقع: ${domain}`,
                      html: `
                        <div style="background: #FFFFFF; padding: 20px; border-bottom: 2px solid #E9D9A8; text-align: center;">
                          <img src="https://isamilelasiouty.github.io/seo-gps/brand/logo.png" alt="SEO GPS" style="height: 40px; margin: 0 auto; display: block;" />
                        </div>
                        <div style="padding: 20px; font-family: Arial, sans-serif; color: #16140F; background: #FAFAF7;">
                          <div style="background: #FFF8E1; border: 1px solid #FFE082; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;">
                            <strong style="color: #B45309;">طلب تقرير عميل جديد:</strong>
                            <p style="margin: 4px 0 0; font-size: 13px; color: #78350F;">
                              طلب العميل <strong>${userName || 'غير محدد'}</strong> (${recipient}) استلام تقرير فحص الموقع <strong>${domain}</strong>.
                              <br />
                              <span style="font-size: 12px; color: #92400E;">(نظراً لأن النطاق في Resend تجريبي onboarding@resend.dev، تم إرسال هذه النسخة إلى بريدك لمتابعة العميل فوراً).</span>
                            </p>
                          </div>
                          ${emailPayload.html}
                        </div>
                      `
                    };
                    await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'SEOGPS/1.0',
                      },
                      body: JSON.stringify(ownerPayload),
                    });
                  } catch (e) {}
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, isSandboxRestriction: true, forwardedToOwner: true }));
                  return;
                }
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

      server.middlewares.use('/api/send-broadcast', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const { subscribers = [], subject, message } = data;

              let resendApiKey = process.env.RESEND_API_KEY || '';
              if (!resendApiKey) {
                const candidatePaths = [
                  path.resolve(process.cwd(), '.env'),
                  path.resolve(process.cwd(), '../.env'),
                  path.resolve(process.cwd(), 'frontend/.env'),
                ];
                for (const cp of candidatePaths) {
                  try {
                    if (fs.existsSync(cp)) {
                      const envContent = fs.readFileSync(cp, 'utf-8');
                      const match = envContent.match(/RESEND_API_KEY\s*=\s*(.+)/);
                      if (match && match[1]) {
                        resendApiKey = match[1].trim().replace(/^["']|["']$/g, '');
                        if (resendApiKey) break;
                      }
                    }
                  } catch (e) {}
                }
              }

              if (!resendApiKey) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'RESEND_API_KEY not configured' }));
                return;
              }

              const emailFrom = process.env.EMAIL_FROM || 'SEO GPS <onboarding@resend.dev>';
              const results: any[] = [];

              for (const sub of subscribers) {
                const greeting = sub.name ? `أهلاً بك أستاذ ${sub.name}،` : 'أهلاً بك،';
                const emailHtml = `
                  <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #ECE8DC; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(22,20,15,0.04);">
                    <div style="background: #FFFFFF; padding: 26px 24px; text-align: center; border-bottom: 2px solid #E9D9A8;">
                      <img src="https://isamilelasiouty.github.io/seo-gps/brand/logo.png" alt="SEO GPS" style="height: 42px; width: auto; display: block; margin: 0 auto;" />
                    </div>
                    <div style="padding: 32px 28px; direction: rtl; text-align: right; color: #16140F; background: #FFFFFF;">
                      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #16140F; line-height: 1.4;">
                        ${greeting} تم إطلاق تحديث جديد وشامل في منصة SEO GPS
                      </h2>
                      <p style="font-size: 14px; line-height: 1.8; color: #413E35; margin: 0 0 20px;">
                        ${message || 'يسعدنا إعلامك بأنه تم إطلاق تحديث جديد وشامل لمنصة SEO GPS يتضمن واجهة مطورة ومريحة للعين وفحصاً أكثر دقة للمواقع.'}
                      </p>
                      <div style="background: #FAFAF7; border: 1px solid #ECE8DC; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                        <ul style="margin: 0; padding-right: 20px; font-size: 13.5px; line-height: 1.9; color: #413E35;">
                          <li style="margin-bottom: 8px;">
                            <strong>واجهة مستخدم مطورة ومريحة للعين:</strong> تصميم عصري وسريع الاستجابة يتيح لك فحص وتحليل كافة مؤشرات الموقع بسلاسة تامة.
                          </li>
                          <li style="margin-bottom: 8px;">
                            <strong>فحص فوري شامل للروابط والمحتوى:</strong> استخراج كافة روابط خريطة الموقع، كشف الروابط المعطلة (404)، وتحويلات (301) داخل نصوص المقالات.
                          </li>
                          <li style="margin-bottom: 8px;">
                            <strong>فاحص البيانات المنظمة (Schema Markup):</strong> تحليل نوعي لكل Schema مع عرض الكود البرمجي المكتشف (JSON-LD) وحلول معالجة الأخطاء.
                          </li>
                          <li style="margin-bottom: 8px;">
                            <strong>كشف تنافس الكلمات (Cannibalization):</strong> تحديد المقالات التي تتنافس على نفس الكلمة المفتاحية وتقديم خطة عملية لتصدير المقال الأقوى.
                          </li>
                          <li>
                            <strong>تصدير فوري للتقارير:</strong> إمكانية تحميل التقرير الكامل بصيغتي PDF للطباعة أو ملف HTML مستقل يعمل بدون إنترنت.
                          </li>
                        </ul>
                      </div>
                      <div style="text-align: center; margin: 28px 0 16px;">
                        <a href="https://isamilelasiouty.github.io/seo-gps/#/" style="display: inline-block; background-color: #B8892B; color: #FFFFFF; padding: 13px 34px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px;">
                          دخول المنصة وتجربة التحديث الجديد &larr;
                        </a>
                      </div>
                    </div>
                    <div style="background: #FAFAF7; border-top: 1px solid #ECE8DC; padding: 18px 24px; text-align: center; font-size: 12px; color: #6B665A; direction: rtl;">
                      <p style="margin: 0;">منصة SEO GPS &bull; بإشراف إسماعيل الأسيوطي</p>
                      <p style="margin: 4px 0 0;">
                        <a href="https://isamilelasiouty.github.io/seo-gps/#/" style="color: #B8892B; text-decoration: none;">زيارة الموقع الرسمي</a>
                      </p>
                    </div>
                  </div>
                `;

                try {
                  const rRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey}`,
                      'Content-Type': 'application/json',
                      'User-Agent': 'SEOGPS/1.0',
                    },
                    body: JSON.stringify({
                      from: emailFrom,
                      to: [sub.email],
                      subject: subject || '[SEO GPS] تحديث جديد في المنصة: واجهة مطورة وتتبع تراجعات فوري لموقعك',
                      html: emailHtml,
                    }),
                  });
                  const rData = await rRes.json().catch(() => ({}));
                  results.push({ email: sub.email, success: rRes.ok, status: rRes.status, data: rData });
                } catch (sendErr: any) {
                  results.push({ email: sub.email, success: false, error: sendErr.message });
                }
              }

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, count: results.length, results }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message }));
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
