const https = require('https');
const fs = require('fs');
const path = require('path');

// Target recipient list from subscribers
const subscribers = [
  { name: 'Mohamed ElSaeed', email: 'info@mohamedelsaeed.com' },
  { name: 'اسماعيل', email: 'seotec3@gmail.com' },
  { name: 'Adam Ahmed', email: 'adamwetet22@gmail.com' },
  { name: 'ISAM', email: 'asmaylalasywty48@gmail.com' },
  { name: 'seo', email: 'ismeaelelasiouty@gmail.com' },
  { name: 'Beshoy Reda', email: 'seobeshoy@gmail.com' },
  { name: 'osama', email: 'alrawaacompany0@gmail.com' },
  { name: 'iyyuyyuiui', email: 'heuwjpoop@gmail.com' },
  { name: 'Ismail El Asiouty', email: 'ismailelasiouty3@gmail.com' },
];

const apiKey = process.env.RESEND_API_KEY || '';

function buildHtml(recipientName) {
  const greeting = recipientName && recipientName !== 'غير محدد' ? `أهلاً بك أستاذ ${recipientName}،` : 'أهلاً بك،';
  return `
  <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border: 1px solid #ECE8DC; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 8px rgba(22,20,15,0.04);">
    <!-- Header with Official Logo -->
    <div style="background: #FFFFFF; padding: 26px 24px; text-align: center; border-bottom: 2px solid #E9D9A8;">
      <img src="https://isamilelasiouty.github.io/seo-gps/brand/logo.png" alt="SEO GPS" style="height: 42px; width: auto; display: block; margin: 0 auto;" />
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 28px; direction: rtl; text-align: right; color: #16140F; background: #FFFFFF;">
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #16140F; line-height: 1.4;">
        ${greeting} تم إطلاق تحديث جديد وشامل في منصة SEO GPS
      </h2>
      
      <p style="font-size: 14px; line-height: 1.8; color: #413E35; margin: 0 0 20px;">
        نعمل باستمرار على تطوير المنصة لتقديم أدق تحليل استباقي ومراقبة لحظية لحماية ترتيب موقعك في نتائج البحث (Google). يسعدنا مشاركتك أبرز ميزات التحديث الجديد المتاح الآن:
      </p>

      <!-- Highlights Card -->
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

      <!-- Action Button -->
      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="https://isamilelasiouty.github.io/seo-gps/#/" style="display: inline-block; background-color: #B8892B; color: #FFFFFF; padding: 13px 34px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 14px;">
          دخول المنصة وتجربة التحديث الجديد &larr;
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #FAFAF7; border-top: 1px solid #ECE8DC; padding: 18px 24px; text-align: center; font-size: 12px; color: #6B665A; direction: rtl;">
      <p style="margin: 0;">منصة SEO GPS • بإشراف إسماعيل الأسيوطي</p>
      <p style="margin: 4px 0 0;">
        <a href="https://isamilelasiouty.github.io/seo-gps/#/" style="color: #B8892B; text-decoration: none;">زيارة الموقع الرسمي</a>
      </p>
    </div>
  </div>
  `;
}

function sendEmail(to, name) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      from: 'SEO GPS <onboarding@resend.dev>',
      to: [to],
      subject: '[SEO GPS] تحديث جديد في المنصة: واجهة مطورة وتتبع تراجعات فوري لموقعك',
      html: buildHtml(name),
    });

    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ email: to, status: res.statusCode, body: data });
      });
    });

    req.on('error', (err) => {
      resolve({ email: to, status: 500, error: err.message });
    });

    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log(`Starting broadcast dispatch to ${subscribers.length} registered subscribers...`);
  for (const sub of subscribers) {
    const res = await sendEmail(sub.email, sub.name);
    console.log(`[${sub.email}] -> Status ${res.status}:`, res.body || res.error);
  }
}

run();
