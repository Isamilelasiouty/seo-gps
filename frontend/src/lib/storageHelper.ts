/**
 * Safe LocalStorage Helper for High-Volume Audits (2,000+ to 5,000+ Pages)
 * Protects against DOMException: QuotaExceededError by automatically
 * stripping bulky redundant fields before saving.
 */

export function safeSetStorageItem(key: string, data: any): boolean {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`LocalStorage quota warning for key "${key}". Compacting payload...`, err);

    // If array of pages or issues, compact items
    if (Array.isArray(data)) {
      try {
        const compactArray = data.map((item) => {
          if (!item || typeof item !== 'object') return item;
          // Strip heavy raw strings / redundant duplicates
          const {
            html,
            rawContent,
            rawHtml,
            fullHtml,
            domTree,
            ...rest
          } = item;

          // For pages specifically: keep all properties needed by PagesExplorer and Dashboard
          if (rest.url) {
            return {
              url: rest.url,
              statusCode: rest.statusCode ?? 200,
              finalUrl: rest.finalUrl || rest.url,
              responseTimeMs: rest.responseTimeMs ?? 80,
              source: rest.source || 'sitemap',
              foundOn: rest.foundOn,
              title: rest.title || '',
              titleLength: rest.titleLength ?? (rest.title ? rest.title.length : 0),
              description: rest.description || '',
              descLength: rest.descLength ?? (rest.description ? rest.description.length : 0),
              canonical: rest.canonical || rest.url,
              h1: rest.h1 || '',
              h1Tags: rest.h1Tags || (rest.h1 ? [rest.h1] : []),
              robots: rest.robots || '',
              isIndexable: rest.isIndexable !== false,
              schemas: rest.schemas || [],
              wordCount: rest.wordCount ?? 0,
              pageType: rest.pageType || 'article',
              issues: (rest.issues || []).slice(0, 5),
            };
          }

          return rest;
        });

        localStorage.setItem(key, JSON.stringify(compactArray));
        return true;
      } catch (compactErr) {
        console.warn(`Compacted storage also exceeded quota for "${key}". Storing top 1,500 priority records...`);
        try {
          const minimal = data.slice(0, 1500).map((p: any) => ({
            url: p.url,
            statusCode: p.statusCode || 200,
            title: p.title || '',
            pageType: p.pageType || 'article',
            isIndexable: p.isIndexable !== false,
            schemas: p.schemas || [],
            issues: (p.issues || []).slice(0, 2),
          }));
          localStorage.setItem(key, JSON.stringify(minimal));
          return true;
        } catch (finalErr) {
          console.error(`Failed to store "${key}" in LocalStorage even in minimal mode:`, finalErr);
          return false;
        }
      }
    } else if (data && typeof data === 'object') {
      try {
        // Strip heavy sub-objects if present
        const { rawPayload, html, ...rest } = data;
        localStorage.setItem(key, JSON.stringify(rest));
        return true;
      } catch (objErr) {
        console.error(`Failed to store object "${key}" in LocalStorage:`, objErr);
        return false;
      }
    }

    return false;
  }
}

export function safeGetStorageItem<T = any>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    return defaultValue;
  }
}
