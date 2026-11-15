import { GOOGLE_SEO_KNOWLEDGE_TOPICS, GoogleSeoDocTopic } from './googleSeoKnowledge';

export interface AiConsultationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  docCitationUrl?: string;
  docCitationTitle?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
}

const STORAGE_PREFIX = 'seo_gps_ai_agent_history_';
const LEARNED_INSIGHTS_KEY = 'seo_gps_ai_agent_learned_insights';

export function getProjectAiHistory(projectId: string, isAr: boolean): AiConsultationMessage[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${projectId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading AI history:', e);
  }

  // Default welcome message from the 60-year Google Veteran Master Architect
  const defaultWelcome: AiConsultationMessage = {
    id: 'msg-welcome',
    role: 'assistant',
    content: isAr
      ? `أهلاً بك! أنا خبير ومستشار الـ SEO التقني في منصة SEO GPS، أمتلك خبرة معمارية عميقة مبنية على مراجعة وفهم كامل خوارزميات محركات البحث وإرشادات Google Search Central الرسمية.\n\nأنا أراقب موقعك لحظياً واطلعت على كامل نتائج الفحص الأخيرة ونقاط الصحة والمشاكل المكتشفة. تفضل بطرح أي سؤال مثل: "الموقع محتاج ايه؟"، أو استفسر عن كيفية حل الـ 404، ضبط وسوم الكانونيكال، تسريع الـ Core Web Vitals، أو تحسين تصنيف مقالاتك وفق معايير E-E-A-T.`
      : `Welcome! I am your Senior Technical SEO Architect at SEO GPS, trained on decades of algorithmic intelligence and official Google Search Central guidelines.\n\nI have complete, real-time awareness of your website audit, health metrics, and active issues. Ask me anything like: "What does my site need?", or inquire about resolving 404s, configuring canonicals, accelerating Core Web Vitals, or optimizing for Google's E-E-A-T standards.`,
    timestamp: new Date().toISOString(),
    docCitationUrl: 'https://developers.google.com/search/docs',
    docCitationTitle: 'Google Search Central Official Documentation',
  };

  return [defaultWelcome];
}

export function saveProjectAiHistory(projectId: string, messages: AiConsultationMessage[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${projectId}`, JSON.stringify(messages));
  } catch (e) {
    console.warn('Error saving AI history:', e);
  }
}

export function clearProjectAiHistory(projectId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${projectId}`);
  } catch (e) {}
}

/**
 * Record a learned insight dynamically so the AI agent continually updates its memory
 */
export function recordLearnedInsight(domain: string, insight: string): void {
  try {
    const raw = localStorage.getItem(LEARNED_INSIGHTS_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    if (!existing[domain]) existing[domain] = [];
    existing[domain].unshift({
      insight,
      timestamp: new Date().toISOString(),
    });
    // keep last 20 insights per domain
    existing[domain] = existing[domain].slice(0, 20);
    localStorage.setItem(LEARNED_INSIGHTS_KEY, JSON.stringify(existing));
  } catch (e) {}
}

export function getLearnedInsights(domain: string): string[] {
  try {
    const raw = localStorage.getItem(LEARNED_INSIGHTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed[domain] && Array.isArray(parsed[domain])) {
        return parsed[domain].map((item: any) => item.insight);
      }
    }
  } catch (e) {}
  return [];
}

export async function askAiSeoExpert(params: {
  prompt: string;
  projectId: string;
  projectDomain?: string;
  projectRootUrl?: string;
  healthScore?: number;
  issues?: any[];
  isAr?: boolean;
}): Promise<AiConsultationMessage> {
  const {
    prompt,
    projectId,
    projectDomain = 'your-website.com',
    projectRootUrl = 'https://' + projectDomain,
    healthScore = 80,
    issues = [],
    isAr = true,
  } = params;

  // Clean prompt and normalize Egyptian & Gulf dialects to standard keywords
  const rawPrompt = prompt.trim();
  const cleanPrompt = rawPrompt
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي');

  // Analyze active site issues
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
  const noticeIssues = issues.filter((i) => i.severity === 'notice');
  const brokenLinks404 = issues.filter(
    (i) => i.checkId === 'http_status_404' || i.title?.includes('404')
  );
  const canonicalIssues = issues.filter(
    (i) => i.checkId?.includes('canonical') || i.title?.toLowerCase().includes('canonical')
  );
  const titleIssues = issues.filter(
    (i) => i.checkId?.includes('title') || i.title?.includes('عنوان')
  );
  const metaDescIssues = issues.filter(
    (i) => i.checkId?.includes('description') || i.title?.includes('وصف')
  );
  const speedIssues = issues.filter(
    (i) => i.checkId?.includes('speed') || i.checkId?.includes('response') || i.checkId?.includes('lcp')
  );

  let responseText = '';
  let citationUrl = 'https://developers.google.com/search/docs';
  let citationTitle = 'Google Search Central Official Documentation';
  let codeSnippet: { language: string; code: string } | undefined = undefined;

  // ---------------------------------------------------------------------------
  // Case 1: "الموقع محتاج ايه؟" / "الموقع محتاج اه" / "What does my site need?"
  // Highly requested comprehensive real-time site audit diagnosis
  // ---------------------------------------------------------------------------
  const isSiteNeedsQuery =
    cleanPrompt.includes('محتاج ايه') ||
    cleanPrompt.includes('محتاج اه') ||
    cleanPrompt.includes('محتاج ايه عشان') ||
    cleanPrompt.includes('موقعي محتاج ايه') ||
    cleanPrompt.includes('ايه اللي الموقع محتاجه') ||
    cleanPrompt.includes('ايه المشاكل') ||
    cleanPrompt.includes('المشاكل اللي عندي') ||
    cleanPrompt.includes('اعمل ايه') ||
    cleanPrompt.includes('حلل الموقع') ||
    cleanPrompt.includes('فحص الموقع') ||
    cleanPrompt.includes('what does my site need') ||
    cleanPrompt.includes('what is missing') ||
    cleanPrompt.includes('how to improve my site') ||
    cleanPrompt.includes('site audit summary');

  if (isSiteNeedsQuery) {
    citationUrl = 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide';
    citationTitle = isAr ? 'دليل تحسين محركات البحث للمبتدئين والمحترفين من جوجل' : 'Google SEO Starter Guide';

    // Build specific needs list based on the live data
    const needsListAr: string[] = [];
    const needsListEn: string[] = [];

    if (brokenLinks404.length > 0) {
      const sample = brokenLinks404[0].url;
      needsListAr.push(`1. معالجة عاجلة لروابط 404 المعطلة (${brokenLinks404.length} رابط مكتشف، مثل: ${sample}). جوجل يعتبر الروابط الداخلية المعطلة إهداراً لميزانية الزحف.`);
      needsListEn.push(`1. Immediate fix for broken 404 URLs (${brokenLinks404.length} detected, e.g. ${sample}). Internal broken links waste crawl budget.`);
    }

    if (canonicalIssues.length > 0) {
      needsListAr.push(`2. ضبط وسوم الكانونيكال (rel="canonical"): لديك ملاحظات متعلقة بتكرار العناوين أو غياب الكانونيكال الذاتي لمنع تشتت سلطة الصفحات.`);
      needsListEn.push(`2. Canonical Tag Alignment: Found canonical discrepancies that risk splitting PageRank signals across duplicate URLs.`);
    }

    if (metaDescIssues.length > 0) {
      needsListAr.push(`3. صياغة وسوم Meta Description فريدة: تم رصد صفحات تفتقر إلى وصف ميتا جذاب، مما يخفض نسبة النقر للظهور (CTR) في نتائج البحث.`);
      needsListEn.push(`3. Meta Description Optimization: Missing or duplicate meta descriptions reduce click-through rates (CTR) in search results.`);
    }

    if (titleIssues.length > 0) {
      needsListAr.push(`4. تحسين وتوحيد وسوم العناوين (Title Tags): تجنب تشابه العناوين بين الصفحات لمنع التنافس الداخلي (Keyword Cannibalization).`);
      needsListEn.push(`4. Title Tag Deduplication: Resolve identical titles across pages to prevent internal keyword cannibalization.`);
    }

    if (speedIssues.length > 0 || healthScore < 85) {
      needsListAr.push(`5. تسريع زمن استجابة الخادم وتحسين Core Web Vitals (LCP و CLS): تأكد من ضغط الصور بصيغة WebP وتحديد أبعاد العرض والارتفاع.`);
      needsListEn.push(`5. Core Web Vitals Acceleration: Compress hero images to WebP and explicitly declare width/height to avoid layout shifts (CLS).`);
    }

    if (needsListAr.length === 0) {
      needsListAr.push('1. الموقع في حالة تقنية ممتازة! التركيز الحالي يجب أن يكون على بناء سلطة المحتوى (Topical Authority) ونشر مقالات تغطي النوايا البحثية للمستخدمين.');
      needsListAr.push('2. تدعيم الروابط الداخلية (Internal Links) بين صفحات المقالات والصفحات الرئيسية لنقل سلطة الـ PageRank.');
      needsListAr.push('3. تطبيق البيانات المنظمة (Schema Markup) من نوع Article و Breadcrumb للحصول على نتائج منسقة (Rich Snippets).');

      needsListEn.push('1. Technical foundations are sound! Priority should now shift to building topical authority with user-first content.');
      needsListEn.push('2. Strengthen contextual internal linking between body content to distribute PageRank efficiently.');
      needsListEn.push('3. Implement JSON-LD Schema markup (Article & Breadcrumbs) to capture Google Rich Snippets.');
    }

    responseText = isAr
      ? `تحليل شامل وفوري: ما الذي يحتاجه موقعك (${projectDomain}) الآن؟\n\nدرجة الصحة التقنية الحالية: ${healthScore}%\nإجمالي المشاكل المكتشفة: ${issues.length} مشكلة (${criticalIssues.length} حرجة - ${warningIssues.length} تحذيرات)\n\nأهم الأولويات التي يحتاجها موقعك للترتيب في الصفحة الأولى:\n${needsListAr.join('\n\n')}\n\nخطة العمل المعتمدة من خوارزميات جوجل:\n• الخطوة 1: البدء بإصلاح المشاكل الحرجة في قائمة المهام (To-Do) والضغط على "تم الحل" للتحقق الفوري من الرابط.\n• الخطوة 2: مراجعة ملف robots.txt والـ sitemap والتأكد من عدم حجب ملفات التنسيق والـ JS.\n• الخطوة 3: تطبيق معايير E-E-A-T (إبراز خبرة الكاتب والمراجع الموثوقة).\n\nهل ترغب في أن أبدأ معك الآن في كتابة كود حل المشكلة الأولى خطوة بخطوة؟`
      : `Comprehensive Diagnostic: What does (${projectDomain}) need right now?\n\nCurrent Technical Health: ${healthScore}%\nTotal Detected Issues: ${issues.length} (${criticalIssues.length} Critical - ${warningIssues.length} Warnings)\n\nTop Priorities to Elevate Rankings:\n${needsListEn.join('\n\n')}\n\nGoogle Strategic Action Plan:\n• Phase 1: Resolve critical errors in your To-Do checklist and use "Done" for live URL verification.\n• Phase 2: Audit robots.txt and sitemap ensuring no CSS/JS assets are blocked.\n• Phase 3: Implement E-E-A-T trust signals (author credentials and verified sources).\n\nWould you like me to walk you through the exact code fix for the primary issue right now?`;

    // Record insight in agent memory
    recordLearnedInsight(projectDomain, `Audit analysis executed: ${criticalIssues.length} critical issues, health ${healthScore}%`);
  }

  // ---------------------------------------------------------------------------
  // Case 2: 404, Broken Links, Not Found
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('404') ||
    cleanPrompt.includes('مكسور') ||
    cleanPrompt.includes('معطل') ||
    cleanPrompt.includes('broken') ||
    cleanPrompt.includes('not found')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'status_404_handling')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'دليل جوجل للتعامل مع أخطاء الشبكة والـ 404' : 'Google Search Central: HTTP Network Errors';
    codeSnippet = topic.codeSnippet;

    if (brokenLinks404.length > 0) {
      const sampleUrls = brokenLinks404.slice(0, 3).map((b) => b.url).join('\n• ');
      responseText = isAr
        ? `بناءً على فحص موقعك (${projectDomain})، تم رصد (${brokenLinks404.length}) رابط معطل بكود 404. إليك عينة من الروابط المتأثرة:\n• ${sampleUrls}\n\nإرشادات Google Search Central للحل:\n1. قم بإلغاء أو تعديل كافة الروابط الداخلية داخل موقعك التي تشير إلى هذه العناوين المعطلة.\n2. إذا كان المحتوى القديم متاحاً على رابط بديل مكافئ، استخدم تحويل 301 دائم فوراً.\n3. إذا كانت الصفحة محذوفة نهائياً دون بديل، اتركها تعيد كود 404 صريح مع صفحة خطأ مخصصة تقدم روابط مساعدة للزائر، ولا تحولها عشوائياً للصفحة الرئيسية لأن جوجل يصنف ذلك كـ Soft 404 يضر بترتيبك.`
        : `Based on the audit for (${projectDomain}), we detected (${brokenLinks404.length}) broken 404 URLs. Sample URLs:\n• ${sampleUrls}\n\nGoogle Search Central Resolution Plan:\n1. Audit and update all internal links pointing to these 404 URLs.\n2. If equivalent replacement content exists, configure permanent 301 redirects.\n3. If permanently retired, return a clean 404 or 410 Gone with a helpful navigation page. Avoid mass-redirecting 404s to the homepage as Google flags this as Soft 404.`;
    } else {
      responseText = isAr
        ? `تحليل حالة الـ 404 لموقعك (${projectDomain}):\nلم يتم رصد أي روابط 404 داخلية في الفحص الأخير، وهو مؤشر ممتاز!\n\nوفق توثيق Google Search Central:\n${topic.officialRule_ar}\n\nخطة العمل الوقائية:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
        : `404 Status Review for (${projectDomain}):\nNo broken 404 URLs were found in the latest crawl, which is great!\n\nPer Google Search Central guidelines:\n${topic.officialRule_en}\n\nBest Practices:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
    }
  }

  // ---------------------------------------------------------------------------
  // Case 3: Canonical tags, Duplicate content
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('canonical') ||
    cleanPrompt.includes('كانونيكال') ||
    cleanPrompt.includes('تكرار') ||
    cleanPrompt.includes('duplicate')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'canonical_optimization')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'توثيق جوجل الرسمي لتوحيد الروابط المكررة' : 'Google Search Central: Consolidate Duplicate URLs';
    codeSnippet = topic.codeSnippet;

    responseText = isAr
      ? `تحليل وسم الكانونيكال لموقعك (${projectDomain}):\n${canonicalIssues.length > 0 ? `تم رصد (${canonicalIssues.length}) ملاحظة متعلقة بالكانونيكال في الفحص الأخير.\n\n` : `فحص الكانونيكال مستقر حالياً.\n\n`}${topic.officialRule_ar}\n\nخطوات التطبيق العملية وفق معايير جوجل:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Canonical Tag Analysis for (${projectDomain}):\n${canonicalIssues.length > 0 ? `Found (${canonicalIssues.length}) canonical issues in latest crawl.\n\n` : `Canonical configurations are currently sound.\n\n`}${topic.officialRule_en}\n\nGoogle Action Steps:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 4: Core Web Vitals, Speed, LCP, CLS, INP
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('سرعه') ||
    cleanPrompt.includes('سرعة') ||
    cleanPrompt.includes('بطيء') ||
    cleanPrompt.includes('بطء') ||
    cleanPrompt.includes('speed') ||
    cleanPrompt.includes('core web vitals') ||
    cleanPrompt.includes('lcp') ||
    cleanPrompt.includes('cls') ||
    cleanPrompt.includes('inp') ||
    cleanPrompt.includes('اداء') ||
    cleanPrompt.includes('أداء')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'core_web_vitals')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'إرشادات جوجل لتجربة الصفحة ومؤشرات الويب الأساسية' : 'Google Search Central: Page Experience in Search';
    codeSnippet = topic.codeSnippet;

    responseText = isAr
      ? `تحليل الأداء ومؤشرات Core Web Vitals لموقعك (${projectDomain}):\n${topic.officialRule_ar}\n\nخطة التسريع الفورية المعتمدة من جوجل:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Core Web Vitals & Speed Strategy for (${projectDomain}):\n${topic.officialRule_en}\n\nGoogle Optimization Action Plan:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 5: robots.txt or sitemap
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('robots') ||
    cleanPrompt.includes('sitemap') ||
    cleanPrompt.includes('سايت ماب') ||
    cleanPrompt.includes('زحف') ||
    cleanPrompt.includes('crawl')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'robots_txt_rules')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'دليل جوجل لملفات robots.txt وميزانية الزحف' : 'Google Search Central: Introduction to robots.txt';
    codeSnippet = topic.codeSnippet;

    responseText = isAr
      ? `إرشادات جوجل لملف robots.txt والـ Sitemap لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nتوصيات التطبيق السليمة:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Google robots.txt & Sitemap Architecture for (${projectDomain}):\n${topic.officialRule_en}\n\nImplementation Steps:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 6: Schema markup & Structured Data
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('سكيما') ||
    cleanPrompt.includes('بيانات منظمه') ||
    cleanPrompt.includes('بيانات منظمة') ||
    cleanPrompt.includes('schema') ||
    cleanPrompt.includes('json-ld') ||
    cleanPrompt.includes('rich snippets') ||
    cleanPrompt.includes('النتائج المنسقه')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'schema_structured_data')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'دليل جوجل لتطبيق البيانات المنظمة ونتائج البحث الغنية' : 'Google Search Central: Intro to Structured Data';
    codeSnippet = topic.codeSnippet;

    responseText = isAr
      ? `إرشادات تطبيق البيانات المنظمة (Schema.org) لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nخطة التنفيذ العملية:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Structured Data & Schema Strategy for (${projectDomain}):\n${topic.officialRule_en}\n\nImplementation Steps:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 7: Internal Linking & PageRank
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('روابط داخليه') ||
    cleanPrompt.includes('روابط داخلية') ||
    cleanPrompt.includes('internal link') ||
    cleanPrompt.includes('باك لينك داخلي')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'internal_linking_strategy')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'إرشادات جوجل للروابط القابلة للزحف والفهرسة' : 'Google Search Central: Crawlable Links';

    responseText = isAr
      ? `استراتيجية الروابط الداخلية وتوزيع الـ PageRank لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nقواعد التطبيق المعتمدة من جوجل:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Internal Linking Strategy for (${projectDomain}):\n${topic.officialRule_en}\n\nGoogle Best Practices:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 8: Indexing, Crawl Budget & Search Console
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('فهرس') ||
    cleanPrompt.includes('ارشف') ||
    cleanPrompt.includes('أرشف') ||
    cleanPrompt.includes('سيرش كونسول') ||
    cleanPrompt.includes('search console') ||
    cleanPrompt.includes('indexing') ||
    cleanPrompt.includes('crawl budget') ||
    cleanPrompt.includes('زحف')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'indexing_and_crawl_budget')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'دليل جوجل للتحكم في الفهرسة وميزانية الزحف' : 'Google Search Central: Managing Crawl Budget';
    codeSnippet = topic.codeSnippet;

    responseText = isAr
      ? `إدارة الفهرسة وتسريع زحف عناكب جوجل لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nخطة الفهرسة والتسريع:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Indexing Control & Crawl Budget Acceleration for (${projectDomain}):\n${topic.officialRule_en}\n\nActionable Implementation:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 9: Keyword Cannibalization & Content Overlap
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('تنافس الكلمات') ||
    cleanPrompt.includes('تكرار الكلمات') ||
    cleanPrompt.includes('ازدواجيه') ||
    cleanPrompt.includes('cannibalization')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'keyword_cannibalization')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'دليل جوجل لحل تنافس الكلمات المفتاحية ودمج المحتوى' : 'Google Search Central: Helpful Content & Consolidation';

    responseText = isAr
      ? `علاج تنافس الكلمات المفتاحية لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nخطوات المعالجة والدمج:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Resolving Keyword Cannibalization for (${projectDomain}):\n${topic.officialRule_en}\n\nConsolidation Protocol:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 10: Backlinks & Link Spam Policies
  // ---------------------------------------------------------------------------
  else if (
    cleanPrompt.includes('باك لينك') ||
    cleanPrompt.includes('روابط خارجيه') ||
    cleanPrompt.includes('روابط خلفيه') ||
    cleanPrompt.includes('backlink') ||
    cleanPrompt.includes('disavow') ||
    cleanPrompt.includes('spam')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'backlinks_and_link_spam')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'سياسات جوجل الرسمية لروابط السبام والباك لينكس' : 'Google Search Central: Link Spam Policies';

    responseText = isAr
      ? `تحليل جودة الروابط الخلفية لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nقواعد حماية النطاق وبناء الروابط الطبيعية:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Backlink Strategy & Spam Prevention for (${projectDomain}):\n${topic.officialRule_en}\n\nSafeguards & Natural Link Building:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // ---------------------------------------------------------------------------
  // Case 11: General fallback / Strategic Advice (Comprehensive SEO Consultation)
  // ---------------------------------------------------------------------------
  else {
    const learned = getLearnedInsights(projectDomain);
    const learnedNote =
      learned.length > 0
        ? (isAr ? `\n\nملاحظة من ذاكرة الموقع المستمرة: تم تسجيل الفحص والتحسينات السابقة لهذا النطاق.` : `\n\nSite Memory Note: Prior improvements and audits for this domain are preserved.`)
        : '';

    responseText = isAr
      ? `استشارة خبير السيو التقني لموقعك (${projectDomain}) - نقاط الصحة العامة: ${healthScore}%\n\nبناءً على فهم سؤالك ومطابقته مع إرشادات خوارزميات Google Search Central:\n\n1. حالة الموقع الحالية:\nيحتوي الموقع على (${criticalIssues.length}) مشكلة حرجة و(${warningIssues.length}) تحذيراً تقنياً بحاجة إلى متابعة.\n\n2. التوصية المباشرة:\nلتحقيق أفضل نتائج في الترتيب العضوي، ركز أولاً على حل مشاكل الروابط والأرشفة من صفحة مركز المشاكل، ثم تعزيز بنية الروابط الداخلية وجودة المحتوى وفق معايير E-E-A-T.${learnedNote}\n\nيمكنك أن تسألني: "الموقع محتاج ايه؟" أو تطلب خطة إصلاح لأي رابط محدد وسأقوم بتحليله فوراً!`
      : `Senior SEO Architect Consultation for (${projectDomain}) - Health Score: ${healthScore}%\n\nEvaluating your inquiry against Google Search Central guidelines:\n\n1. Real-time Status:\nYour website currently shows (${criticalIssues.length}) critical issues and (${warningIssues.length}) warnings requiring attention.\n\n2. Direct Recommendation:\nFor maximum organic rank acceleration, focus on fixing crawl errors from the Issues center, then reinforce internal links and content quality per E-E-A-T standards.${learnedNote}\n\nFeel free to ask: "What does my site need?" or request an instant fix for any specific URL!`;
  }

  return {
    id: `ai-msg-${Date.now()}`,
    role: 'assistant',
    content: responseText,
    timestamp: new Date().toISOString(),
    docCitationUrl: citationUrl,
    docCitationTitle: citationTitle,
    codeSnippet,
  };
}
