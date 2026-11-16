/**
 * Comprehensive SEO Glossary (قاموس مصطلحات السيو التفاعلي).
 * Author: Ismail El Asiouty
 */

export interface GlossaryTerm {
  id: string;
  term_ar: string;
  term_en: string;
  category: 'crawling' | 'indexing' | 'technical' | 'content' | 'ai_geo' | 'performance';
  definition_ar: string;
  definition_en: string;
  why_it_matters_ar: string;
  why_it_matters_en: string;
  how_to_fix_ar: string;
  how_to_fix_en: string;
}

export const SEO_GLOSSARY: Record<string, GlossaryTerm> = {
  canonical: {
    id: 'canonical',
    term_ar: 'الرابط الأساسي (Canonical Tag)',
    term_en: 'Canonical Tag',
    category: 'indexing',
    definition_ar: 'وسم HTML يُخبر محركات البحث بالرابط الرسمي الأصلي للصفحة عند وجود صفحات مكررة أو ذات روابط متعددة لنفس المحتوى.',
    definition_en: 'An HTML link element that tells search engines which URL represents the master copy of a page.',
    why_it_matters_ar: 'يمنع مشاكل المحتوى المكرر ويجمع قوة الروابط والإشارات في عنوان URL واحد فقط بدلاً من تشتيتها.',
    why_it_matters_en: 'Prevents duplicate content issues and consolidates link equity to a single authoritative URL.',
    how_to_fix_ar: 'أضف <link rel="canonical" href="الرابط-الأصلي" /> داخل وسم <head>.',
    how_to_fix_en: 'Add a <link rel="canonical" href="MASTER_URL" /> inside the <head> section.',
  },
  noindex: {
    id: 'noindex',
    term_ar: 'أمر منع الفهرسة (Noindex)',
    term_en: 'Noindex Directive',
    category: 'indexing',
    definition_ar: 'توجيه في وسم meta robots يُلزم محركات البحث بعدم إظهار الصفحة في نتائج البحث نهائياً.',
    definition_en: 'A robots directive instructing search engines not to show the page in search results.',
    why_it_matters_ar: 'إذا وُضع بالخطأ على صفحة مهمة أو على الموقع كاملاً، تختفي الزيارات العضوية وتفقد الصفحة أرشفة جوجل فوراً.',
    why_it_matters_en: 'If added accidentally, the page will completely drop out of Google search results.',
    how_to_fix_ar: 'قم بإزالة noindex من كود الصفحة أو من إعدادات إضافة السيو (مثل Yoast أو Rank Math).',
    how_to_fix_en: 'Remove the noindex directive from meta tags or your CMS SEO plugin settings.',
  },
  orphan_page: {
    id: 'orphan_page',
    term_ar: 'الصفحة اليتيمة (Orphan Page)',
    term_en: 'Orphan Page',
    category: 'crawling',
    definition_ar: 'صفحة موجودة على موقعك (أو في خريطة الموقع) ولكن لا يوجد أي رابط داخلي من أي صفحة أخرى يشير إليها.',
    definition_en: 'A page on your site with no internal links pointing to it from other pages.',
    why_it_matters_ar: 'تكون شبه معزولة ولا تحصل على أي قوة روابط داخلية (PageRank)، مما يجعل زحفها وأرشفتها بطيئاً وضعيفاً جداً.',
    why_it_matters_en: 'Receives zero internal PageRank, making it difficult for users and crawlers to discover and rank.',
    how_to_fix_ar: 'أضف روابط سياقية طبيعية من المقالات والأقسام ذات الصلة تشير إلى هذه الصفحة.',
    how_to_fix_en: 'Add contextual internal links from relevant related pages or navigation menus.',
  },
  crawl_depth: {
    id: 'crawl_depth',
    term_ar: 'عمق النقر والزحف (Crawl Depth)',
    term_en: 'Crawl Depth',
    category: 'crawling',
    definition_ar: 'عدد النقرات المطلوبة للوصول إلى الصفحة انطلاقاً من الصفحة الرئيسية للموقع.',
    definition_en: 'The number of clicks needed to reach a page starting from the homepage.',
    why_it_matters_ar: 'الصفحات التي يزيد عمقها عن 3 نقرات تزورها عناكب جوجل بمعدل قليل جداً وتعتبرها الخوارزميات صفحات غير مهمة.',
    why_it_matters_en: 'Pages located 4+ clicks deep are crawled less frequently and treated as low importance.',
    how_to_fix_ar: 'اربط الصفحات العميقة من القوائم العلوية أو من مقالات المستوى الأول لتقليل عمقها إلى 2-3 نقرات.',
    how_to_fix_en: 'Link deeper pages from higher-level categories or related top pages.',
  },
  redirect_chain: {
    id: 'redirect_chain',
    term_ar: 'سلسلة التحويلات (Redirect Chain)',
    term_en: 'Redirect Chain',
    category: 'technical',
    definition_ar: 'عندما يُحول رابط إلى رابط آخر، ثم يُحول الأخير إلى ثالث (مثال: A -> B -> C).',
    definition_en: 'When a URL redirects to another URL, which in turn redirects to another (e.g. A -> B -> C).',
    why_it_matters_ar: 'تستهلك ميزانية الزحف، وتبطئ سرعة التصفح بنسبة 300%، وتؤدي إلى فقدان قوة الروابط عبر كل قفزة تحويل.',
    why_it_matters_en: 'Wastes crawl budget, adds latency for users, and can dilute link equity.',
    how_to_fix_ar: 'عدّل التحويل الأول ليشير مباشرة إلى الرابط النهائي (A -> C) وتجاوز الخطوات الوسيطة.',
    how_to_fix_en: 'Point the initial redirect directly to the final destination URL.',
  },
  hreflang: {
    id: 'hreflang',
    term_ar: 'وسم اللغات والمناطق (Hreflang)',
    term_en: 'Hreflang Attribute',
    category: 'indexing',
    definition_ar: 'وسم يخبر جوجل باللغة والمنطقة الجغرافية الموجهة لكل نسخة من الصفحة (مثل ar-SA للسعودية، en-US لأمريكا).',
    definition_en: 'An HTML attribute specifying the language and geographic targeting of a webpage.',
    why_it_matters_ar: 'يضمن ظهور النسخة العربية للزائر العربي والإنجليزية للزائر الأجنبي تلقائياً دون تنافس المحتوى.',
    why_it_matters_en: 'Ensures users in different regions and languages see the correct localized version in search.',
    how_to_fix_ar: 'أضف وسوم hreflang متبادلة متضمنة النسخة نفسها ووسم x-default.',
    how_to_fix_en: 'Include self-referencing hreflang tags, reciprocal return tags, and x-default.',
  },
  schema_structured_data: {
    id: 'schema_structured_data',
    term_ar: 'البيانات المنظمة (Structured Data / Schema)',
    term_en: 'Schema Structured Data',
    category: 'technical',
    definition_ar: 'شفرة برمجية موحدة (JSON-LD) تشرح لمحركات البحث تفاصيل محتوى الصفحة ككيانات (مقال، منتج، منظمة، أسئلة شائعة).',
    definition_en: 'Standardized format (JSON-LD) providing explicit clues about the meaning of a page to search engines.',
    why_it_matters_ar: 'تمنحك المقتطفات المميزة والنجوم والأسئلة الشائعة في نتائج البحث وترفع نسبة النقر (CTR).',
    why_it_matters_en: 'Enables rich results (stars, FAQ accordions, breadcrumbs) and improves CTR in SERPs.',
    how_to_fix_ar: 'استخدم كود JSON-LD متوافق مع معايير Schema.org واحقنه في وسم head.',
    how_to_fix_en: 'Embed valid JSON-LD schemas inside the page head according to Schema.org specs.',
  },
  geo_ai: {
    id: 'geo_ai',
    term_ar: 'تحسين محركات الذكاء الاصطناعي (GEO)',
    term_en: 'Generative Engine Optimization (GEO)',
    category: 'ai_geo',
    definition_ar: 'تهيئة محتوى وبيانات الموقع ليتم استخلاصها واقتباسها بدقة في إجابات نماذج الذكاء الاصطناعي (Google AI Overviews, SearchGPT, Perplexity).',
    definition_en: 'Optimizing site content and entity data to be cited and quoted by generative AI search models.',
    why_it_matters_ar: 'مستقبل البحث يعتمد على تقديم إجابات مباشرة وموثوقة، والمواقع المهيأة لـ GEO تحصل على الاستشهاد كمرجع رئيسي.',
    why_it_matters_en: 'AI engines synthesize direct answers; GEO ensures your brand is cited as the primary source.',
    how_to_fix_ar: 'أضف جداول، وقوائم، وفقرات إجابات مباشرة، واسمح لعناكب الذكاء الاصطناعي في robots.txt.',
    how_to_fix_en: 'Provide structured facts, concise answer summaries, tables, and verify AI crawler access.',
  },
  lcp: {
    id: 'lcp',
    term_ar: 'زمن عرض أكبر محتوى مرئي (LCP)',
    term_en: 'Largest Contentful Paint (LCP)',
    category: 'performance',
    definition_ar: 'مقياس من Core Web Vitals يقيس الوقت المستغرق لرسم أكبر عنصر مرئي (صورة رئيسية أو عنوان ضخم) على الشاشة.',
    definition_en: 'A Core Web Vitals metric measuring the time it takes to render the largest visible element.',
    why_it_matters_ar: 'أحد أهم عوامل تجربة المستخدم الرسمية في ترتيب جوجل؛ الحد المثالي أقل من 2.5 ثانية.',
    why_it_matters_en: 'Official Google ranking signal; a score under 2.5 seconds indicates a good user experience.',
    how_to_fix_ar: 'اضغط الصور، واستخدم تنسيق WebP/AVIF، وحسّن زمن استجابة السيرفر (TTFB).',
    how_to_fix_en: 'Compress hero images, convert to WebP/AVIF, and optimize server response time.',
  },
  cls: {
    id: 'cls',
    term_ar: 'تراكم التغيرات التخطيطية (CLS)',
    term_en: 'Cumulative Layout Shift (CLS)',
    category: 'performance',
    definition_ar: 'مقياس يقيس استقرار عناصر الصفحة أثناء التحميل وعدم قفز النصوص أو الأزرار فجأة عند نزول الإعلانات أو الصور.',
    definition_en: 'Measures visual stability and unexpected layout shifts during page rendering.',
    why_it_matters_ar: 'يمنع النقر الخاطئ ويزيد من رضا الزوار؛ النتيجة الممتازة أقل من 0.1.',
    why_it_matters_en: 'Prevents accidental misclicks and layout jumping; target score is under 0.1.',
    how_to_fix_ar: 'حدد أبعاد العرض والارتفاع (width & height) لجميع الصور والإعلانات مسبقاً في كود HTML.',
    how_to_fix_en: 'Always include width and height attributes on images and video elements.',
  },
};
