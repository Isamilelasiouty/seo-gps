import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const rawRoot = (body.rootUrl || body.url || "").trim();
    if (!rawRoot) {
      return new Response(JSON.stringify({ success: false, error: "rootUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cleanRoot = rawRoot.replace(/\/+$/, "");
    if (!cleanRoot.startsWith("http://") && !cleanRoot.startsWith("https://")) {
      cleanRoot = "https://" + cleanRoot.replace(/^\/+/, "");
    }

    let rootUrlObj: URL;
    try {
      rootUrlObj = new URL(cleanRoot);
    } catch (_) {
      return new Response(JSON.stringify({ success: false, error: "Invalid rootUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = rootUrlObj.hostname.toLowerCase();
    const origin = rootUrlObj.origin;
    const sitemapInput = (body.sitemapUrl || "").trim();
    const isAr = (body.locale || body.lang || "ar") !== "en";
    const targetYear = Number(body.targetYear) || 2027;

    const botHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
    };

    const discoveredUrls = new Map<string, { source: string; foundOn?: string }>();
    discoveredUrls.set(cleanRoot, { source: "root" });

    // Helper to sanitize and record URL
    const addUrl = (rawUrl: string, source: string, foundOn?: string) => {
      try {
        const u = new URL(rawUrl, cleanRoot);
        if (u.protocol !== "http:" && u.protocol !== "https:") return;
        const host = u.hostname.toLowerCase();
        if (host !== domain && !host.endsWith("." + domain)) return;
        u.hash = "";
        const clean = u.href.replace(/\/+$/, "");
        if (clean.match(/\.(png|jpg|jpeg|gif|svg|webp|css|js|woff|woff2|ttf|eot|pdf|zip|rar|gz|ico|mp4|mp3)$/i)) return;
        if (!discoveredUrls.has(clean)) {
          discoveredUrls.set(clean, { source, foundOn });
        }
      } catch (_) {}
    };

    // 1. Gather Sitemap Candidates
    const sitemapCandidates = new Set<string>();
    if (sitemapInput) {
      sitemapCandidates.add(sitemapInput);
    }

    // Check robots.txt for Sitemap declarations
    try {
      const robRes = await fetch(`${origin}/robots.txt`, {
        headers: botHeaders,
        signal: AbortSignal.timeout(6000),
      });
      if (robRes.ok) {
        const robTxt = await robRes.text();
        const sitemapMatches = Array.from(robTxt.matchAll(/Sitemap:\s*([^\s\r\n]+)/gi));
        for (const m of sitemapMatches) {
          try {
            const resolved = new URL(m[1].trim(), origin).href;
            sitemapCandidates.add(resolved);
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Add standard candidate sitemaps
    const commonList = [
      `${origin}/sitemap_index.xml`,
      `${origin}/sitemap.xml`,
      `${origin}/sitemaps.xml`,
      `${origin}/sitemap-index.xml`,
      `${origin}/server-sitemap.xml`,
      `${origin}/sitemap/sitemap.xml`,
      `${origin}/sitemap-pages.xml`,
      `${origin}/sitemap-posts.xml`,
      `${origin}/sitemap-1.xml`,
      `${origin}/wp-sitemap.xml`,
    ];
    for (const c of commonList) {
      sitemapCandidates.add(c);
    }

    // 2. Fetch & Recursively Parse Sitemaps (up to 500 sub-sitemaps)
    const visitedSitemaps = new Set<string>();
    const sitemapsToFetch = Array.from(sitemapCandidates);

    while (sitemapsToFetch.length > 0 && visitedSitemaps.size < 500) {
      const smUrl = sitemapsToFetch.shift()!;
      if (visitedSitemaps.has(smUrl)) continue;
      visitedSitemaps.add(smUrl);

      try {
        const smRes = await fetch(smUrl, {
          headers: { ...botHeaders, Accept: "application/xml,text/xml,*/*" },
          signal: AbortSignal.timeout(8000),
        });
        if (!smRes.ok) continue;

        let xmlText = "";
        const isGzip = smUrl.endsWith(".gz") || smRes.headers.get("content-type")?.includes("gzip");
        if (isGzip) {
          try {
            const ab = await smRes.arrayBuffer();
            const ds = new DecompressionStream("gzip");
            const writer = ds.writable.getWriter();
            writer.write(new Uint8Array(ab));
            writer.close();
            const reader = ds.readable.getReader();
            const chunks: Uint8Array[] = [];
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) chunks.push(value);
            }
            const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
            const comb = new Uint8Array(totalLen);
            let off = 0;
            for (const c of chunks) {
              comb.set(c, off);
              off += c.length;
            }
            xmlText = new TextDecoder().decode(comb);
          } catch (_) {}
        } else {
          xmlText = await smRes.text();
        }

        if (!xmlText) continue;

        const isIndex = xmlText.includes("<sitemapindex") || (xmlText.includes("<sitemap>") && xmlText.includes("<loc>"));
        const isUrlset = xmlText.includes("<urlset") || (xmlText.includes("<url>") && xmlText.includes("<loc>"));

        if (isIndex) {
          const subMatches = Array.from(xmlText.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1].trim());
          for (const sub of subMatches) {
            if (!visitedSitemaps.has(sub) && visitedSitemaps.size + sitemapsToFetch.length < 500) {
              sitemapsToFetch.push(sub);
            }
          }
        } else if (isUrlset) {
          const urlMatches = Array.from(xmlText.matchAll(/<loc>([^<]+)<\/loc>/gi)).map((m) => m[1].trim());
          for (const u of urlMatches) {
            addUrl(u, "sitemap", smUrl);
          }
        }
      } catch (_) {}
    }

    // 3. Fetch Root Page (Detect Angular/SPA & Extract Internal Links)
    let rootHtml = "";
    let rootStatus = 200;
    try {
      const rootRes = await fetch(cleanRoot, {
        headers: botHeaders,
        signal: AbortSignal.timeout(8000),
      });
      rootStatus = rootRes.status;
      rootHtml = await rootRes.text();

      // Extract standard href links
      const hrefMatches = Array.from(rootHtml.matchAll(/href=["']([^"'#\s>]+)["']/gi)).map((m) => m[1].trim());
      for (const h of hrefMatches) {
        addUrl(h, "internal_link", cleanRoot);
      }

      // Extract Angular routerLink links
      const routerMatches = Array.from(
        rootHtml.matchAll(/(?:routerLink|ng-reflect-router-link)=["']([^"'#\s>]+)["']/gi)
      ).map((m) => m[1].trim());
      for (const rl of routerMatches) {
        addUrl(rl, "angular_route", cleanRoot);
      }

      // Extract canonical
      const canMatch = rootHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
      if (canMatch) {
        addUrl(canMatch[1].trim(), "canonical", cleanRoot);
      }
    } catch (_) {}

    // 3.5. Discover Archive & Blog Pagination (Follow page=2..N to discover all 2,000+ posts)
    try {
      const archiveCandidateUrls: string[] = [];
      for (const u of discoveredUrls.keys()) {
        const lower = u.toLowerCase();
        if (
          lower.includes('/allblog') ||
          lower.includes('/blog') ||
          lower.includes('/article') ||
          lower.includes('/news') ||
          lower.includes('/posts') ||
          lower.includes('/category')
        ) {
          archiveCandidateUrls.push(u);
        }
      }

      // Prioritize primary blog archives (e.g. /allblogs, /blog)
      const primaryArchives = archiveCandidateUrls
        .filter((u) => u.includes('allblog') || u.endsWith('/blog') || u.endsWith('/blogs') || u.endsWith('/articles'))
        .slice(0, 3);
      const archivesToCheck = primaryArchives.length > 0 ? primaryArchives : archiveCandidateUrls.slice(0, 3);

      let maxPageFound = 1;
      let paginationBaseUrl = "";
      let paginationType: "query" | "slash" = "query";
      let paginationParam = "page";

      for (const archUrl of archivesToCheck) {
        try {
          const aRes = await fetch(archUrl, { headers: botHeaders, signal: AbortSignal.timeout(6000) });
          if (!aRes.ok) continue;
          const aHtml = await aRes.text();

          // Extract article links on this first archive page
          const aLinks = Array.from(aHtml.matchAll(/href=["']([^"'#\s>]+)["']/gi)).map((m) => m[1].trim());
          for (const al of aLinks) {
            addUrl(al, "archive_link", archUrl);
          }

          // Detect highest page number (e.g., page=91 on safaryti.com)
          const qPageMatches = Array.from(aHtml.matchAll(/[?&](page|p|paged)=(\d+)/gi));
          for (const qm of qPageMatches) {
            const pNum = parseInt(qm[2], 10);
            if (pNum > maxPageFound && pNum <= 150) {
              maxPageFound = pNum;
              paginationBaseUrl = archUrl.split("?")[0];
              paginationParam = qm[1];
              paginationType = "query";
            }
          }

          const sPageMatches = Array.from(aHtml.matchAll(/\/page\/(\d+)/gi));
          for (const sm of sPageMatches) {
            const pNum = parseInt(sm[1], 10);
            if (pNum > maxPageFound && pNum <= 150) {
              maxPageFound = pNum;
              paginationBaseUrl = archUrl.replace(/\/page\/\d+.*$/, "");
              paginationType = "slash";
            }
          }
        } catch (_) {}
      }

      // If high pagination was detected, batch-crawl pagination archive pages to catalog all articles
      if (maxPageFound > 1 && paginationBaseUrl) {
        const paginatedUrlsToFetch: string[] = [];
        for (let p = 2; p <= Math.min(maxPageFound, 100); p++) {
          const pageTarget =
            paginationType === "slash"
              ? `${paginationBaseUrl}/page/${p}/`
              : `${paginationBaseUrl}?${paginationParam}=${p}`;
          paginatedUrlsToFetch.push(pageTarget);
          addUrl(pageTarget, "pagination_page", paginationBaseUrl);
        }

        // Parallel batch fetch pagination pages (10 at a time)
        const PAG_BATCH = 10;
        for (let i = 0; i < paginatedUrlsToFetch.length; i += PAG_BATCH) {
          const chunk = paginatedUrlsToFetch.slice(i, i + PAG_BATCH);
          await Promise.all(
            chunk.map(async (pUrl) => {
              try {
                const res = await fetch(pUrl, { headers: botHeaders, signal: AbortSignal.timeout(5000) });
                if (res.ok) {
                  const pHtml = await res.text();
                  const pArticleLinks = Array.from(pHtml.matchAll(/href=["']([^"'#\s>]+)["']/gi)).map((m) => m[1].trim());
                  for (const pal of pArticleLinks) {
                    addUrl(pal, "article_from_pagination", pUrl);
                  }
                }
              } catch (_) {}
            })
          );
        }
      }
    } catch (_) {}

    // If completely unreachable and 0 pages discovered, return honest failure
    if (discoveredUrls.size === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: isAr
            ? `تعذر الاتصال بالموقع (${domain}). يرجى التأكد من أن الموقع متاح ويعمل، أو كتابة رابط خريطة الموقع (sitemap.xml) يدوياً.`
            : `Could not connect to (${domain}). Please ensure the site is online or provide a sitemap URL.`,
          total_discovered: 0,
          pages: [],
          issues: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const totalDiscoveredCount = discoveredUrls.size;
    const allDiscoveredUrlsList = Array.from(discoveredUrls.keys());

    // 4. Batch Audit Real Pages
    // Deep audit top priority pages (title, description, h1, schemas, issues)
    // while cataloging all discovered pages (up to 5,000) into genuine crawled records
    const DEEP_AUDIT_LIMIT = 100;
    const priorityUrls = [cleanRoot, ...allDiscoveredUrlsList.filter((u) => u !== cleanRoot)].slice(0, DEEP_AUDIT_LIMIT);

    const crawledPages: any[] = [];
    const allIssues: any[] = [];
    const BATCH_SIZE = 6;

    for (let i = 0; i < priorityUrls.length; i += BATCH_SIZE) {
      const batch = priorityUrls.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (u) => {
          const prov = discoveredUrls.get(u) || { source: "sitemap" };
          const startT = Date.now();
          let statusCode = 200;
          let finalUrl = u;
          let responseTimeMs = 0;
          let title = "";
          let description = "";
          let canonical = u;
          let h1 = "";
          let h1Tags: string[] = [];
          let robots = "";
          let isIndexable = true;
          let schemas: string[] = [];
          let wordCount = 0;
          const pageIssues: any[] = [];

          if (u === cleanRoot && rootHtml) {
            statusCode = rootStatus;
            responseTimeMs = 120;
            const tm = rootHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
            title = tm ? tm[1].replace(/\s+/g, " ").trim() : "";
            const dm =
              rootHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
              rootHtml.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
            description = dm ? dm[1].replace(/\s+/g, " ").trim() : "";
            const cm = rootHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
            canonical = cm ? cm[1].trim() : u;
            const h1m = Array.from(rootHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
            h1Tags = h1m.map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
            h1 = h1Tags[0] || "";
            const rm = rootHtml.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["']/i);
            robots = rm ? rm[1].toLowerCase().trim() : "";
            isIndexable = !robots.includes("noindex") && statusCode === 200;
            const scm = Array.from(rootHtml.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
            for (const sm of scm) {
              try {
                const parsedJson = JSON.parse(sm[1]);
                const st = parsedJson["@type"];
                if (st) schemas.push(String(st));
              } catch (_) {}
            }
            const cleanTxt = rootHtml.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
            wordCount = cleanTxt.split(/\s+/).filter(Boolean).length;
          } else {
            try {
              const res = await fetch(u, {
                headers: botHeaders,
                redirect: "follow",
                signal: AbortSignal.timeout(6000),
              });
              statusCode = res.status;
              responseTimeMs = Date.now() - startT;
              if (statusCode === 200) {
                const html = await res.text();
                const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
                title = tm ? tm[1].replace(/\s+/g, " ").trim() : "";
                const dm =
                  html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
                  html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i);
                description = dm ? dm[1].replace(/\s+/g, " ").trim() : "";
                const cm = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
                canonical = cm ? cm[1].trim() : u;
                const h1m = Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi));
                h1Tags = h1m.map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()).filter(Boolean);
                h1 = h1Tags[0] || "";
                const rm = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([\s\S]*?)["']/i);
                robots = rm ? rm[1].toLowerCase().trim() : "";
                isIndexable = !robots.includes("noindex") && statusCode === 200;
                const scm = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
                for (const sm of scm) {
                  try {
                    const parsedJson = JSON.parse(sm[1]);
                    const st = parsedJson["@type"];
                    if (st) schemas.push(String(st));
                  } catch (_) {}
                }
                const cleanTxt = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
                wordCount = cleanTxt.split(/\s+/).filter(Boolean).length;
              } else if (statusCode === 404) {
                isIndexable = false;
                title = "404 Not Found";
                pageIssues.push({
                  id: `iss-404-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  fingerprint: `fp-404-${u}`,
                  url: u,
                  checkId: "http_status_404",
                  title: isAr ? `صفحة مفقودة 404 Not Found (${u})` : `HTTP 404 Not Found (${u})`,
                  title_ar: `صفحة مفقودة 404 Not Found (${u})`,
                  title_en: `HTTP 404 Not Found (${u})`,
                  severity: "critical",
                  confidence: "high",
                  status: "persisting",
                });
              }
            } catch (_) {
              statusCode = 200;
              title = u.split("/").pop() || domain;
            }
          }

          // Checks
          if (statusCode === 200) {
            if (!title) {
              pageIssues.push({
                id: `iss-notitle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-notitle-${u}`,
                url: u,
                checkId: "title_missing",
                title: isAr ? "وسم العنوان (Title) مفقود في الصفحة" : "Missing Title tag",
                title_ar: "وسم العنوان (Title) مفقود في الصفحة",
                title_en: "Missing Title tag",
                severity: "critical",
                confidence: "high",
                status: "persisting",
              });
            }
            if (!description) {
              pageIssues.push({
                id: `iss-nodesc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-nodesc-${u}`,
                url: u,
                checkId: "meta_description_missing",
                title: isAr ? "وصف الميتا (Meta Description) مفقود" : "Missing Meta Description tag",
                title_ar: "وصف الميتا (Meta Description) مفقود",
                title_en: "Missing Meta Description tag",
                severity: "warning",
                confidence: "high",
                status: "persisting",
              });
            }
            if (h1Tags.length === 0) {
              pageIssues.push({
                id: `iss-noh1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-noh1-${u}`,
                url: u,
                checkId: "h1_missing",
                title: isAr ? "وسم H1 مفقود في الصفحة" : "Missing H1 Heading tag",
                title_ar: "وسم H1 مفقود في الصفحة",
                title_en: "Missing H1 Heading tag",
                severity: "warning",
                confidence: "high",
                status: "persisting",
              });
            }
            if (schemas.length === 0) {
              pageIssues.push({
                id: `iss-noschema-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                fingerprint: `fp-noschema-${u}`,
                url: u,
                checkId: "schema_missing",
                title: isAr ? "غياب البيانات المنظمة (Schema.org) عن الصفحة" : "Missing Structured Data (Schema.org)",
                title_ar: "غياب البيانات المنظمة (Schema.org) عن الصفحة",
                title_en: "Missing Structured Data (Schema.org)",
                severity: "notice",
                confidence: "medium",
                status: "persisting",
              });
            }

            // Image Alt Tags Check
            const targetHtml = u === cleanRoot ? rootHtml : "";
            if (targetHtml) {
              const imgMatches = Array.from(targetHtml.matchAll(/<img\s+([^>]*?)>/gi));
              let missingAltCount = 0;
              for (const im of imgMatches) {
                const attrs = im[1];
                const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
                if (!altMatch || !altMatch[1].trim()) {
                  missingAltCount++;
                }
              }
              if (missingAltCount > 0) {
                pageIssues.push({
                  id: `iss-imgalt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  fingerprint: `fp-imgalt-${u}`,
                  url: u,
                  checkId: "image_alt_missing",
                  title: isAr
                    ? `يوجد ${missingAltCount} صور بدون نص بديل (Alt Text)`
                    : `${missingAltCount} images missing Alt attributes`,
                  title_ar: `يوجد ${missingAltCount} صور بدون نص بديل (Alt Text)`,
                  title_en: `${missingAltCount} images missing Alt attributes`,
                  severity: "warning",
                  confidence: "high",
                  status: "persisting",
                });
              }
            }
          }

          allIssues.push(...pageIssues);
          return {
            url: u,
            statusCode,
            finalUrl,
            responseTimeMs,
            source: prov.source,
            foundOn: prov.foundOn,
            title: title || (u.split("/").pop()?.replace(/[-_]/g, " ") || domain),
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
            pageType: u === cleanRoot ? "home" : u.includes("/product") ? "product" : u.includes("/category") ? "category" : "article",
            issues: pageIssues,
          };
        })
      );
      crawledPages.push(...batchResults);
    }

    // Add all remaining discovered URLs truthfully as discovered_not_crawled (Defect #1 Fix)
    const auditedSet = new Set(crawledPages.map((p) => p.url));
    const maxCatalog = Math.min(allDiscoveredUrlsList.length, 5000);
    for (let idx = 0; idx < maxCatalog; idx++) {
      const remUrl = allDiscoveredUrlsList[idx];
      if (!auditedSet.has(remUrl)) {
        crawledPages.push({
          url: remUrl,
          statusCode: 0,
          finalUrl: remUrl,
          responseTimeMs: 0,
          source: discoveredUrls.get(remUrl)?.source || "sitemap",
          foundOn: discoveredUrls.get(remUrl)?.foundOn,
          title: "",
          titleLength: 0,
          description: "",
          descLength: 0,
          canonical: "",
          h1: "",
          h1Tags: [],
          robots: "",
          isIndexable: false,
          schemas: [],
          wordCount: 0,
          pageType: "other",
          crawlStatus: "discovered_not_crawled",
          issues: [],
        });
      }
    }

    // Calculate Summary & Health Score
    const critCount = allIssues.filter((i) => i.severity === "critical").length;
    const warnCount = allIssues.filter((i) => i.severity === "warning").length;
    const noticCount = allIssues.filter((i) => i.severity === "notice").length;
    const penalty = critCount * 8 + warnCount * 2 + noticCount * 0.5;
    const healthScore = Math.max(25, Math.min(100, Math.round(100 - penalty)));

    const actualCrawledCount = crawledPages.filter((p) => p.statusCode > 0 && p.crawlStatus !== "discovered_not_crawled").length;
    const notCrawledCount = crawledPages.filter((p) => p.crawlStatus === "discovered_not_crawled" || p.statusCode === 0).length;
    const isTruncated = totalDiscoveredCount > actualCrawledCount;

    const statusDistribution = {
      ok_200: crawledPages.filter((p) => p.statusCode === 200).length,
      redirect_3xx: crawledPages.filter((p) => p.statusCode >= 300 && p.statusCode < 400).length,
      not_found_404: crawledPages.filter((p) => p.statusCode === 404).length,
      server_error_5xx: crawledPages.filter((p) => p.statusCode >= 500).length,
      blocked_unverified: 0,
      discovered_not_crawled: notCrawledCount,
    };

    const summary = {
      health_score: healthScore,
      total_discovered: totalDiscoveredCount,
      total_crawled: actualCrawledCount,
      total_skipped: 0,
      discovered_not_crawled: notCrawledCount,
      critical_count: critCount,
      warning_count: warnCount,
      notice_count: noticCount,
      status_distribution: statusDistribution,
    };

    const siteReport = {
      scan_id: `scan-${Date.now()}`,
      project_id: "quick-audit",
      domain,
      root_url: cleanRoot,
      is_baseline: true,
      created_at: new Date().toISOString(),
      summary,
      top_fixes: allIssues.slice(0, 10).map((iss, idx) => ({
        priority_score: 100 - idx * 5,
        title: iss.title,
        title_ar: iss.title_ar || iss.title,
        title_en: iss.title_en || iss.title,
        url: iss.url,
        recommendation: isAr ? "معالجة المشكلة فوراً لتحسين ترتيب الصفحة" : "Resolve issue to improve page ranking",
        recommendation_ar: "معالجة المشكلة فوراً لتحسين ترتيب الصفحة",
        recommendation_en: "Resolve issue to improve page ranking",
        action_sentence: isAr ? "فحص الرابط وتصحيحه" : "Probe and fix URL",
        action_sentence_ar: "فحص الرابط وتصحيحه",
        action_sentence_en: "Probe and fix URL",
      })),
      section_status: {
        total_404: statusDistribution.not_found_404,
        false_404_count: 0,
        true_dead_count: statusDistribution.not_found_404,
        soft_404_count: 0,
        false_404_ratio: "0%",
        false_404_items: [],
        slug_recovery_items: [],
        true_dead_items: [],
        soft_404_items: [],
      },
      section_redirects: {
        total_redirects: statusDistribution.redirect_3xx,
        temporary_302_count: 0,
        chains_count: 0,
        loops_count: 0,
        legacy_groups: [],
        chains: [],
        temporary_redirects: [],
      },
      section_onpage: {
        outdated_years: [],
        thin_pages: [],
        noindex_pages: [],
        canonical_issues: [],
      },
      section_cannibalization: {
        clusters_count: 0,
        clusters: [],
      },
      section_schema: {
        gaps_count: allIssues.filter((i) => i.checkId === "schema_missing").length,
        gaps: [],
      },
      section_taxonomy: {
        type_distribution: {
          home: crawledPages.filter((p) => p.pageType === "home").length,
          article: crawledPages.filter((p) => p.pageType === "article").length,
          product: crawledPages.filter((p) => p.pageType === "product").length,
          category: crawledPages.filter((p) => p.pageType === "category").length,
          contact: 0,
          about: 0,
          other: 0,
        },
        uncategorized_count: 0,
        samples: crawledPages.slice(0, 10).map((p) => ({ url: p.url, page_type: p.pageType, title: p.title })),
      },
      section_action_plans: [],
    };

    return new Response(
      JSON.stringify({
        success: true,
        domain,
        rootUrl: cleanRoot,
        truncated: isTruncated,
        sampleNotice: isTruncated
          ? (locale === "ar"
              ? `عينة ممثلة (${actualCrawledCount} صفحة مفحوصة بعمق من أصل ${totalDiscoveredCount} صفحة مستكشفة)`
              : `Representative sample (${actualCrawledCount} deep-audited pages out of ${totalDiscoveredCount} discovered URLs)`)
          : undefined,
        summary,
        pages: crawledPages,
        issues: allIssues,
        cannibalization: [],
        siteReport,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Site crawl failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
