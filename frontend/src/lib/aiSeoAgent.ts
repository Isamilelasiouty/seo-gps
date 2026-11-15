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
      ? `مرحباً بك، أنا خبير ومستشار الـ SEO التقني في SEO GPS. أمتلك عقوداً من الخبرة المتراكمة في خوارزميات محركات البحث ومطابقة معايير Google Search Central الرسمية.\n\nأنا مطلع على التحليل الفني لموقعك والمشاكل المكتشفة حالياً في الفحص. تفضل بطرح أي استفسار حول كيفية إصلاح الأخطاء التقنية، رفع سرعة الموقع (Core Web Vitals)، ضبط وسوم الكانونيكال والـ robots.txt، أو تحسين تصنيف المحتوى وفق معايير E-E-A-T.`
      : `Welcome! I am your Technical SEO Architect & Google Search Specialist at SEO GPS, trained on decades of algorithmic principles and official Google Search Central guidelines.\n\nI have real-time visibility into your website's audit data and detected issues. Ask me anything about resolving technical errors, accelerating Core Web Vitals, configuring canonicals and robots.txt, or optimizing content quality according to Google's E-E-A-T criteria.`,
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

  const cleanPrompt = prompt.trim().toLowerCase();

  // 1. Analyze detected issues for this exact site
  const criticalIssues = issues.filter((i) => i.severity === 'critical');
  const warningIssues = issues.filter((i) => i.severity === 'warning');
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

  // Case A: Query about 404 or broken links
  if (
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

  // Case B: Query about Canonical tags
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

  // Case C: Query about Core Web Vitals, speed, performance
  else if (
    cleanPrompt.includes('سرعة') ||
    cleanPrompt.includes('speed') ||
    cleanPrompt.includes('core web vitals') ||
    cleanPrompt.includes('lcp') ||
    cleanPrompt.includes('cls') ||
    cleanPrompt.includes('inp') ||
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

  // Case D: Query about robots.txt or sitemap
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

  // Case E: Query about Titles, Meta descriptions or Heading tags
  else if (
    cleanPrompt.includes('عنوان') ||
    cleanPrompt.includes('title') ||
    cleanPrompt.includes('وصف') ||
    cleanPrompt.includes('description') ||
    cleanPrompt.includes('h1') ||
    cleanPrompt.includes('h2')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'meta_title_and_description')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'توثيق جوجل لصياغة روابط العناوين والميتا' : 'Google Search Central: Controlling Title Links';
    codeSnippet = topic.codeSnippet;

    responseText = isAr
      ? `تحسين العناوين ووصف الصفحات لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nتوصيات خبراء جوجل:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `Title Tag & Meta Description Optimization for (${projectDomain}):\n${topic.officialRule_en}\n\nGoogle Recommendations:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // Case F: Query about E-E-A-T or Content Quality
  else if (
    cleanPrompt.includes('eeat') ||
    cleanPrompt.includes('محتوى') ||
    cleanPrompt.includes('content') ||
    cleanPrompt.includes('جودة') ||
    cleanPrompt.includes('خوارزمية')
  ) {
    const topic = GOOGLE_SEO_KNOWLEDGE_TOPICS.find((t) => t.id === 'helpful_content_and_eeat')!;
    citationUrl = topic.googleOfficialDocUrl;
    citationTitle = isAr ? 'إرشادات جوجل لنظام المحتوى المفيد ومعايير EEAT' : 'Google Search Central: Creating Helpful, Reliable Content';

    responseText = isAr
      ? `معايير جودة المحتوى والـ E-E-A-T لموقع (${projectDomain}):\n${topic.officialRule_ar}\n\nخطة تطوير سلطة وموثوقية موقعك:\n${topic.actionPlan_ar.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
      : `E-E-A-T & Helpful Content Strategy for (${projectDomain}):\n${topic.officialRule_en}\n\nActionable Trust Building Plan:\n${topic.actionPlan_en.map((a, i) => `${i + 1}. ${a}`).join('\n')}`;
  }

  // Case G: General Site Audit Summary & Top Priorities
  else {
    responseText = isAr
      ? `تقرير استشاري شامل لموقعك (${projectDomain}) - نقاط الصحة العامة: ${healthScore}%\n\nبصفتي خبير السيو التقني المعتمد، قمت بمراجعة كافة مخرجات فحص موقعك ومقارنتها بمعايير Google Search Central:\n\n1. المشاكل الحرجة (${criticalIssues.length}):\n${criticalIssues.length > 0 ? criticalIssues.slice(0, 3).map((c, i) => `• ${c.title_ar || c.title}: ${c.url}`).join('\n') : '• لا توجد مشاكل حرجة تعيق الفهرسة حالياً.'}\n\n2. التحذيرات التقنية (${warningIssues.length}):\n${warningIssues.length > 0 ? warningIssues.slice(0, 3).map((w, i) => `• ${w.title_ar || w.title}: ${w.url}`).join('\n') : '• مؤشرات التحذير في النطاق الآمن.'}\n\nأولويات العمل الفورية الموصى بها:\n1. معالجة أي صفحات 404 معطلة وتحديث الروابط الداخلية.\n2. ضمان وجود وسوم canonical مطلقة لمنع تشتت سلطة الصفحات.\n3. تسريع عنصر LCP وحجز مساحات الصور لتجنب انزياح العناصر (CLS).\n\nيمكنك سؤالي عن أي مشكلة محددة أو طلب كود برمجي مخصص لمعالجتها فوراً!`
      : `Comprehensive Technical SEO Consultation for (${projectDomain}) - Health Score: ${healthScore}%\n\nReviewing your website audit against Google Search Central standards:\n\n1. Critical Issues (${criticalIssues.length}):\n${criticalIssues.length > 0 ? criticalIssues.slice(0, 3).map((c, i) => `• ${c.title_en || c.title}: ${c.url}`).join('\n') : '• No critical indexation blockers found.'}\n\n2. Technical Warnings (${warningIssues.length}):\n${warningIssues.length > 0 ? warningIssues.slice(0, 3).map((w, i) => `• ${w.title_en || w.title}: ${w.url}`).join('\n') : '• Warnings within safe tolerance.'}\n\nGoogle Priority Recommendations:\n1. Resolve all broken 404 links and update internal references.\n2. Ensure self-referencing absolute canonicals.\n3. Accelerate primary LCP hero asset and fix layout shifts (CLS).\n\nFeel free to ask for specific code fixes or detailed technical implementations!`;
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
