/**
 * Framework-Aware Action Plan Generator for SEO GPS Frontend.
 * Author: Ismail El Asiouty
 */

export interface ActionPlanItem {
  id: string;
  checkId: string;
  url: string;
  whatIsIt: string;
  whyItMatters: string;
  expectedImpact: string;
  impactLevel: 'high' | 'medium' | 'low';
  effortLevel: 'low' | 'medium' | 'high';
  tier: 'quick_win' | 'strategic' | 'fill_in' | 'time_sink';
  tierLabel: string;
  stepByStepFix: string[];
  codePatch: string;
  framework: string;
}

export function detectSiteFramework(pages: any[] = []): string {
  const allHtml = pages.slice(0, 5).map(p => (p.htmlSnippet || p.title || '')).join(' ').toLowerCase();
  if (allHtml.includes('wp-content') || allHtml.includes('wp-includes') || allHtml.includes('wordpress')) {
    return 'wordpress';
  }
  if (allHtml.includes('shopify') || allHtml.includes('cdn.shopify.com')) {
    return 'shopify';
  }
  if (allHtml.includes('_next') || allHtml.includes('next.js')) {
    return 'nextjs';
  }
  if (allHtml.includes('webflow')) {
    return 'webflow';
  }
  return 'custom';
}

export function generateFrontendActionPlan(issues: any[] = [], framework: string = 'custom'): ActionPlanItem[] {
  const plan: ActionPlanItem[] = [];

  for (const issue of issues) {
    const checkId = issue.checkId || issue.check_id || '';
    const url = issue.url || '';
    const title = issue.title || issue.title_ar || '';
    const severity = issue.severity || 'warning';

    let impactLevel: 'high' | 'medium' | 'low' = severity === 'critical' ? 'high' : (severity === 'warning' ? 'medium' : 'low');
    let effortLevel: 'low' | 'medium' | 'high' = 'low';

    let what = title;
    let why = issue.details || issue.details_ar || 'تؤثر على جودة الفحص والأرشفة.';
    let impactDesc = 'تحسين إشارات الترتيب وتسريع وصول عناكب البحث.';
    let steps: string[] = ['مراجعة الرابط وتطبيق التعديل الموصى به.'];
    let patch = `// راجع الرابط: ${url}`;

    if (checkId === 'http_status' || checkId === 'status') {
      what = `الصفحة تعيد رمز خطأ (4xx أو 5xx) بدلاً من 200 OK`;
      why = 'الروابط المعطلة تهدر ميزانية الزحف وتمنح المستخدم تجربة سيئة تؤدي إلى الارتداد.';
      impactDesc = 'استعادة الزيارات المفقودة وقوة الروابط الداخلية والخارجية.';
      impactLevel = 'high';
      effortLevel = 'low';
      steps = [
        'تحديد الرابط البديل الصحيح الأكثر صلة بموضوع الصفحة.',
        'إنشاء تحويل 301 دائم من الرابط المعطل إلى الرابط الجديد.',
        'تحديث الروابط الداخلية في الموقع للإشارة للرابط الجديد مباشرة.'
      ];
      patch = framework === 'wordpress'
        ? `// في functions.php:\nwp_redirect('${url}', 301); exit;`
        : (framework === 'nextjs'
            ? `// في next.config.js:\n{ source: '${new URL(url || 'https://x.com/').pathname}', destination: '/target', permanent: true }`
            : `Redirect 301 ${new URL(url || 'https://x.com/').pathname} /target-page`);
    } else if (checkId === 'metadata' && (title.includes('NOINDEX') || title.includes('noindex'))) {
      what = 'أمر noindex يمنع ظهور الصفحة في نتائج بحث جوجل';
      why = 'وجود هذا الأمر يمنع أرشفة الصفحة نهائياً ويحذفها من فهارس محركات البحث.';
      impactDesc = 'ظهور فوري في نتائج البحث واستعادة حركة الزوار العضوية.';
      impactLevel = 'high';
      effortLevel = 'low';
      steps = [
        'الدخول لإعدادات الصفحة أو قالب الموقع.',
        'إلغاء تفعيل خيار noindex وجعله index, follow.',
        'طلب فحص الرابط عبر Google Search Console للتحديث الفوري.'
      ];
      patch = '<meta name="robots" content="index, follow" />';
    } else if (checkId.includes('canonical')) {
      what = 'خلل في وسم الرابط الأساسي (Canonical Tag)';
      why = 'يشتت إشارات الترتيب بين النسخ المتشابهة ويؤدي إلى مشاكل محتوى مكرر.';
      impactDesc = 'توحيد سلطة الترتيب للرابط المعتمد وضمان ظهوره في نتائج البحث.';
      impactLevel = 'high';
      effortLevel = 'low';
      steps = [
        'تحديد النسخة الرسمية المفضلة للصفحة بدقة.',
        'إضافة وسم canonical يشير بشكل مباشر إلى هذا الرابط.'
      ];
      patch = `<link rel="canonical" href="${url}" />`;
    } else if (checkId.includes('schema')) {
      what = 'غياب أو نقص البيانات المنظمة (Schema / JSON-LD)';
      why = 'تفقد الصفحة فرصة الظهور بالمقتطفات المميزة والنجوم وتسهيل قراءتها بنماذج الذكاء الاصطناعي.';
      impactDesc = 'رفع نسبة النقر للظهور (CTR) بنسبة تتجاوز 25%.';
      impactLevel = 'high';
      effortLevel = 'medium';
      steps = [
        'إنشاء كود Schema متوافق مع نوع المحتوى (Article أو Product أو FAQPage).',
        'إدراج الكود في وسم head للصفحة.'
      ];
      patch = `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "${title}",\n  "mainEntityOfPage": "${url}"\n}\n</script>`;
    } else if (checkId === 'orphan_pages') {
      what = 'صفحة يتيمة بدون روابط داخلية';
      why = 'تفتقر إلى قوة الروابط الداخلية وصعوبة وصول عناكب البحث إليها.';
      impactDesc = 'توزيع قوة الروابط الداخلية للموقع ورفع سرعة أرشفة الصفحة.';
      impactLevel = 'medium';
      effortLevel = 'low';
      steps = [
        'إضافة روابط سياقية من 2 إلى 3 مقالات أو أقسام ذات صلة وثيقة.'
      ];
      patch = `<a href="${url}">اقرأ أيضاً حول الموضوع</a>`;
    }

    let tier: 'quick_win' | 'strategic' | 'fill_in' | 'time_sink' = 'quick_win';
    let tierLabel = 'مكسب سريع (أولوية قصوى)';

    if (impactLevel === 'high' && effortLevel === 'low') {
      tier = 'quick_win';
      tierLabel = 'مكسب سريع (أولوية قصوى)';
    } else if (impactLevel === 'high' && effortLevel !== 'low') {
      tier = 'strategic';
      tierLabel = 'إصلاح استراتيجي هام';
    } else if (impactLevel !== 'high' && effortLevel === 'low') {
      tier = 'fill_in';
      tierLabel = 'تحسين سريع';
    } else {
      tier = 'time_sink';
      tierLabel = 'تحسين لاحق';
    }

    plan.push({
      id: issue.id || issue.fingerprint || `act-${Math.random()}`,
      checkId,
      url,
      whatIsIt: what,
      whyItMatters: why,
      expectedImpact: impactDesc,
      impactLevel,
      effortLevel,
      tier,
      tierLabel,
      stepByStepFix: steps,
      codePatch: patch,
      framework,
    });
  }

  // Sort by priority
  const weights: Record<string, number> = {
    quick_win: 1,
    strategic: 2,
    fill_in: 3,
    time_sink: 4,
  };
  return plan.sort((a, b) => (weights[a.tier] || 5) - (weights[b.tier] || 5));
}
