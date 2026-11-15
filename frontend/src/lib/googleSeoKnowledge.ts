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
  {
    id: 'schema_structured_data',
    category: 'technical',
    title_ar: 'البيانات المنظمة (Schema.org / JSON-LD) والنتائج المنسقة (Rich Snippets)',
    title_en: 'Structured Data (Schema.org / JSON-LD) & Rich Results',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data',
    officialRule_ar:
      'توصي جوجل باستخدام تنسيق JSON-LD لتطبيق البيانات المنظمة. تساعد السكيما محركات البحث على فهم نوع المحتوى بدقة (مقال، منتج، منظمة، مسار تنقل Breadcrumb، أسئلة شائعة FAQ) وتتيح ظهور النجوم والأسعار والأسئلة مباشرة في نتائج البحث مما يرفع نسبة النقر (CTR) بنسبة تفوق 30%.',
    officialRule_en:
      'Google recommends JSON-LD for structured data markup. Schema enables Googlebot to parse entity relationships (Article, Product, Organization, Breadcrumb, FAQ) and renders rich snippets in SERPs, significantly elevating organic click-through rates.',
    actionPlan_ar: [
      'إضافة سكيما Organization و WebSite إلى الصفحة الرئيسية.',
      'إضافة سكيما BreadcrumbList في كافة الصفحات الفرعية لتسهيل مسار التصفح.',
      'تطبيق سكيما Article أو NewsArticle على المقالات، وسكيما Product على صفحات المنتجات.',
      'فحص الأكواد عبر أداة اختبار النتائج المنسقة الرسمية (Google Rich Results Test).',
    ],
    actionPlan_en: [
      'Embed Organization and WebSite schema on the homepage.',
      'Implement BreadcrumbList schema across all nested pages.',
      'Deploy Article schema on editorial posts and Product schema on commerce items.',
      'Validate markup using the official Google Rich Results Test tool.',
    ],
    codeSnippet: {
      language: 'json',
      code: `{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "عنوان المقال المحسن",\n  "author": {\n    "@type": "Person",\n    "name": "إسماعيل الأسيوطي"\n  }\n}`,
    },
  },
  {
    id: 'internal_linking_strategy',
    category: 'indexing',
    title_ar: 'استراتيجية الروابط الداخلية وتوزيع سلطة الصفحات (PageRank Distribution)',
    title_en: 'Internal Linking Architecture & PageRank Flow',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/crawling-indexing/links-crawlable',
    officialRule_ar:
      'تؤكد جوجل أن الروابط الداخلية تمثل البنية التحتية لفهم أهمية الصفحات (Topical Authority). كل رابط داخلي ينقل جزءاً من سلطة الصفحة ويساعد في اكتشاف المحتوى الجديد. احرص على استخدام نص رابط وصفي واضح (Descriptive Anchor Text) وتجنب العبارات العامة مثل "اضغط هنا". وتأكد من عدم وجود صفحات يتيمة (Orphan Pages) لا يصل إليها أي رابط داخلي.',
    officialRule_en:
      'Google affirms that internal links map architectural hierarchy and distribute PageRank across URLs. Use keyword-rich, descriptive anchor text reflecting target context instead of generic phrases like "click here". Eliminate orphan pages by ensuring every indexable URL receives at least one contextual internal link.',
    actionPlan_ar: [
      'ربط المقالات الجديدة بالمقالات القديمة ذات الصلة والعكس.',
      'استخدام نصوص روابط (Anchor text) طبيعية توضح محتوى الصفحة المستهدفة بدقة.',
      'فحص الصفحات اليتيمة وربطها من الصفحات الرئيسية والتصنيفات.',
      'التأكد من أن الروابط مكتوبة بصيغة <a> صريحة مع خاصية href وليس بأحداث javascript:void(0).',
    ],
    actionPlan_en: [
      'Cross-link topically relevant articles naturally within body copy.',
      'Use contextual, descriptive anchor texts clarifying destination topics.',
      'Rescue orphan pages by establishing inbound pathways from category silos.',
      'Format links with standard crawlable <a href="..."> HTML tags rather than JS click handlers.',
    ],
  },
  {
    id: 'indexing_and_crawl_budget',
    category: 'indexing',
    title_ar: 'إدارة الفهرسة وميزانية الزحف (Crawl Budget & Indexing Control)',
    title_en: 'Indexing Controls & Crawl Budget Optimization',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget',
    officialRule_ar:
      'توضح جوجل أن إدارة ميزانية الزحف وفهرسة الصفحات تتطلب منع محركات البحث من إهدار الوقت في فحص صفحات الفلاتر أو نتائج البحث الداخلي أو المعلمات (URL Parameters). استخدم وسم <meta name="robots" content="noindex, follow"> للصفحات الضعيفة أو الإدارية، واعتمد خريطة الموقع XML لتسريع اكتشاف الصفحات الاستراتيجية فقط.',
    officialRule_en:
      'Google emphasizes that controlling crawl budget and indexation involves blocking crawlers from low-value facets, query strings, and admin endpoints. Use <meta name="robots" content="noindex, follow"> on non-canonical utilities, and maintain clean XML sitemaps to guide Googlebot directly to high-value URLs.',
    actionPlan_ar: [
      'إضافة noindex للصفحات المؤقتة والداخلية وصفحات الشكر وسلات الشراء.',
      'تنظيف خريطة الموقع XML من أي صفحات تعيد كود 404 أو تحويلات 301.',
      'مراقبة تقرير تغطية الفهرسة (Page Indexing Report) في Google Search Console.',
      'تجنب حجب روابط الـ CSS و JavaScript في ملف robots.txt لتتمكن جوجل من رندرة الصفحات بشكل صحيح.',
    ],
    actionPlan_en: [
      'Set noindex tags on thank-you, internal search, and transactional cart pages.',
      'Keep XML sitemaps free of 404 errors, redirects, or canonical mismatches.',
      'Monitor Google Search Console Page Indexing reports for discovered vs indexed status.',
      'Never disallow core CSS or JavaScript assets in robots.txt to ensure full browser rendering.',
    ],
    codeSnippet: {
      language: 'html',
      code: '<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">',
    },
  },
  {
    id: 'keyword_cannibalization',
    category: 'content',
    title_ar: 'حل تنافس وازدواجية الكلمات المفتاحية (Keyword Cannibalization)',
    title_en: 'Resolving Keyword Cannibalization & Intent Overlap',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content',
    officialRule_ar:
      'يحدث تنافس الكلمات المفتاحية عندما تستهدف صفحتان أو أكثر في نفس الموقع نفس النية البحثية (Search Intent)، مما يؤدي إلى تشتيت إشارات الترتيب وتناوب الصفحات في نتائج البحث دون استقرار. تنصح جوجل بدمج الصفحات المتشابهة في مقال أو صفحة رئيسية شاملة (Content Consolidation) واستخدام تحويل 301 دائم من الصفحات المدمجة إلى الصفحة الأقوى.',
    officialRule_en:
      'Keyword cannibalization occurs when multiple pages target the same search intent, diluting PageRank signals and causing ranking instability. Google recommends consolidating duplicate intent pages into a single comprehensive authority piece and redirecting redundant URLs via 301.',
    actionPlan_ar: [
      'حصر الصفحات التي تنافس بعضها على نفس الكلمة المفتاحية في تقرير الأداء.',
      'دمج أفضل الفقرات من الصفحات الفرعية داخل الصفحة الأكثر سلطة وأقدمية.',
      'عمل تحويل 301 دائم من الروابط القديمة إلى الرابط الموحد.',
      'تحديث كافة الروابط الداخلية لتشير مباشرة إلى الرابط الموحد الجديد.',
    ],
    actionPlan_en: [
      'Identify overlapping pages targeting identical queries in GSC performance reports.',
      'Consolidate top content elements into the highest-authority parent page.',
      'Establish permanent 301 redirects from secondary URLs to the consolidated guide.',
      'Update internal links throughout the site to point to the new single authority source.',
    ],
  },
  {
    id: 'backlinks_and_link_spam',
    category: 'technical',
    title_ar: 'جودة الروابط الخلفية وسياسات مكافحة السبام (Google Link Spam Policies)',
    title_en: 'Backlink Quality & Google Link Spam Guidelines',
    googleOfficialDocUrl: 'https://developers.google.com/search/docs/essentials/spam-policies#link-spam',
    officialRule_ar:
      'تحذر جوجل بشدة من شراء الروابط الخلفية أو برامج تبادل الروابط التلقائية. أي رابط مدفوع أو إعلاني يجب أن يحمل وسم rel="sponsored" أو rel="nofollow". تركز جوجل الحديثة على خوارزمية SpamBrain لتحييد الروابط المشبوهة تلقائياً، والسبيل الوحيد للنجاح طويل الأمد هو بناء روابط طبيعية ناتجة عن محتوى عالي القيمة يقتبسه الآخرون تلقائياً.',
    officialRule_en:
      'Google strictly prohibits purchasing links or automated link exchanges. Sponsored or paid links must include rel="sponsored" or rel="nofollow". Modern Google algorithms like SpamBrain neutralize suspicious links automatically; legitimate long-term authority comes from organic citations earned by authoritative content.',
    actionPlan_ar: [
      'وضع rel="sponsored" أو rel="nofollow" على أي إعلانات أو روابط ترويجية خارجية.',
      'الابتعاد التام عن شبكات بيع الباك لينكس التلقائية لتفادي العقوبات الخوارزمية.',
      'بناء أصول محتوى تستحق المشاركة (أدوات مجانية، إحصائيات، دراسات حالة موثوقة).',
      'فحص ملف الروابط الخارجية بانتظام واستبعاد الروابط المشبوهة إذا لزم الأمر.',
    ],
    actionPlan_en: [
      'Tag all sponsored content and affiliate partnerships with rel="sponsored" or rel="nofollow".',
      'Avoid link farms and automated private blog networks (PBNs) to safeguard domain health.',
      'Create linkable assets (original studies, calculators, high-utility frameworks).',
      'Regularly audit referral anchor texts to verify clean, natural profile growth.',
    ],
  },
];
