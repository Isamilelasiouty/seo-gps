/**
 * Google Search Central Comprehensive SEO Knowledge Base
 * Compiled from official Google Search documentation, Google Search Essentials,
 * web.dev Core Web Vitals guidelines, and technical crawling & indexing references.
 */

export interface GoogleSeoDocTopic {
  id: string;
  category: 'technical' | 'content' | 'crawling' | 'performance' | 'indexing';
  title_ar: string;
  title_en: string;
  googleOfficialDocUrl: string;
  officialRule_ar: string;
  officialRule_en: string;
  actionPlan_ar: string[];
  actionPlan_en: string[];
  codeSnippet?: {
    language: string;
    code: string;
  };
}

export const GOOGLE_SEO_KNOWLEDGE_TOPICS: GoogleSeoDocTopic[] = [
  {
    id: 'status_404_handling',
    category: 'crawling',
    title_ar: 'التعامل مع روابط 404 والصفحات المعطلة وفق إرشادات جوجل',
    title_en: 'Handling 404 & Broken Pages according to Google Guidelines',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/crawling-indexing/http-network-errors',
    officialRule_ar:
      'توضح إرشادات Google Search Central أن صفحات 404 العادية لا تضر بترتيب الموقع تلقائياً إذا كانت الصفحة محذوفة بالفعل. ولكن إذا كانت روابط داخلية مكسورة تؤدي إلى 404، فإنها تهدر ميزانية الزحف (Crawl Budget) وتضر بتجربة المستخدم. ويجب استخدام إعادة التوجيه 301 فقط إذا كان هناك بديل مباشر ومكافئ للمحتوى، وتجنب الـ Soft 404 التي تعيد كود 200 لمحتوى غير موجود.',
    officialRule_en:
      'Google Search Central clarifies that genuine 404s do not harm site ranking if the content is truly gone. However, internal broken links leading to 404 waste crawl budget and disrupt user experience. Use 301 redirects only when an exact or closely equivalent substitute exists, and strictly avoid Soft 404s (returning 200 OK for missing content).',
    actionPlan_ar: [
      'تحديد كافة الروابط الداخلية التي تشير إلى رابط 404 وتحديثها فوراً إلى الرابط الصحيح.',
      'إذا كان للرابط المعطل صفحة بديلة مكافئة في المحتوى، قم بعمل تحويل 301 دائم إليها.',
      'إذا كانت الصفحة محذوفة نهائياً دون بديل، اتركها تعيد كود 404 أو 410 (Gone) صريح مع صفحة 404 مخصصة مفيدة.',
      'حذف الرابط المعطل من ملف الـ sitemap.xml إن وجد.',
    ],
    actionPlan_en: [
      'Audit all internal links pointing to the 404 URL and update them to working URLs.',
      'If an equivalent replacement page exists, implement a permanent 301 redirect.',
      'If the content is permanently retired with no equivalent, serve a clean 404 or 410 Gone with a helpful custom 404 page.',
      'Remove the broken URL from your sitemap.xml immediately.',
    ],
    codeSnippet: {
      language: 'nginx',
      code: `# Nginx 301 Permanent Redirect for equivalent URL\nlocation = /old-broken-page {\n    return 301 https://example.com/new-equivalent-page;\n}`,
    },
  },
  {
    id: 'canonical_optimization',
    category: 'indexing',
    title_ar: 'ضبط وسوم الكانونيكال (rel="canonical") وتجنب المحتوى المكرر',
    title_en: 'Canonical Tag Optimization (rel="canonical") & Duplicate Content',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls',
    officialRule_ar:
      'وفق توثيق جوجل الرسمي، فإن وسم rel="canonical" يمثل إشارة قوية (Strong Hint) لخوارزميات الفهرسة لاختيار النسخة الأساسية (Canonical Version) لتوحيد إشارات الترتيب وروابط الباك لينك. يجب أن يكون الرابط مطلقاً (Absolute URL) شاملاً https://، ويُفضل استخدام Canonical ذاتي (Self-referencing canonical) في كل صفحة لتفادي مشاكل بارامترات التتبع (UTM/Query Strings).',
    officialRule_en:
      'Per official Google documentation, rel="canonical" serves as a strong hint for Googlebot to consolidate duplicate signals and backlinks into a single master URL. Always specify absolute URLs including protocol (https://), and implement self-referencing canonicals across all pages to neutralize URL parameters and tracking queries.',
    actionPlan_ar: [
      'التأكد من وجود وسم canonical مطلق واحد فقط داخل قسم <head> في كل صفحة.',
      'التأكد من تطابق البروتوكول (https) والنطاق الفرعي (مع www أو بدون www) مع النسخة المعتمدة في Google Search Console.',
      'في صفحات التصفح والفرز (Faceted Navigation)، وجّه الكانونيكال إلى الصفحة الرئيسية للتصنيف لتفادي استهلاك ميزانية الزحف.',
    ],
    actionPlan_en: [
      'Ensure exactly one absolute canonical tag is present inside the <head> of each page.',
      'Match the protocol (https) and www/non-www version with your primary property in Search Console.',
      'For parameterized or faceted navigation pages, canonicalize to the primary category URL to conserve crawl budget.',
    ],
    codeSnippet: {
      language: 'html',
      code: `<!-- Standard Google-compliant Self-Referencing Canonical -->\n<link rel="canonical" href="https://example.com/target-page/" />`,
    },
  },
  {
    id: 'robots_txt_rules',
    category: 'crawling',
    title_ar: 'إرشادات جوجل لصياغة ملف robots.txt والتحكم في الزحف',
    title_en: 'Google Guidelines for robots.txt & Crawl Management',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/crawling-indexing/robots/intro',
    officialRule_ar:
      'قاعدة ذهبية من جوجل: ملف robots.txt مخصص لإدارة الزحف (Crawl Management) وليس لمنع الفهرسة (Indexing Prevention). إذا كان هناك رابط محجوب عبر robots.txt ولديه روابط خارجية تشير إليه، فقد يقوم جوجل بفهرسته بدون محتوى! لمنع الفهرسة، يجب السماح للروبوت بالزحف ووضع وسم <meta name="robots" content="noindex"> داخل الصفحة.',
    officialRule_en:
      'Google golden rule: robots.txt is strictly for managing crawl traffic, NOT for preventing indexation. If a URL blocked by robots.txt has inbound backlinks, Google may still index the bare URL without snippets! To block indexation, allow crawling and use <meta name="robots" content="noindex">.',
    actionPlan_ar: [
      'لا تستخدم Disallow في robots.txt للصفحات التي ترغب في تطبيق noindex عليها.',
      'تأكد من عدم حجب ملفات الـ CSS والـ JavaScript في robots.txt لتمكين جوجل من رندرة وفهم الصفحة بشكل سليم.',
      'قم بتضمين رابط ملف الـ sitemap الكامل في نهاية ملف robots.txt.',
    ],
    actionPlan_en: [
      'Do not disallow URLs in robots.txt that you want removed via noindex meta tags.',
      'Never block CSS, JS, or image resources required for Googlebot to render the page layout accurately.',
      'Include the absolute URL of your sitemap index at the bottom of robots.txt.',
    ],
    codeSnippet: {
      language: 'txt',
      code: `User-agent: *\nDisallow: /admin/\nDisallow: /checkout/\n\nSitemap: https://example.com/sitemap.xml`,
    },
  },
  {
    id: 'core_web_vitals',
    category: 'performance',
    title_ar: 'تحسين مؤشرات تجربة المستخدم الأساسية (Core Web Vitals)',
    title_en: 'Core Web Vitals Optimization (LCP, INP, CLS)',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/appearance/page-experience',
    officialRule_ar:
      'تعتبر مؤشرات أداء الويب الأساسية عاملاً مؤكداً في تجربة المستخدم: LCP (سرعة تحميل أكبر عنصر) يجب ألا يتجاوز 2.5 ثانية، INP (زمن الاستجابة للتفاعل) أقل من 200 مللي ثانية، و CLS (استقرار العناصر البصرية) أقل من 0.1. توصي جوجل بضغط الصور بصيغ حديثة (WebP/AVIF)، وحجز أبعاد الصور width/height لمنع انزياح العناصر، واستخدام preload لعناصر LCP الحيوية.',
    officialRule_en:
      'Core Web Vitals are confirmed user experience signals: Largest Contentful Paint (LCP < 2.5s), Interaction to Next Paint (INP < 200ms), and Cumulative Layout Shift (CLS < 0.1). Google recommends modern image compression (WebP/AVIF), explicit width/height attributes to prevent layout shifts, and preloading critical LCP assets.',
    actionPlan_ar: [
      'تحديد عنصر الـ LCP (صورة الغلاف أو عنوان المقال) وإعطائه الأولوية عبر fetchpriority="high" و preload.',
      'إلزام جميع الصور وإطارات iframe بأبعاد عرض وارتفاع صريحة لمنع انزياح الصفحة (CLS).',
      'تأجيل تنفيذ السكربتات غير الأساسية عبر defer أو async وتقليل حجم أكواد JavaScript لتسريع مؤشر INP.',
    ],
    actionPlan_en: [
      'Identify the hero LCP asset and accelerate it with fetchpriority="high" and rel="preload".',
      'Specify explicit width and height attributes on all images and iframes to eliminate CLS.',
      'Defer non-critical third-party JavaScript using defer/async to optimize INP responsiveness.',
    ],
    codeSnippet: {
      language: 'html',
      code: `<!-- Preloading LCP Hero Image with High Priority -->\n<link rel="preload" fetchpriority="high" as="image" href="/hero.webp" type="image/webp">\n<img src="/hero.webp" width="1200" height="630" alt="Hero description" fetchpriority="high" />`,
    },
  },
  {
    id: 'meta_title_and_description',
    category: 'content',
    title_ar: 'صياغة عناوين الـ Title ووصف الـ Meta Description المعيارية',
    title_en: 'Standard Title Tag & Meta Description Optimization',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/appearance/title-link',
    officialRule_ar:
      'عنوان الصفحة (Title Link) هو العنصر الأبرز في نتائج بحث جوجل. توصي جوجل بعناوين واضحة ومميزة لكل صفحة (Unique) تتراوح بين 50 إلى 60 حرفاً (أقل من 600 بكسل) مع وضع الكلمة المفتاحية في البداية متبوعة باسم الموقع. وتجنب حشو الكلمات المفتاحية (Keyword Stuffing). أما الوصف Meta Description فيجب أن يكون جذاباً بين 140 إلى 155 حرفاً يلخص القيمة الفعلية للصفحة مع دعوة واضحة للإجراء (CTA).',
    officialRule_en:
      'Title links are the primary anchor in Google SERPs. Google advises unique, descriptive titles between 50-60 characters (< 600px) placing primary intent keywords first followed by the brand name. Avoid keyword stuffing. Meta descriptions should range 140-155 characters, summarizing unique content value with an actionable call-to-action.',
    actionPlan_ar: [
      'كتابة عنوان فريد ومخصص لكل صفحة يوضح الغرض الحقيقي للصفحة.',
      'تجنب تكرار نفس العنوان في أكثر من صفحة لمنع التعارض الداخلي (Cannibalization).',
      'صياغة وصف ميتا يقدم إجابة مباشرة لتحفيز نسبة النقر إلى الظهور (CTR).',
    ],
    actionPlan_en: [
      'Craft a unique title tag for every indexable URL reflecting true page purpose.',
      'Eliminate duplicate title tags to prevent internal keyword cannibalization.',
      'Write compelling meta descriptions answering user search intent to elevate organic CTR.',
    ],
    codeSnippet: {
      language: 'html',
      code: `<title>خدمات تحسين محركات البحث الاحترافية | سيو جي بي إس</title>\n<meta name="description" content="دليل شامل واستشارات متقدمة لفحص وإصلاح المشاكل التقنية في موقعك وفق أحدث خوارزميات جوجل. ابدأ الفحص الآن." />`,
    },
  },
  {
    id: 'helpful_content_and_eeat',
    category: 'content',
    title_ar: 'نظام المحتوى المفيد ومعايير الخبرة والموثوقية (E-E-A-T)',
    title_en: 'Google Helpful Content System & E-E-A-T Guidelines',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    officialRule_ar:
      'خوارزميات جوجل تركز على تجربة المستخدم أولاً (People-First Content) وليس المحتوى المصنوع فقط لمحركات البحث (Search Engine-First Content). معايير E-E-A-T تعني: الخبرة الشخصية (Experience)، المعرفة التخصصية (Expertise)، السلطة والمكانة (Authoritativeness)، والموثوقية والأمان (Trustworthiness). يجب توفير صفحة واضحة لملف الكاتب (Author Bio)، وصفحة "من نحن"، وسياسات الاستخدام والمصادر الموثوقة.',
    officialRule_en:
      'Google algorithms evaluate People-First content over search-engine-first tactics. E-E-A-T represents Experience, Expertise, Authoritativeness, and Trustworthiness. Sites must demonstrate clear editorial accountability, author credentials, an authoritative About Us page, and transparent source citations.',
    actionPlan_ar: [
      'إبراز اسم وخبرة كاتب المقال مع رابط لسيرته الذاتية ومؤهلاته.',
      'إضافة مصادر ومراجع حقيقية للدراسات والبيانات المذكورة في المحتوى.',
      'تجنب كتابة محتوى سطحي تم إنشاؤه آلياً بدون إضافة رأي أو فحص وتحليل حقيقي.',
      'تحديث المحتوى القديم دورياً لضمان دقته ومطابقته لواقع المستخدم الحالي.',
    ],
    actionPlan_en: [
      'Highlight author bios and expert credentials on every informational piece.',
      'Reference verified scientific or factual sources for statistics and claims.',
      'Avoid unedited generic AI output that lacks original research or personal case studies.',
      'Regularly review and refresh outdated content to preserve accuracy and authority.',
    ],
  },
  {
    id: 'heading_hierarchy',
    category: 'content',
    title_ar: 'التسلسل الهيكلي للعناوين (H1, H2, H3) وفق أفضل الممارسات',
    title_en: 'Semantic Heading Hierarchy (H1, H2, H3) Best Practices',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    officialRule_ar:
      'تستخدم محركات البحث وسوم العناوين لفهم بنية الصفحة وتقسيم الأفكار. توصي أفضل الممارسات بوجود عنوان H1 رئيسي واحد يصف الموضوع الأساسي بدقة، يليه عناوين H2 للأقسام الرئيسية، ثم H3 للنقاط الفرعية. تجنب القفز بين المستويات (مثل الانتقال من H1 إلى H3 مباشرة)، وتجنب استخدام وسوم العناوين لأغراض التصميم والتنسيق فقط.',
    officialRule_en:
      'Search engines parse heading tags to map semantic outline. Best practice dictates exactly one primary H1 accurately summarizing page intent, followed by descending H2 sections and H3 subpoints. Never skip hierarchy levels (e.g. H1 directly to H3), and avoid using headings solely for styling.',
    actionPlan_ar: [
      'التأكد من وجود وسم H1 واحد فقط لكل صفحة يحتوي على الفكرة المركزية.',
      'تقسيم المحتوى إلى فقرات منطقية تبدأ كل منها بعنوان H2 واضح.',
      'استبدال وسوم H المكررة في التذييل أو القائمة الجانبية بوسوم div أو span وتنسيقها بـ CSS.',
    ],
    actionPlan_en: [
      'Ensure a single dominant H1 per URL capturing core topical focus.',
      'Structure body copy into logical chapters introduced by informative H2s.',
      'Convert non-content heading tags in footers or sidebars to semantic div/span tags.',
    ],
  },
];
