/**
 * SEO GPS High-Performance Web & WordPress Crawler Engine
 * Author: Ismail El Asiouty
 *
 * Crawls WordPress sites (wp-sitemap.xml, Yoast, Rank Math), standard sitemaps,
 * and custom programmed websites with internal link discovery.
 * Extracts technical signals, analyzes cannibalization, and compiles full Site Reports.
 */

export interface CrawledPage {
  url: string;
  statusCode: number;
  finalUrl?: string;
  responseTimeMs: number;
  source: 'sitemap' | 'internal_link' | 'root' | 'imported';
  foundOn?: string;
  title: string;
  titleLength: number;
  description: string;
  descLength: number;
  canonical: string;
  h1: string;
  h1Tags: string[];
  robots: string;
  isIndexable: boolean;
  schemas: string[];
  wordCount: number;
  pageType: 'home' | 'article' | 'product' | 'category' | 'contact' | 'about' | 'other';
  issues: IssueRecord[];
  redirectChain?: { from: string; to: string; status: number }[];
}

export interface IssueRecord {
  id: string;
  fingerprint: string;
  url: string;
  checkId: string;
  title: string;
  title_ar?: string;
  title_en?: string;
  severity: 'critical' | 'warning' | 'notice';
  confidence: 'high' | 'medium' | 'low';
  firstSeen: string;
  lastSeen: string;
  daysOpen: number;
  isBaseline: boolean;
  status: 'new' | 'persisting' | 'resolved' | 'reappeared' | 'ignored';
  details?: string;
  details_ar?: string;
  details_en?: string;
  evidence?: any;
  suggestion?: any;
}

export interface CannibalizationCluster {
  topic: string;
  topic_ar?: string;
  topic_en?: string;
  similarity: number;
  similarityScore: string;
  masterUrl: string;
  masterTitle: string;
  candidateUrl: string;
  candidateTitle: string;
  conflictingKeywords: string[];
  signals: string;
  signals_ar?: string;
  signals_en?: string;
  recommendation: string;
  recommendation_ar?: string;
  recommendation_en?: string;
}

export interface SiteReportSummary {
  health_score: number;
  total_discovered: number;
  total_crawled: number;
  total_skipped: number;
  critical_count: number;
  warning_count: number;
  notice_count: number;
  status_distribution: {
    ok_200: number;
    redirect_3xx: number;
    not_found_404: number;
    server_error_5xx: number;
    blocked_unverified: number;
  };
}

export interface TopFixItem {
  priority_score: number;
  title: string;
  title_ar?: string;
  title_en?: string;
  url: string;
  recommendation: string;
  recommendation_ar?: string;
  recommendation_en?: string;
  action_sentence: string;
  action_sentence_ar?: string;
  action_sentence_en?: string;
}

export interface SiteReportData {
  scan_id: string;
  project_id: string;
  domain: string;
  root_url: string;
  is_baseline: boolean;
  created_at: string;
  summary: SiteReportSummary;
  top_fixes: TopFixItem[];
  section_status: {
    total_404: number;
    false_404_count: number;
    true_dead_count: number;
    soft_404_count: number;
    false_404_ratio: string;
    false_404_items: any[];
    slug_recovery_items: any[];
    true_dead_items: any[];
    soft_404_items: any[];
  };
  section_redirects: {
    total_redirects: number;
    temporary_302_count: number;
    chains_count: number;
    loops_count: number;
    legacy_groups: any[];
    chains: any[];
    temporary_redirects: any[];
  };
  section_onpage: {
    outdated_years: any[];
    thin_pages: any[];
    noindex_pages: any[];
    canonical_issues: any[];
  };
  section_cannibalization: {
    clusters_count: number;
    clusters: any[];
  };
  section_schema: {
    gaps_count: number;
    gaps: any[];
  };
  section_taxonomy: {
    type_distribution: Record<string, number>;
    uncategorized_count: number;
    samples: any[];
  };
  section_action_plans: {
    role: 'engineering' | 'content' | 'technical_seo';
    title: string;
    title_ar?: string;
    title_en?: string;
    items: string[];
    items_ar?: string[];
    items_en?: string[];
  }[];
}

export interface FullAuditResult {
  success: boolean;
  domain: string;
  rootUrl: string;
  summary: SiteReportSummary;
  pages: CrawledPage[];
  issues: IssueRecord[];
  cannibalization: CannibalizationCluster[];
  siteReport: SiteReportData;
  error?: string;
}

// Arabic & English stop words for accurate keyword extraction
const STOP_WORDS = new Set([
  // Arabic grammatical particles & function words
  'في', 'من', 'على', 'إلى', 'عن', 'مع', 'هذا', 'هذه', 'كل', 'صفحة', 'رئيسية',
  'أو', 'لا', 'أن', 'هو', 'هي', 'التي', 'الذي', 'لـ', 'بـ', 'تم', 'كان', 'عام',
  'سنة', 'ما', 'كم', 'كيف', 'لماذا', 'متى', 'أين', 'هل', 'ذات', 'بين', 'حول',
  'بعد', 'قبل', 'عند', 'حيث', 'خلال', 'مثل', 'غير', 'بعض', 'أي', 'ثم', 'حتى',
  'إذا', 'إلا', 'فقط', 'كذلك', 'أيضا', 'جميع', 'وقد', 'ولم', 'ولن',
  // English function words
  'the', 'and', 'for', 'with', 'from', 'about', 'our', 'your', 'page', 'home',
  'all', 'more', 'how', 'what', 'when', 'why', 'where', 'which', 'who', 'this',
  'that', 'these', 'those', 'are', 'was', 'were', 'been', 'being', 'have', 'has',
  'had', 'does', 'did', 'doing', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'under', 'again', 'further',
]);

export function normalizeUrl(u: string): string {
  try {
    const p = new URL(u);
    let path = p.pathname.replace(/\/+$/, '');
    if (!path) path = '/';
    return `${p.protocol}//${p.host}${path}`;
  } catch (e) {
    return u.replace(/\/+$/, '') || '/';
  }
}
export function extractKeywords(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Calculates Jaccard similarity and returns overlapping keywords
 */
export function calculateKeywordOverlap(wordsA: string[], wordsB: string[]): { similarity: number; keywords: string[] } {
  if (wordsA.length === 0 || wordsB.length === 0) return { similarity: 0, keywords: [] };
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  const common = Array.from(setA).filter((w) => setB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  if (union.size === 0) return { similarity: 0, keywords: [] };
  const similarity = Math.round((common.length / union.size) * 100);
  return { similarity, keywords: common };
}

/**
 * Classifies page taxonomy based on URL and title
 */
export function classifyPageType(url: string, title: string): CrawledPage['pageType'] {
  const path = url.toLowerCase();
  if (path.endsWith('/') && path.split('/').filter(Boolean).length <= 2) return 'home';
  if (path.includes('/blog') || path.includes('/post') || path.includes('/article') || path.includes('/news') || path.includes('/مقالات') || path.includes('/مدونة')) return 'article';
  if (path.includes('/product') || path.includes('/item') || path.includes('/shop') || path.includes('/store') || path.includes('/منتج') || path.includes('/متجر')) return 'product';
  if (path.includes('/category') || path.includes('/tag') || path.includes('/section') || path.includes('/قسم') || path.includes('/تصنيف')) return 'category';
  if (path.includes('/contact') || path.includes('/اتصل') || path.includes('/تواصل')) return 'contact';
  if (path.includes('/about') || path.includes('/من-نحن') || path.includes('/عن-الموقع')) return 'about';
  return 'other';
}

/**
 * Resolves an issue title dynamically according to the active locale
 * Prevents language bleeding across Arabic and English.
 */
export function resolveIssueTitle(
  issue: { title: string; title_ar?: string; title_en?: string; checkId?: string },
  isAr: boolean
): string {
  if (isAr && issue.title_ar) return issue.title_ar;
  if (!isAr && issue.title_en) return issue.title_en;

  const id = issue.checkId || '';
  if (id === 'http_status_404') return isAr ? 'صفحة مفقودة (كود 404)' : 'Broken Page (HTTP 404 Not Found)';
  if (id === 'http_status_5xx') return isAr ? 'خطأ في الخادم (5xx)' : 'Server Error (HTTP 5xx)';
  if (id === 'soft_404') return isAr ? 'خطأ ناعم Soft 404 (كود 200 مع رسالة خطأ)' : 'Soft 404 (200 OK with Not Found content)';
  if (id === 'redirect_status') return isAr ? 'تحويل صفحة (3xx)' : 'Page Redirect (3xx)';
  if (id === 'meta_noindex') return isAr ? 'وسم Noindex يمنع أرشفة الصفحة' : 'Noindex directive blocks indexing';
  if (id === 'title_missing') return isAr ? 'عنوان الصفحة (Title Tag) مفقود' : 'Missing Title tag';
  if (id === 'title_too_long') return isAr ? 'عنوان الصفحة طويل جداً' : 'Title tag too long';
  if (id === 'title_too_short') return isAr ? 'عنوان الصفحة قصير جداً' : 'Title tag too short';
  if (id === 'meta_description_missing') return isAr ? 'وصف الميتا (Meta Description) مفقود' : 'Missing Meta Description tag';
  if (id === 'h1_missing') return isAr ? 'وسم H1 مفقود في الصفحة' : 'Missing H1 Heading tag';
  if (id === 'h1_multiple') return isAr ? 'يوجد أكثر من وسم H1 في الصفحة' : 'Multiple H1 tags detected';
  if (id === 'canonical_mismatch') return isAr ? 'تعارض الرابط الأساسي Canonical' : 'Canonical URL mismatch';
  if (id === 'outdated_year') return isAr ? 'سنة قديمة في العنوان أو H1' : 'Outdated year in Title or H1';
  if (id === 'thin_content') return isAr ? 'محتوى نصي ضعيف (< 200 كلمة)' : 'Thin content (< 200 words)';
  if (id === 'schema_missing') return isAr ? 'غياب البيانات المنظمة (Schema.org)' : 'Missing Structured Data (Schema)';
  if (id === 'content_cannibalization') return isAr ? 'تنافس كلمات دلالية وازدواجية محتوى' : 'Keyword Cannibalization conflict';

  // Fallback pattern matching
  const hasArabic = /[\u0600-\u06FF]/.test(issue.title);
  if (!isAr && hasArabic) {
    if (issue.title.includes('404')) return 'HTTP 404 Not Found';
    if (issue.title.includes('تحويل')) return '301/302 URL Redirect';
    if (issue.title.includes('سنة')) return 'Outdated year in Title/H1';
    if (issue.title.includes('تنافس')) return 'Keyword Cannibalization Conflict';
    if (issue.title.includes('عنوان')) return 'Title Tag Optimization Issue';
    if (issue.title.includes('وصف')) return 'Meta Description Issue';
  } else if (isAr && !hasArabic) {
    if (issue.title.toLowerCase().includes('404')) return 'صفحة مفقودة 404 Not Found';
    if (issue.title.toLowerCase().includes('redirect')) return 'تحويل رابط 3xx';
    if (issue.title.toLowerCase().includes('outdated')) return 'سنة قديمة في العنوان';
    if (issue.title.toLowerCase().includes('cannibal')) return 'تنافس كلمات دلالية بين المقالات';
    if (issue.title.toLowerCase().includes('title')) return 'خلل في عنوان الصفحة';
    if (issue.title.toLowerCase().includes('description')) return 'خلل في وصف الميتا';
  }

  return issue.title;
}

/**
 * Resolves Top Fix Item text dynamically according to the active locale
 */
export function resolveTopFix(
  fix: {
    title: string;
    title_ar?: string;
    title_en?: string;
    recommendation: string;
    recommendation_ar?: string;
    recommendation_en?: string;
    action_sentence: string;
    action_sentence_ar?: string;
    action_sentence_en?: string;
    url?: string;
  },
  isAr: boolean
): { title: string; recommendation: string; action_sentence: string } {
  let title = (isAr ? fix.title_ar : fix.title_en) || fix.title;
  let recommendation = (isAr ? fix.recommendation_ar : fix.recommendation_en) || fix.recommendation;
  let action_sentence = (isAr ? fix.action_sentence_ar : fix.action_sentence_en) || fix.action_sentence;

  const hasArabic = /[\u0600-\u06FF]/.test(title);

  if (isAr && !hasArabic) {
    if (title.includes('False 404') || title.includes('%20')) {
      title = 'إصلاح رابط 404 ناتج عن مسافة بيضاء زائدة (%20)';
      recommendation = 'إزالة رمز %20 الزائد في الرابط الداخلي بالصفحة الرئيسية';
      action_sentence = 'تعديل الرابط في كود الصفحة وإزالة المسافة الزائدة';
    } else if (title.includes('Redirect') || title.includes('301')) {
      title = 'تحويل 301 للرابط المقطوع أو المعطل';
      recommendation = 'إضافة تحويل 301 دائم في الخادم للإشارة إلى الوجهة الفعالة';
      action_sentence = 'إضافة تحويل 301 دائم في الخادم';
    } else if (title.includes('Outdated') || title.includes('202')) {
      title = 'تحديث السنة القديمة في العنوان والـ H1';
      recommendation = 'تحديث السنة القديمة لضمان الحفاظ على معدل النقر (CTR)';
      action_sentence = 'تحديث السنة في العنوان والفقرات إلى السنة المستهدفة';
    } else if (title.includes('Thin')) {
      title = 'إثراء محتوى الصفحة الضعيف (< 200 كلمة)';
      recommendation = 'إضافة محتوى نصي مفيد ومفصل للزائر يتجاوز 250 كلمة';
      action_sentence = 'توسيع المحتوى وإضافة فقرات تفصيلية';
    } else if (title.includes('Noindex')) {
      title = 'إزالة وسم Noindex لاستعادة أرشفة الصفحة';
      recommendation = 'إزالة وسم Noindex من كود الصفحة للظهور في محركات البحث';
      action_sentence = 'حذف noindex من وسم robots meta';
    } else if (title.includes('Cannibal') || title.includes('Keyword')) {
      title = 'حل تنافس الكلمات بين المقالات المتشابهة';
      recommendation = 'دمج المقالين أو عمل تحويل 301 للمقال الأضعف';
      action_sentence = 'دمج المقالين وتوجيه الرابط الأضعف بـ 301';
    }
  } else if (!isAr && hasArabic) {
    if (title.includes('404') && (title.includes('%20') || title.includes('مسافة'))) {
      title = 'Fix False 404 with Leading Space (%20)';
      recommendation = 'Remove accidental %20 in source internal link to point to sanitized target';
      action_sentence = 'Correct source link in template to remove leading %20 defect';
    } else if (title.includes('تحويل') || title.includes('301') || title.includes('302') || title.includes('سلاسل')) {
      title = '301 Redirect for Broken or Redirected URL';
      recommendation = 'Configure 301 permanent redirect to relevant active destination';
      action_sentence = 'Add 301 permanent redirect rule in server configuration';
    } else if (title.includes('سنة') || title.includes('202')) {
      title = 'Update Outdated Year in Title and H1';
      recommendation = 'Update outdated year to maintain SERP click-through rate (CTR)';
      action_sentence = 'Update year in Title and H1 headings to target year';
    } else if (title.includes('محتوى') || title.includes('ضعيف')) {
      title = 'Expand Thin Content Page (< 200 words)';
      recommendation = 'Enrich page with comprehensive value and in-depth content exceeding 250 words';
      action_sentence = 'Expand and deepen on-page content';
    } else if (title.includes('Noindex') || title.includes('أرشفة')) {
      title = 'Remove Noindex Directive to Restore Indexation';
      recommendation = 'Remove noindex directive to restore SERP indexation in search results';
      action_sentence = 'Remove noindex from meta robots tag';
    } else if (title.includes('تنافس') || title.includes('ازدواجية')) {
      title = 'Resolve Keyword Cannibalization Conflict';
      recommendation = 'Consolidate overlapping articles or configure 301 redirect to primary guide';
      action_sentence = 'Consolidate articles or configure 301 redirect';
    }
  }

  return { title, recommendation, action_sentence };
}

/**
 * Resolves Cannibalization cluster text dynamically according to the active locale
 */
export function resolveCannibalization(
  cluster: any,
  isAr: boolean
): any {
  const sim = cluster.similarityScore || `${cluster.similarity || 0}%`;
  const kw = cluster.conflictingKeywords || [];
  const masterTitle = cluster.masterTitle || cluster.masterUrl || 'Master Article';
  const candTitle = cluster.candidateTitle || cluster.candidateUrl || 'Candidate Article';

  const defaultRecAr = `يوصى باعتماد "${masterTitle}" كمقال رئيسي، ودمج محتوى "${candTitle}" معه أو عمل تحويل 301 لمنع تنافس المقالين في نتائج البحث.`;
  const defaultRecEn = `Consolidate "${candTitle}" into master guide "${masterTitle}" or configure a 301 redirect to eliminate SERP keyword competition.`;
  const defaultSigAr = `تطابق بنسبة ${sim} في الكلمات الدلالية: (${kw.join('، ')})`;
  const defaultSigEn = `${sim} overlap in keywords: (${kw.join(', ')})`;

  const recommendation = isAr
    ? cluster.recommendation_ar || (cluster.recommendation && /[\u0600-\u06FF]/.test(cluster.recommendation) ? cluster.recommendation : defaultRecAr)
    : cluster.recommendation_en || (cluster.recommendation && !/[\u0600-\u06FF]/.test(cluster.recommendation) ? cluster.recommendation : defaultRecEn);

  const signals = isAr
    ? cluster.signals_ar || (cluster.signals && /[\u0600-\u06FF]/.test(cluster.signals) ? cluster.signals : defaultSigAr)
    : cluster.signals_en || (cluster.signals && !/[\u0600-\u06FF]/.test(cluster.signals) ? cluster.signals : defaultSigEn);

  return { ...cluster, recommendation, signals };
}

/**
 * Main Crawler Runner Function (Node.js & Edge runtime compatible)
 */
export async function executeSiteCrawl(options: {
  rootUrl: string;
  sitemapUrl?: string;
  maxPages?: number;
  targetYear?: number;
  locale?: 'ar' | 'en';
}): Promise<FullAuditResult> {
  const maxPages = Math.min(options.maxPages || 50, 150);
  const targetYear = options.targetYear || 2027;
  const isAr = options.locale !== 'en';

  // 1. Normalize Root URL
  let rawRoot = options.rootUrl.trim();
  if (!rawRoot.startsWith('http://') && !rawRoot.startsWith('https://')) {
    rawRoot = 'https://' + rawRoot;
  }
  const cleanRoot = normalizeUrl(rawRoot);
  const parsedRoot = new URL(cleanRoot);
  const domain = parsedRoot.hostname.toLowerCase();

  const userAgent = 'SEOGPS-Bot/1.0 (+https://isamilelasiouty.github.io/seo-gps; by Ismail El Asiouty)';
  const headers = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  };

  // 2. Discover Sitemaps (WordPress, Yoast, Rank Math, Core)
  const discoveredMap = new Map<string, { source: CrawledPage['source']; foundOn?: string }>();
  discoveredMap.set(cleanRoot, { source: 'root' });

  const sitemapCandidates: string[] = [];
  if (options.sitemapUrl && options.sitemapUrl.trim()) {
    sitemapCandidates.push(options.sitemapUrl.trim());
  }

  // Check robots.txt for sitemap declarations
  try {
    const robotsRes = await fetch(`${cleanRoot}/robots.txt`, { headers, signal: AbortSignal.timeout(4000) });
    if (robotsRes.ok) {
      const robotsTxt = await robotsRes.text();
      const sitemapMatches = robotsTxt.matchAll(/Sitemap:\s*(https?:\/\/[^\s]+)/gi);
      for (const m of sitemapMatches) {
        if (m[1] && !sitemapCandidates.includes(m[1])) {
          sitemapCandidates.push(m[1].trim());
        }
      }
    }
  } catch (e) {}

  // WordPress & Common Sitemap Defaults
  const commonSitemaps = [
    `${cleanRoot}/wp-sitemap.xml`,        // Core WordPress 5.5+
    `${cleanRoot}/sitemap_index.xml`,     // Yoast / Rank Math
    `${cleanRoot}/sitemap.xml`,           // Standard sitemap
    `${cleanRoot}/post-sitemap.xml`,      // Common Yoast sub-sitemap
    `${cleanRoot}/page-sitemap.xml`,      // Common Yoast sub-sitemap
  ];
  for (const cs of commonSitemaps) {
    if (!sitemapCandidates.includes(cs)) {
      sitemapCandidates.push(cs);
    }
  }

  // Fetch & Parse Sitemaps
  let sitemapLoaded = false;
  for (const smUrl of sitemapCandidates) {
    if (discoveredMap.size >= maxPages) break;
    try {
      const smRes = await fetch(smUrl, { headers, signal: AbortSignal.timeout(5000) });
      if (!smRes.ok) continue;

      const xml = await smRes.text();

      // Check for sitemap index
      const isIndex = xml.includes('<sitemapindex') || xml.includes('<sitemap>');
      if (isIndex) {
        const subSitemapMatches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1].trim());
        // Fetch up to 5 sub-sitemaps (e.g. posts, pages, categories)
        for (const subSm of subSitemapMatches.slice(0, 5)) {
          if (discoveredMap.size >= maxPages) break;
          try {
            const subRes = await fetch(subSm, { headers, signal: AbortSignal.timeout(4000) });
            if (subRes.ok) {
              const subXml = await subRes.text();
              const urlMatches = Array.from(subXml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1].trim());
              for (const u of urlMatches) {
                try {
                  const p = new URL(u);
                  if (p.hostname.toLowerCase() === domain) {
                    const norm = normalizeUrl(u);
                    if (!discoveredMap.has(norm) && discoveredMap.size < maxPages) {
                      discoveredMap.set(norm, { source: 'sitemap', foundOn: subSm });
                    }
                  }
                } catch (e) {}
              }
            }
          } catch (e) {}
        }
        sitemapLoaded = true;
        break;
      }

      // Check for urlset
      const isUrlset = xml.includes('<urlset') || xml.includes('<url>');
      if (isUrlset) {
        const urlMatches = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1].trim());
        for (const u of urlMatches) {
          try {
            const p = new URL(u);
            if (p.hostname.toLowerCase() === domain) {
              const norm = normalizeUrl(u);
              if (!discoveredMap.has(norm) && discoveredMap.size < maxPages) {
                discoveredMap.set(norm, { source: 'sitemap', foundOn: smUrl });
              }
            }
          } catch (e) {}
        }
        if (discoveredMap.size > 2) {
          sitemapLoaded = true;
          break;
        }
      }
    } catch (e) {}
  }

  // 3. Fallback: Internal Link Crawl from Homepage if no sitemap was found
  if (discoveredMap.size <= 2) {
    try {
      const homeRes = await fetch(cleanRoot, { headers, signal: AbortSignal.timeout(6000) });
      if (homeRes.ok) {
        const homeHtml = await homeRes.text();
        const hrefMatches = Array.from(homeHtml.matchAll(/href=["']([^"'#\s>]+)["']/gi)).map((m) => m[1].trim());
        for (const href of hrefMatches) {
          if (discoveredMap.size >= maxPages) break;
          try {
            const resolved = new URL(href, cleanRoot);
            if (resolved.hostname.toLowerCase() === domain && (resolved.protocol === 'http:' || resolved.protocol === 'https:')) {
              const norm = normalizeUrl(resolved.href);
              if (!discoveredMap.has(norm) && !norm.match(/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip|ico)$/i)) {
                discoveredMap.set(norm, { source: 'internal_link', foundOn: cleanRoot });
              }
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // 4. Crawl All Discovered Pages
  const targetUrls = Array.from(discoveredMap.keys()).slice(0, maxPages);
  const crawledPages: CrawledPage[] = [];
  const allIssues: IssueRecord[] = [];
  const BATCH_SIZE = 4;

  for (let i = 0; i < targetUrls.length; i += BATCH_SIZE) {
    const batch = targetUrls.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        const provenance = discoveredMap.get(url) || { source: 'internal_link' as const };
        const startTime = Date.now();
        let statusCode = 200;
        let finalUrl = url;
        let responseTimeMs = 0;
        let title = '';
        let description = '';
        let canonical = url;
        let h1 = '';
        let h1Tags: string[] = [];
        let robots = '';
        let isIndexable = true;
        let schemas: string[] = [];
        let wordCount = 0;
        const pageIssues: IssueRecord[] = [];
        const redirectChain: { from: string; to: string; status: number }[] = [];

        try {
          const res = await fetch(url, {
            headers,
            redirect: 'manual', // Capture manual redirect hops
            signal: AbortSignal.timeout(6000),
          });
          statusCode = res.status;
          responseTimeMs = Date.now() - startTime;

          // Handle 3xx Redirect
          if (statusCode >= 300 && statusCode < 400) {
            const loc = res.headers.get('location');
            if (loc) {
              finalUrl = new URL(loc, url).href;
              redirectChain.push({ from: url, to: finalUrl, status: statusCode });
            }
            title = `Redirect (${statusCode}) -> ${finalUrl}`;
            isIndexable = false;

            pageIssues.push({
              id: `iss-redir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              fingerprint: `fp-redir-${url}`,
              url,
              checkId: 'redirect_status',
              title: statusCode === 301
                ? (isAr ? `تحويل دائم 301 إلى: ${finalUrl}` : `301 Permanent Redirect to: ${finalUrl}`)
                : (isAr ? `تحويل مؤقت 302 إلى: ${finalUrl} (يرجى ترقيته إلى 301)` : `302 Temporary Redirect to: ${finalUrl} (Recommend 301)`),
              title_ar: statusCode === 301 ? `تحويل دائم 301 إلى: ${finalUrl}` : `تحويل مؤقت 302 إلى: ${finalUrl} (يرجى ترقيته إلى 301)`,
              title_en: statusCode === 301 ? `301 Permanent Redirect to: ${finalUrl}` : `302 Temporary Redirect to: ${finalUrl} (Recommend 301)`,
              severity: statusCode === 301 ? 'notice' : 'warning',
              confidence: 'high',
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              daysOpen: 0,
              isBaseline: true,
              status: 'persisting',
              details: `HTTP ${statusCode} redirect chain detected.`,
              details_ar: `تم رصد تحويل HTTP ${statusCode} إلى: ${finalUrl}`,
              details_en: `HTTP ${statusCode} redirect to: ${finalUrl}`,
              suggestion: { target_url: finalUrl, code: statusCode },
            });
          } else if (statusCode === 200) {
            const html = await res.text();

            // Extract Title
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

            // Extract Meta Description
            const descMatch =
              html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
              html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
            description = descMatch ? descMatch[1].replace(/\s+/g, ' ').trim() : '';

            // Extract Canonical
            const canMatch =
              html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([\s\S]*?)["']/i) ||
              html.match(/<link[^>]+href=["']([\s\S]*?)["'][^>]+rel=["']canonical["']/i);
            canonical = canMatch ? canMatch[1].trim() : url;

            // Extract H1 tags
            const h1Matches = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
            h1Tags = h1Matches.map((m) => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
            h1 = h1Tags[0] || '';

            // Extract Robots
            const robMatch = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["']/i);
            robots = robMatch ? robMatch[1].toLowerCase().trim() : '';
            if (robots.includes('noindex')) {
              isIndexable = false;
              pageIssues.push({
                id: `iss-noidx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-noindex-${url}`,
                url,
                checkId: 'meta_noindex',
                title: isAr ? 'وسم Noindex يمنع أرشفة الصفحة' : 'Noindex directive blocks page from Google SERP',
                title_ar: 'وسم Noindex يمنع أرشفة الصفحة في Google',
                title_en: 'Noindex directive blocks page from Google SERP',
                severity: 'warning',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
                details: 'Meta robots contains noindex directive.',
                details_ar: 'وسم robots meta يحتوي على توجيه noindex يمنع الفهرسة.',
                details_en: 'Meta robots directive contains noindex tag.',
              });
            }

            // Extract Schemas (JSON-LD)
            const jsonLdMatches = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
            for (const sm of jsonLdMatches) {
              try {
                const parsed = JSON.parse(sm[1]);
                const items = Array.isArray(parsed) ? parsed : [parsed];
                for (const it of items) {
                  if (it && it['@type']) {
                    const types = Array.isArray(it['@type']) ? it['@type'] : [it['@type']];
                    schemas.push(...types);
                  }
                }
              } catch (e) {}
            }
            schemas = Array.from(new Set(schemas));

            // Extract Word Count (strip script, style, tags)
            const cleanText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            wordCount = cleanText ? cleanText.split(/\s+/).length : 0;

            // Soft 404 Check
            const lowerTitle = title.toLowerCase();
            const lowerH1 = h1.toLowerCase();
            const isSoft404 =
              lowerTitle.includes('404') ||
              lowerTitle.includes('not found') ||
              lowerTitle.includes('page not found') ||
              lowerTitle.includes('الصفحة غير موجودة') ||
              lowerTitle.includes('خطأ 404') ||
              lowerH1.includes('404') ||
              lowerH1.includes('غير موجودة');

            if (isSoft404) {
              pageIssues.push({
                id: `iss-soft404-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-soft404-${url}`,
                url,
                checkId: 'soft_404',
                title: isAr ? 'خطأ ناعم Soft 404: الصفحة تعيد كود 200 ولكنها تعرض رسالة غير موجودة' : 'Soft 404: Returns 200 OK but displays Not Found content',
                title_ar: 'خطأ ناعم Soft 404: الصفحة تعيد كود 200 ولكنها تعرض رسالة غير موجودة',
                title_en: 'Soft 404: Returns 200 OK but displays Not Found content',
                severity: 'critical',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
                details: 'Page returns 200 OK status code while title or H1 contains 404/Not Found error indicators.',
                details_ar: 'الصفحة تعيد كود 200 مع وجود عبارات تفيد بعدم وجود المحتوى.',
                details_en: 'Page returns 200 OK while displaying Not Found content.',
              });
            }

            // Title Validations
            if (!title) {
              pageIssues.push({
                id: `iss-notitle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-notitle-${url}`,
                url,
                checkId: 'title_missing',
                title: isAr ? 'عنوان الصفحة (Title Tag) مفقود تماماً' : 'Missing Title tag',
                title_ar: 'عنوان الصفحة (Title Tag) مفقود تماماً',
                title_en: 'Missing Title tag',
                severity: 'critical',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            } else if (title.length > 65) {
              pageIssues.push({
                id: `iss-longtitle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-longtitle-${url}`,
                url,
                checkId: 'title_too_long',
                title: isAr ? `عنوان الصفحة طويل جداً (${title.length} حرف - الحد الموصى به 60)` : `Title tag too long (${title.length} characters)`,
                title_ar: `عنوان الصفحة طويل جداً (${title.length} حرف - الحد الموصى به 60)`,
                title_en: `Title tag too long (${title.length} characters)`,
                severity: 'notice',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            } else if (title.length < 15) {
              pageIssues.push({
                id: `iss-shorttitle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-shorttitle-${url}`,
                url,
                checkId: 'title_too_short',
                title: isAr ? `عنوان الصفحة قصير جداً (${title.length} حرف)` : `Title tag too short (${title.length} characters)`,
                title_ar: `عنوان الصفحة قصير جداً (${title.length} حرف)`,
                title_en: `Title tag too short (${title.length} characters)`,
                severity: 'notice',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            }

            // Meta Description Validations
            if (!description) {
              pageIssues.push({
                id: `iss-nodesc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-nodesc-${url}`,
                url,
                checkId: 'meta_description_missing',
                title: isAr ? 'وصف الميتا (Meta Description) مفقود' : 'Missing Meta Description tag',
                title_ar: 'وصف الميتا (Meta Description) مفقود',
                title_en: 'Missing Meta Description tag',
                severity: 'warning',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            }

            // H1 Validations
            if (h1Tags.length === 0) {
              pageIssues.push({
                id: `iss-noh1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-noh1-${url}`,
                url,
                checkId: 'h1_missing',
                title: isAr ? 'وسم H1 مفقود في الصفحة' : 'Missing H1 Heading tag',
                title_ar: 'وسم H1 مفقود في الصفحة',
                title_en: 'Missing H1 Heading tag',
                severity: 'warning',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            } else if (h1Tags.length > 1) {
              pageIssues.push({
                id: `iss-multih1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-multih1-${url}`,
                url,
                checkId: 'h1_multiple',
                title: isAr ? `يوجد أكثر من وسم H1 في الصفحة (${h1Tags.length} وسوم)` : `Multiple H1 tags detected (${h1Tags.length} tags)`,
                title_ar: `يوجد أكثر من وسم H1 في الصفحة (${h1Tags.length} وسوم)`,
                title_en: `Multiple H1 tags detected (${h1Tags.length} tags)`,
                severity: 'notice',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            }

            // Canonical Validations
            if (canonical && canonical.replace(/\/+$/, '') !== url.replace(/\/+$/, '')) {
              pageIssues.push({
                id: `iss-canmismatch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-canmismatch-${url}`,
                url,
                checkId: 'canonical_mismatch',
                title: isAr ? `الرابط الأساسي Canonical يشير لعنوان مختلف: ${canonical}` : `Canonical tag points to different URL: ${canonical}`,
                title_ar: `الرابط الأساسي Canonical يشير لعنوان مختلف: ${canonical}`,
                title_en: `Canonical tag points to different URL: ${canonical}`,
                severity: 'warning',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
                details: `Page URL: ${url}, Canonical URL: ${canonical}`,
                details_ar: `رابط الصفحة: ${url}، والرابط الأساسي: ${canonical}`,
                details_en: `Page URL: ${url}, Canonical URL: ${canonical}`,
              });
            }

            // Outdated Year Freshness Scanner (Target: 2027)
            const yearMatch = (title + ' ' + h1).match(/\b(202[0-6])\b/);
            if (yearMatch) {
              const detectedYear = yearMatch[1];
              pageIssues.push({
                id: `iss-year-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-year-${url}`,
                url,
                checkId: 'outdated_year',
                title: isAr ? `سنة قديمة ${detectedYear} في العنوان أو H1 (يرجى التحديث إلى ${targetYear})` : `Outdated year ${detectedYear} detected in Title/H1 (Target: ${targetYear})`,
                title_ar: `سنة قديمة ${detectedYear} في العنوان أو H1 (يرجى التحديث إلى ${targetYear})`,
                title_en: `Outdated year ${detectedYear} detected in Title/H1 (Target: ${targetYear})`,
                severity: 'warning',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
                details: `Detected outdated year ${detectedYear} in Title or H1.`,
                details_ar: `تم رصد سنة قديمة ${detectedYear} في العنوان أو وسم H1.`,
                details_en: `Detected outdated year ${detectedYear} in Title or H1.`,
                suggestion: { detectedYear, targetYear },
              });
            }

            // Thin Content
            if (wordCount < 180 && !url.includes('/contact') && !url.includes('/about')) {
              pageIssues.push({
                id: `iss-thin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-thin-${url}`,
                url,
                checkId: 'thin_content',
                title: isAr ? `محتوى نصي ضعيف (${wordCount} كلمة - الحد الأدنى الموصى به 250 كلمة)` : `Thin content detected (${wordCount} words)`,
                title_ar: `محتوى نصي ضعيف (${wordCount} كلمة - الحد الأدنى الموصى به 250 كلمة)`,
                title_en: `Thin content detected (${wordCount} words)`,
                severity: 'warning',
                confidence: 'high',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            }

            // Schema Gap
            if (schemas.length === 0) {
              pageIssues.push({
                id: `iss-schema-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-schema-${url}`,
                url,
                checkId: 'schema_missing',
                title: isAr ? 'غياب البيانات المنظمة (Schema.org) عن الصفحة' : 'Missing Structured Data (Schema.org)',
                title_ar: 'غياب البيانات المنظمة (Schema.org) عن الصفحة',
                title_en: 'Missing Structured Data (Schema.org)',
                severity: 'notice',
                confidence: 'medium',
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                daysOpen: 0,
                isBaseline: true,
                status: 'persisting',
              });
            }
          } else if (statusCode === 404) {
            isIndexable = false;
            title = '404 Not Found';
            pageIssues.push({
              id: `iss-404-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              fingerprint: `fp-404-${url}`,
              url,
              checkId: 'http_status_404',
              title: isAr ? `صفحة مفقودة 404 Not Found (${url})` : `HTTP 404 Not Found (${url})`,
              title_ar: `صفحة مفقودة 404 Not Found (${url})`,
              title_en: `HTTP 404 Not Found (${url})`,
              severity: 'critical',
              confidence: 'high',
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              daysOpen: 0,
              isBaseline: true,
              status: 'persisting',
              details: 'Page returns HTTP 404 status. Remove broken link or add 301 redirect.',
              details_ar: 'الصفحة تعيد كود 404 مفقود. يرجى إزالة الرابط المعطل أو عمل تحويل 301.',
              details_en: 'Page returns HTTP 404 status. Remove broken link or add 301 redirect.',
            });
          } else if (statusCode >= 500) {
            isIndexable = false;
            title = `Server Error ${statusCode}`;
            pageIssues.push({
              id: `iss-5xx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              fingerprint: `fp-5xx-${url}`,
              url,
              checkId: 'http_status_5xx',
              title: isAr ? `خطأ في الخادم ${statusCode}` : `HTTP ${statusCode} Server Error`,
              title_ar: `خطأ في الخادم ${statusCode}`,
              title_en: `HTTP ${statusCode} Server Error`,
              severity: 'critical',
              confidence: 'high',
              firstSeen: new Date().toISOString(),
              lastSeen: new Date().toISOString(),
              daysOpen: 0,
              isBaseline: true,
              status: 'persisting',
            });
          }
        } catch (fetchErr: any) {
          statusCode = 0;
          title = 'Connection Timeout / Failed';
          pageIssues.push({
            id: `iss-timeout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            fingerprint: `fp-timeout-${url}`,
            url,
            checkId: 'connection_timeout',
            title: isAr ? 'فشل الاتصال بالصفحة أو انتهاء مهلة الاستجابة' : 'Connection Timeout / Network Unreachable',
            title_ar: 'فشل الاتصال بالصفحة أو انتهاء مهلة الاستجابة',
            title_en: 'Connection Timeout / Network Unreachable',
            severity: 'critical',
            confidence: 'high',
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            daysOpen: 0,
            isBaseline: true,
            status: 'persisting',
          });
        }

        const pageType = classifyPageType(url, title);
        const crawledRecord: CrawledPage = {
          url,
          statusCode,
          finalUrl,
          responseTimeMs,
          source: provenance.source,
          foundOn: provenance.foundOn,
          title,
          titleLength: title.length,
          description,
          descLength: description.length,
          canonical,
          h1,
          h1Tags,
          robots,
          isIndexable,
          schemas,
          wordCount,
          pageType,
          issues: pageIssues,
          redirectChain,
        };

        allIssues.push(...pageIssues);
        return crawledRecord;
      })
    );

    crawledPages.push(...batchResults);
  }

  // 5. Keyword Cannibalization Analysis (تنافس الكلمات)
  const ok200Pages = crawledPages.filter((p) => p.statusCode === 200 && p.title);
  const cannibalizationClusters: CannibalizationCluster[] = [];

  for (let i = 0; i < ok200Pages.length; i++) {
    for (let j = i + 1; j < ok200Pages.length; j++) {
      const pageA = ok200Pages[i];
      const pageB = ok200Pages[j];

      if (normalizeUrl(pageA.url) === normalizeUrl(pageB.url)) continue;

      const wordsA = extractKeywords(pageA.title + ' ' + pageA.h1);
      const wordsB = extractKeywords(pageB.title + ' ' + pageB.h1);

      const overlap = calculateKeywordOverlap(wordsA, wordsB);
      if ((overlap.similarity >= 30 || overlap.keywords.length >= 3) && overlap.keywords.length >= 2) {
        // Determine master vs candidate (prefer higher word count or shorter URL)
        const aIsMaster = pageA.wordCount >= pageB.wordCount;
        const master = aIsMaster ? pageA : pageB;
        const candidate = aIsMaster ? pageB : pageA;

        const topic = overlap.keywords.slice(0, 4).join(' ');
        const simScore = `${overlap.similarity}%`;
        const rec_ar = `يوصى باعتماد "${master.title}" كمقال رئيسي، ودمج محتوى "${candidate.title}" معه أو عمل تحويل 301 لمنع تنافس المقالين في نتائج البحث.`;
        const rec_en = `Consolidate "${candidate.title}" into master guide "${master.title}" or configure a 301 redirect to eliminate SERP keyword competition.`;
        const sig_ar = `تطابق بنسبة ${simScore} في الكلمات الدلالية: (${overlap.keywords.join('، ')})`;
        const sig_en = `${simScore} overlap in keywords: (${overlap.keywords.join(', ')})`;

        cannibalizationClusters.push({
          topic,
          similarity: overlap.similarity,
          similarityScore: simScore,
          masterUrl: master.url,
          masterTitle: master.title,
          candidateUrl: candidate.url,
          candidateTitle: candidate.title,
          conflictingKeywords: overlap.keywords,
          signals: isAr ? sig_ar : sig_en,
          signals_ar: sig_ar,
          signals_en: sig_en,
          recommendation: isAr ? rec_ar : rec_en,
          recommendation_ar: rec_ar,
          recommendation_en: rec_en,
        });

        // Add to issues list as warning
        allIssues.push({
          id: `iss-cannibal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fingerprint: `fp-cannibal-${candidate.url}-${master.url}`,
          url: candidate.url,
          checkId: 'content_cannibalization',
          title: isAr
            ? `تنافس كلمات دلالية مع (${master.title}) - نسبة التطابق ${simScore}`
            : `Keyword Cannibalization conflict with (${master.title}) - ${simScore} overlap`,
          title_ar: `تنافس كلمات دلالية مع (${master.title}) - نسبة التطابق ${simScore}`,
          title_en: `Keyword Cannibalization conflict with (${master.title}) - ${simScore} overlap`,
          severity: 'warning',
          confidence: 'high',
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          daysOpen: 0,
          isBaseline: true,
          status: 'persisting',
          details: isAr ? rec_ar : rec_en,
          details_ar: rec_ar,
          details_en: rec_en,
          suggestion: { master_url: master.url, candidate_url: candidate.url, similarity: overlap.similarity },
        });
      }
    }
  }

  // 6. Calculate Deterministic Health Score
  const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
  const noticeCount = allIssues.filter((i) => i.severity === 'notice').length;

  let calculatedScore = 100 - (criticalCount * 15 + warningCount * 5 + noticeCount * 1);
  calculatedScore = Math.max(10, Math.min(100, calculatedScore));

  const statusDistribution = {
    ok_200: crawledPages.filter((p) => p.statusCode === 200).length,
    redirect_3xx: crawledPages.filter((p) => p.statusCode >= 300 && p.statusCode < 400).length,
    not_found_404: crawledPages.filter((p) => p.statusCode === 404).length,
    server_error_5xx: crawledPages.filter((p) => p.statusCode >= 500).length,
    blocked_unverified: crawledPages.filter((p) => p.statusCode === 0 || p.statusCode === 403).length,
  };

  const summary: SiteReportSummary = {
    health_score: calculatedScore,
    total_discovered: targetUrls.length,
    total_crawled: crawledPages.length,
    total_skipped: 0,
    critical_count: criticalCount,
    warning_count: warningCount,
    notice_count: noticeCount,
    status_distribution: statusDistribution,
  };

  // 7. Compile Top 10 Priority Fixes
  const topFixes: TopFixItem[] = [];
  const sortedIssues = [...allIssues].sort((a, b) => {
    const sevWeight = { critical: 3, warning: 2, notice: 1 };
    return sevWeight[b.severity] - sevWeight[a.severity];
  });

  const seenUrlsInFixes = new Set<string>();
  for (const iss of sortedIssues) {
    if (topFixes.length >= 10) break;
    if (seenUrlsInFixes.has(iss.url)) continue;
    seenUrlsInFixes.add(iss.url);

    let priority = 70;
    if (iss.severity === 'critical') priority = 95;
    else if (iss.severity === 'warning') priority = 80;

    let rec_ar = iss.details_ar || iss.title_ar || iss.title;
    let rec_en = iss.details_en || iss.title_en || iss.title;
    let action_ar = `إصلاح المشكلة في: ${iss.url}`;
    let action_en = `Fix defect on: ${iss.url}`;

    if (iss.checkId === 'http_status_404') {
      action_ar = `إضافة تحويل 301 إلى الرابط البديل المناسب`;
      action_en = `Add 301 redirect to relevant active destination`;
    } else if (iss.checkId === 'outdated_year') {
      action_ar = `تحديث السنة إلى ${targetYear} في العنوان والـ H1`;
      action_en = `Update outdated year to ${targetYear} in Title and H1`;
    } else if (iss.checkId === 'content_cannibalization') {
      action_ar = `دمج المقالين أو عمل تحويل 301`;
      action_en = `Consolidate articles or configure 301 redirect`;
    } else if (iss.checkId === 'meta_noindex') {
      action_ar = `إزالة وسم Noindex لاستعادة أرشفة الصفحة`;
      action_en = `Remove noindex directive to restore SERP indexation`;
    }

    topFixes.push({
      priority_score: priority,
      title: isAr ? (iss.title_ar || iss.title) : (iss.title_en || iss.title),
      title_ar: iss.title_ar || iss.title,
      title_en: iss.title_en || iss.title,
      url: iss.url,
      recommendation: isAr ? rec_ar : rec_en,
      recommendation_ar: rec_ar,
      recommendation_en: rec_en,
      action_sentence: isAr ? action_ar : action_en,
      action_sentence_ar: action_ar,
      action_sentence_en: action_en,
    });
  }

  // 8. Compile Comprehensive Site Report Structure
  const false404Items = crawledPages
    .filter((p) => p.statusCode === 404 && (p.url.includes('%20') || p.url.includes(' ')))
    .map((p) => ({
      raw_url: p.url,
      defect: isAr ? 'مسافة بيضاء زائدة (%20) في الرابط' : 'leading whitespace / %20 in URL path',
      defect_ar: 'مسافة بيضاء زائدة (%20) في الرابط',
      defect_en: 'leading whitespace / %20 in URL path',
      sanitized_target: p.url.replace(/%20/g, '').replace(/\s+/g, ''),
      source: p.source,
      found_on: p.foundOn || cleanRoot,
    }));

  const trueDeadItems = crawledPages
    .filter((p) => p.statusCode === 404 && !p.url.includes('%20'))
    .map((p) => ({
      url: p.url,
      status: 404,
      inbound_links_count: 1,
      in_sitemap: p.source === 'sitemap',
      dead_match: cleanRoot,
      confidence: 0.7,
    }));

  const soft404Items = crawledPages
    .filter((p) => p.statusCode === 200 && (p.title.includes('404') || p.title.includes('Not Found') || p.title.includes('غير موجودة')))
    .map((p) => ({
      url: p.url,
      status: 200,
      reason: isAr ? 'عنوان الصفحة يحتوي على عبارة تدل على أنها غير موجودة' : 'Page title contains 404 error phrase',
      reason_ar: 'عنوان الصفحة يحتوي على عبارة تدل على أنها غير موجودة',
      reason_en: 'Page title contains 404 error phrase',
      confidence: 'high',
    }));

  const redirectChains = crawledPages
    .filter((p) => p.statusCode >= 300 && p.statusCode < 400)
    .map((p) => {
      const final = p.finalUrl || cleanRoot;
      const pathPart = new URL(p.url).pathname;
      return {
        source: p.url,
        hops: 1,
        path: [pathPart, new URL(final).pathname],
        final_target: final,
        nginx: `rewrite ^${pathPart}$ ${final} permanent;`,
        htaccess: `RewriteRule ^${pathPart.replace(/^\//, '')}$ ${final} [R=301,L]`,
      };
    });

  const outdatedYearsList = crawledPages
    .filter((p) => (p.title + ' ' + p.h1).match(/\b(202[0-6])\b/))
    .map((p) => {
      const match = (p.title + ' ' + p.h1).match(/\b(202[0-6])\b/);
      const y = match ? match[1] : '2024';
      return {
        url: p.url,
        detected_year: y,
        target_year: String(targetYear),
        field: 'title / H1',
        suggested_text: p.title.replace(y, String(targetYear)),
      };
    });

  const thinPagesList = crawledPages
    .filter((p) => p.statusCode === 200 && p.wordCount < 180)
    .map((p) => ({
      url: p.url,
      word_count: p.wordCount,
      threshold: 250,
      has_meta_desc: Boolean(p.description),
    }));

  const noindexPagesList = crawledPages
    .filter((p) => p.robots.includes('noindex'))
    .map((p) => ({
      url: p.url,
      directive: p.robots,
    }));

  const canonicalIssuesList = crawledPages
    .filter((p) => p.canonical && p.canonical.replace(/\/+$/, '') !== p.url.replace(/\/+$/, ''))
    .map((p) => ({
      url: p.url,
      declared: p.canonical,
      issue: isAr ? `الرابط الأساسي يختلف عن رابط الصفحة الفعلي` : `Canonical target does not match page URL`,
      issue_ar: `الرابط الأساسي يختلف عن رابط الصفحة الفعلي`,
      issue_en: `Canonical target does not match page URL`,
    }));

  const schemaGapsList = crawledPages
    .filter((p) => p.statusCode === 200 && p.schemas.length === 0)
    .slice(0, 5)
    .map((p) => ({
      url: p.url,
      missing: p.pageType === 'article' ? 'Article / BlogPosting' : 'WebPage / Organization',
      detected_qa_count: 0,
      generated_jsonld: JSON.stringify(
        {
          '@context': 'https://schema.org',
          '@type': p.pageType === 'article' ? 'Article' : 'WebPage',
          headline: p.title || p.h1,
          description: p.description,
          url: p.url,
        },
        null,
        2
      ),
    }));

  const typeDistribution: Record<string, number> = {
    home: 0,
    article: 0,
    product: 0,
    category: 0,
    contact: 0,
    about: 0,
    other: 0,
  };
  for (const p of crawledPages) {
    typeDistribution[p.pageType] = (typeDistribution[p.pageType] || 0) + 1;
  }

  const siteReport: SiteReportData = {
    scan_id: `scan-${Date.now()}`,
    project_id: 'quick-audit',
    domain,
    root_url: cleanRoot,
    is_baseline: true,
    created_at: new Date().toISOString(),
    summary,
    top_fixes: topFixes,
    section_status: {
      total_404: statusDistribution.not_found_404,
      false_404_count: false404Items.length,
      true_dead_count: trueDeadItems.length,
      soft_404_count: soft404Items.length,
      false_404_ratio: `${Math.round((false404Items.length / Math.max(statusDistribution.not_found_404, 1)) * 100)}% False vs ${Math.round((trueDeadItems.length / Math.max(statusDistribution.not_found_404, 1)) * 100)}% True Dead`,
      false_404_items: false404Items,
      slug_recovery_items: [],
      true_dead_items: trueDeadItems,
      soft_404_items: soft404Items,
    },
    section_redirects: {
      total_redirects: statusDistribution.redirect_3xx,
      temporary_302_count: crawledPages.filter((p) => p.statusCode === 302).length,
      chains_count: redirectChains.length,
      loops_count: 0,
      legacy_groups: [],
      chains: redirectChains,
      temporary_redirects: crawledPages
        .filter((p) => p.statusCode === 302)
        .map((p) => ({ url: p.url, target: p.finalUrl || cleanRoot, code: 302 })),
    },
    section_onpage: {
      outdated_years: outdatedYearsList,
      thin_pages: thinPagesList,
      noindex_pages: noindexPagesList,
      canonical_issues: canonicalIssuesList,
    },
    section_cannibalization: {
      clusters_count: cannibalizationClusters.length,
      clusters: cannibalizationClusters,
    },
    section_schema: {
      gaps_count: schemaGapsList.length,
      gaps: schemaGapsList,
    },
    section_taxonomy: {
      type_distribution: typeDistribution,
      uncategorized_count: typeDistribution.other || 0,
      samples: crawledPages.slice(0, 10).map((p) => ({ url: p.url, page_type: p.pageType, title: p.title })),
    },
    section_action_plans: [
      {
        role: 'engineering',
        title: isAr ? 'خطة عمل المطورين والمهندسين' : 'Engineering & Development Plan',
        title_ar: 'خطة عمل المطورين والمهندسين',
        title_en: 'Engineering & Development Plan',
        items: isAr
          ? [
              'تطبيق قواعد إعادة التوجيه 301 في خادم Nginx أو .htaccess للروابط المعطلة وسلاسل التحويل.',
              'إصلاح الروابط التي تحتوي على مساحات بيضاء زائدة (%20) في كود القوالب.',
              'إدراج أكواد المخططات المنظمة (Schema JSON-LD) في الصفحات التي تفتقدها.',
            ]
          : [
              'Deploy 301 rewrite rules in Nginx/.htaccess for dead pages and redirect chains.',
              'Fix internal anchor tags with leading whitespace (%20) in site templates.',
              'Embed generated Schema JSON-LD markup on pages lacking structured data.',
            ],
        items_ar: [
          'تطبيق قواعد إعادة التوجيه 301 في خادم Nginx أو .htaccess للروابط المعطلة وسلاسل التحويل.',
          'إصلاح الروابط التي تحتوي على مساحات بيضاء زائدة (%20) في كود القوالب.',
          'إدراج أكواد المخططات المنظمة (Schema JSON-LD) في الصفحات التي تفتقدها.',
        ],
        items_en: [
          'Deploy 301 rewrite rules in Nginx/.htaccess for dead pages and redirect chains.',
          'Fix internal anchor tags with leading whitespace (%20) in site templates.',
          'Embed generated Schema JSON-LD markup on pages lacking structured data.',
        ],
      },
      {
        role: 'content',
        title: isAr ? 'خطة عمل صناع المحتوى ورؤساء التحرير' : 'Content & Editorial Plan',
        title_ar: 'خطة عمل صناع المحتوى ورؤساء التحرير',
        title_en: 'Content & Editorial Plan',
        items: isAr
          ? [
              `تحديث السنوات القديمة في العناوين والـ H1 إلى سنة ${targetYear} لضمان الحفاظ على معدل النقر (CTR).`,
              'حل مشكلة تضارب وتنافس الكلمات الدلالية عبر دمج المقالات المتشابهة في أدلة شاملة.',
              'إثراء الصفحات ذات المحتوى الضعيف (< 200 كلمة) بمعلومات وتفاصيل مفيدة للزائر.',
            ]
          : [
              `Update outdated years in titles & H1s to ${targetYear} to preserve SERP CTR.`,
              'Resolve keyword cannibalization by consolidating overlapping articles into comprehensive pillar pages.',
              'Expand thin content pages (< 200 words) with actionable insights and detailed sections.',
            ],
        items_ar: [
          `تحديث السنوات القديمة في العناوين والـ H1 إلى سنة ${targetYear} لضمان الحفاظ على معدل النقر (CTR).`,
          'حل مشكلة تضارب وتنافس الكلمات الدلالية عبر دمج المقالات المتشابهة في أدلة شاملة.',
          'إثراء الصفحات ذات المحتوى الضعيف (< 200 كلمة) بمعلومات وتفاصيل مفيدة للزائر.',
        ],
        items_en: [
          `Update outdated years in titles & H1s to ${targetYear} to preserve SERP CTR.`,
          'Resolve keyword cannibalization by consolidating overlapping articles into comprehensive pillar pages.',
          'Expand thin content pages (< 200 words) with actionable insights and detailed sections.',
        ],
      },
      {
        role: 'technical_seo',
        title: isAr ? 'خطة عمل أخصائيي السيو التقني' : 'Technical SEO Plan',
        title_ar: 'خطة عمل أخصائيي السيو التقني',
        title_en: 'Technical SEO Plan',
        items: isAr
          ? [
              'مراجعة أوسمة Canonical والتأكد من مطابقتها التامة للروابط المفهرسة.',
              'التأكد من عدم وجود وسم Noindex غير مقصود في الصفحات ذات الأهمية التسويقية.',
              'تحسين أطوال عناوين الصفحات وأوصاف الميتا لتتوافق مع معايير محركات البحث (30-60 حرفاً للعنوان، 70-155 للوصف).',
            ]
          : [
              'Audit canonical links to ensure 100% alignment with preferred indexed URLs.',
              'Verify robots meta directives to ensure key commercial pages do not have accidental noindex tags.',
              'Optimize title and meta description lengths for maximum SERP snippet visibility.',
            ],
        items_ar: [
          'مراجعة أوسمة Canonical والتأكد من مطابقتها التامة للروابط المفهرسة.',
          'التأكد من عدم وجود وسم Noindex غير مقصود في الصفحات ذات الأهمية التسويقية.',
          'تحسين أطوال عناوين الصفحات وأوصاف الميتا لتتوافق مع معايير محركات البحث (30-60 حرفاً للعنوان، 70-155 للوصف).',
        ],
        items_en: [
          'Audit canonical links to ensure 100% alignment with preferred indexed URLs.',
          'Verify robots meta directives to ensure key commercial pages do not have accidental noindex tags.',
          'Optimize title and meta description lengths for maximum SERP snippet visibility.',
        ],
      },
    ],
  };

  return {
    success: true,
    domain,
    rootUrl: cleanRoot,
    summary,
    pages: crawledPages,
    issues: allIssues,
    cannibalization: cannibalizationClusters,
    siteReport,
  };
}
