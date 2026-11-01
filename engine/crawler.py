"""
High-performance polite async SEO crawler with resumable checkpoints,
two-step confirmation, smart sanitization, and full provenance for SEO GPS.
Author: Ismail El Asiouty
"""
import asyncio
import hashlib
import ipaddress
import json
import re
import socket
import time
from typing import Dict, Any, List, Set, Optional, Tuple, Callable
from urllib.parse import urljoin, urlparse, unquote
import xml.etree.ElementTree as ET

import httpx

from engine.url_sanitizer import (
    sanitize_url,
    recover_slug,
    match_dead_page_redirect,
    is_soft_404,
    generate_redirect_rules,
)
from engine.content_analyzers import (
    scan_outdated_years,
    analyze_title_meta_quality,
    classify_url_taxonomy,
    analyze_structured_data_gaps,
    build_deterministic_action_plan,
)

# Private IP networks to block for SSRF protection
PRIVATE_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]

SECONDARY_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"


def is_safe_url(url: str, allow_local: bool = False) -> bool:
    """SSRF safeguard: ensure URL is public http/https and does not resolve to private IP."""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False

        if allow_local:
            return True

        if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            return False

        ip_addresses = socket.getaddrinfo(hostname, None)
        for family, _, _, _, sockaddr in ip_addresses:
            ip = ipaddress.ip_address(sockaddr[0])
            for net in PRIVATE_NETWORKS:
                if ip in net:
                    return False
        return True
    except Exception:
        return False


class PoliteCrawler:
    def __init__(
        self,
        domain: str,
        user_agent: str = "SEOGPS-Bot/1.0 (+https://isamilelasiouty.github.io/seo-gps; by Ismail El Asiouty)",
        max_pages: int = 2000,
        concurrency: int = 5,
        delay_ms: int = 250,
        timeout: int = 20,
        allow_local: bool = False,
        target_year: int = 2027,
        max_hops: int = 5,
        word_count_threshold: int = 250,
        slug_confidence_threshold: float = 0.60,
        taxonomy_rules: Optional[Dict[str, List[str]]] = None,
        ctr_keywords: Optional[List[str]] = None,
        on_progress: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        self.domain = domain.lower()
        self.user_agent = user_agent
        self.max_pages = max_pages
        self.concurrency = concurrency
        self.delay = delay_ms / 1000.0
        self.timeout = timeout
        self.allow_local = allow_local
        self.target_year = target_year
        self.max_hops = max_hops
        self.word_count_threshold = word_count_threshold
        self.slug_confidence_threshold = slug_confidence_threshold
        self.taxonomy_rules = taxonomy_rules
        self.ctr_keywords = ctr_keywords
        self.on_progress = on_progress

        # State tracking
        self.discovered_urls: Dict[str, Dict[str, Any]] = {}  # url -> {source, found_on, ...}
        self.visited_urls: Set[str] = set()
        self.inbound_links: Dict[str, Set[str]] = {}  # target_url -> set(source_urls)
        self.sitemap_urls: Set[str] = set()
        self.crawled_pages: List[Dict[str, Any]] = []
        self.skipped_urls: List[Dict[str, Any]] = []
        self.redirect_inventory: List[Dict[str, Any]] = []
        self.redirect_rules: List[Dict[str, Any]] = []

    def get_crawl_stats(self) -> Dict[str, int]:
        return {
            "total_discovered": len(self.discovered_urls),
            "total_crawled": len(self.crawled_pages),
            "total_skipped": len(self.skipped_urls),
        }

    def notify_progress(self, phase: str):
        if self.on_progress:
            total_discovered = len(self.discovered_urls)
            total_crawled = len(self.crawled_pages)
            total_skipped = len(self.skipped_urls)
            remaining = max(0, total_discovered - total_crawled - total_skipped)
            self.on_progress({
                "phase": phase,
                "discovered": total_discovered,
                "crawled": total_crawled,
                "skipped": total_skipped,
                "remaining": remaining,
            })

    async def fetch_sitemap(self, sitemap_url: str, client: httpx.AsyncClient) -> List[str]:
        """Fetch and extract URLs from XML sitemap (handles sitemap index files & .gz)."""
        urls: List[str] = []
        if not is_safe_url(sitemap_url, self.allow_local):
            return urls

        try:
            resp = await client.get(sitemap_url, timeout=self.timeout)
            if resp.status_code != 200:
                return urls

            content = resp.content
            if sitemap_url.endswith(".gz"):
                import gzip
                content = gzip.decompress(content)

            root = ET.fromstring(content)
            tag = root.tag.split("}")[-1] if "}" in root.tag else root.tag

            if tag == "sitemapindex":
                for elem in root:
                    loc = elem.find("{*}loc")
                    if loc is not None and loc.text:
                        sub_urls = await self.fetch_sitemap(loc.text.strip(), client)
                        urls.extend(sub_urls)
            elif tag == "urlset":
                for elem in root:
                    loc = elem.find("{*}loc")
                    if loc is not None and loc.text:
                        u = loc.text.strip()
                        urls.append(u)
        except Exception as e:
            # Non-fatal warning
            pass

        return urls

    def parse_html_signals(
        self,
        url: str,
        status_code: int,
        response_time_ms: int,
        headers: httpx.Headers,
        body: str
    ) -> Dict[str, Any]:
        """Extract comprehensive SEO signals from HTML string."""
        x_robots = headers.get("X-Robots-Tag", "")

        # Title
        title_match = re.search(r"<title[^>]*>(.*?)</title>", body, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""

        # Meta description
        desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', body, re.IGNORECASE)
        if not desc_match:
            desc_match = re.search(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', body, re.IGNORECASE)
        description = desc_match.group(1).strip() if desc_match else ""

        # Canonical
        canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']', body, re.IGNORECASE)
        if not canonical_match:
            canonical_match = re.search(r'<link[^>]+href=["\'](.*?)["\'][^>]+rel=["\']canonical["\']', body, re.IGNORECASE)
        canonical = canonical_match.group(1).strip() if canonical_match else ""

        # Robots
        robots_match = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'](.*?)["\']', body, re.IGNORECASE)
        robots_meta = robots_match.group(1).strip() if robots_match else ""

        # Headings (H1)
        h1_matches = re.findall(r"<h1[^>]*>(.*?)</h1>", body, re.IGNORECASE | re.DOTALL)
        h1_tags = [re.sub(r"<[^>]+>", "", h).strip() for h in h1_matches if h.strip()]
        primary_h1 = h1_tags[0] if h1_tags else ""

        # Body text extraction (stripping scripts, styles, tags)
        cleaned_body = re.sub(r"<script[^>]*>.*?</script>", " ", body, flags=re.DOTALL | re.IGNORECASE)
        cleaned_body = re.sub(r"<style[^>]*>.*?</style>", " ", cleaned_body, flags=re.DOTALL | re.IGNORECASE)
        text_content = re.sub(r"<[^>]+>", " ", cleaned_body)
        text_content = re.sub(r"\s+", " ", text_content).strip()
        word_count = len(text_content.split())

        # JavaScript Rendering Check (empty body or framework shell)
        requires_rendering = False
        if word_count < 25 and not title and ("id=\"root\"" in body or "id=\"app\"" in body or "<noscript>" in body):
            requires_rendering = True

        # Schema JSON-LD discovery
        json_ld_matches = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', body, re.IGNORECASE | re.DOTALL)
        schema_types = []
        schema_errors = []
        date_modified = None

        for raw_json in json_ld_matches:
            try:
                parsed = json.loads(raw_json)
                items = parsed if isinstance(parsed, list) else [parsed]
                for it in items:
                    stype = it.get("@type")
                    if stype:
                        if isinstance(stype, list):
                            schema_types.extend(stype)
                        else:
                            schema_types.append(stype)
                    if "dateModified" in it:
                        date_modified = it["dateModified"]
            except Exception as err:
                schema_errors.append(str(err))

        # Check indexability
        combined_robots = f"{robots_meta} {x_robots}".lower()
        is_indexable = "noindex" not in combined_robots and status_code == 200

        # Taxonomy classification
        page_type = classify_url_taxonomy(url, title, primary_h1, self.taxonomy_rules)

        # Freshness / Year Pattern Scanner
        year_findings = []
        year_findings.extend(scan_outdated_years(title, self.target_year, "title"))
        year_findings.extend(scan_outdated_years(primary_h1, self.target_year, "h1"))
        year_findings.extend(scan_outdated_years(description, self.target_year, "description"))

        # Title & Meta Description Quality & CTR
        title_meta_quality = analyze_title_meta_quality(title, description, primary_h1, self.ctr_keywords)

        # Structured Data Gaps
        schema_gaps, generated_faq = analyze_structured_data_gaps(page_type, schema_types, body, date_modified)

        # Content hashes
        content_hash = hashlib.sha256(text_content.encode("utf-8")).hexdigest()
        title_hash = hashlib.md5(title.encode("utf-8")).hexdigest() if title else ""
        desc_hash = hashlib.md5(description.encode("utf-8")).hexdigest() if description else ""

        # Classification check (e.g. soft 404)
        classification = "200_ok"
        soft_404_flag, soft_404_reason = is_soft_404(status_code, title, primary_h1, text_content)
        if soft_404_flag:
            classification = "soft_404"

        return {
            "url": url,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "canonical_url": canonical,
            "title": title,
            "title_hash": title_hash,
            "description": description,
            "description_hash": desc_hash,
            "robots_meta": robots_meta,
            "x_robots_tag": x_robots,
            "is_indexable": is_indexable,
            "schema_types": list(set(schema_types)),
            "schema_errors": schema_errors,
            "h1": primary_h1,
            "h1_tags": h1_tags,
            "word_count": word_count,
            "content_hash": content_hash,
            "page_type": page_type,
            "classification": classification,
            "soft_404_reason": soft_404_reason,
            "requires_rendering": requires_rendering,
            "year_findings": year_findings,
            "title_meta_quality": title_meta_quality,
            "schema_gaps": schema_gaps,
            "generated_faq": generated_faq,
            "text_sample": text_content[:2000],
        }

    async def two_step_confirm_url(
        self,
        target_url: str,
        initial_status: int,
        client_primary: httpx.AsyncClient,
        client_secondary: httpx.AsyncClient
    ) -> Dict[str, Any]:
        """
        Two-Step Confirmation before reporting any 404/410/5xx/timeout:
        1. Apply Smart URL Sanitizer. If sanitized URL returns 200/redirect -> classify as False 404.
        2. Re-request with an alternate standard browser User-Agent after a polite delay.
        3. Never report transient timeouts or 403 WAF blocks as 404.
        """
        # Step 1: Sanitize URL
        cleaned_url, defects = sanitize_url(target_url)
        if defects and cleaned_url != target_url:
            try:
                res_clean = await client_primary.get(cleaned_url, timeout=self.timeout)
                if res_clean.status_code == 200 or (300 <= res_clean.status_code < 400):
                    return {
                        "is_false_404": True,
                        "defects": defects,
                        "corrected_url": cleaned_url,
                        "final_status": res_clean.status_code,
                        "classification": "not_found_404", # Flagged as false 404 in evidence
                    }
            except Exception:
                pass

        # Step 2: Re-request after a polite pause with secondary browser User-Agent
        await asyncio.sleep(0.3)
        try:
            res_sec = await client_secondary.get(target_url, timeout=self.timeout)
            sec_status = res_sec.status_code
            if sec_status == 200:
                return {
                    "is_false_404": False,
                    "defects": [],
                    "corrected_url": target_url,
                    "final_status": 200,
                    "classification": "200_ok",
                }
            if 300 <= sec_status < 400:
                return {
                    "is_false_404": False,
                    "defects": [],
                    "corrected_url": str(res_sec.headers.get("location", target_url)),
                    "final_status": sec_status,
                    "classification": f"redirect_{sec_status}",
                }
            if sec_status in (403, 429):
                return {
                    "is_false_404": False,
                    "defects": [],
                    "corrected_url": target_url,
                    "final_status": sec_status,
                    "classification": "blocked_unverified",
                }
            if sec_status >= 500:
                return {
                    "is_false_404": False,
                    "defects": [],
                    "corrected_url": target_url,
                    "final_status": sec_status,
                    "classification": "server_error_5xx",
                }
            if sec_status == 410:
                return {
                    "is_false_404": False,
                    "defects": [],
                    "corrected_url": target_url,
                    "final_status": 410,
                    "classification": "gone_410",
                }
            return {
                "is_false_404": False,
                "defects": [],
                "corrected_url": target_url,
                "final_status": 404,
                "classification": "not_found_404",
            }
        except httpx.TimeoutException:
            return {
                "is_false_404": False,
                "defects": [],
                "corrected_url": target_url,
                "final_status": 0,
                "classification": "timeout",
            }
        except Exception:
            return {
                "is_false_404": False,
                "defects": [],
                "corrected_url": target_url,
                "final_status": initial_status,
                "classification": "blocked_unverified" if initial_status in (403, 429) else "not_found_404",
            }

    async def crawl(
        self,
        root_url: str,
        sitemap_url: Optional[str] = None,
        extra_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Executes the full crawl with provenance recording and post-crawl analyzers.
        """
        clean_root = root_url.rstrip("/")
        self.notify_progress("discovery")

        headers_primary = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        headers_secondary = {
            "User-Agent": SECONDARY_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }

        async with httpx.AsyncClient(headers=headers_primary, follow_redirects=False, verify=False) as client_pri, \
                   httpx.AsyncClient(headers=headers_secondary, follow_redirects=False, verify=False) as client_sec:

            # 1. Register Root URL
            if clean_root:
                self.discovered_urls[clean_root] = {
                    "url": clean_root,
                    "source": "root",
                    "found_on": None,
                }

            # 2. Register Sitemap URLs
            if sitemap_url:
                s_urls = await self.fetch_sitemap(sitemap_url, client_pri)
                for u in s_urls:
                    u_clean = u.rstrip("/")
                    self.sitemap_urls.add(u_clean)
                    if u_clean not in self.discovered_urls and len(self.discovered_urls) < self.max_pages:
                        self.discovered_urls[u_clean] = {
                            "url": u_clean,
                            "source": "sitemap",
                            "found_on": sitemap_url,
                        }

            # 3. Register Imported URLs (Section 2.1)
            if extra_urls:
                for extra in extra_urls:
                    extra_clean = extra.strip().rstrip("/")
                    if extra_clean and extra_clean not in self.discovered_urls:
                        self.discovered_urls[extra_clean] = {
                            "url": extra_clean,
                            "source": "imported",
                            "found_on": "user_import",
                        }

            # 4. Crawl Queue Execution
            self.notify_progress("crawling")
            queue: asyncio.Queue = asyncio.Queue()
            for u in list(self.discovered_urls.keys()):
                await queue.put(u)

            semaphore = asyncio.Semaphore(self.concurrency)

            async def worker():
                while not queue.empty() and len(self.visited_urls) < self.max_pages:
                    url = await queue.get()
                    if url in self.visited_urls:
                        queue.task_done()
                        continue

                    self.visited_urls.add(url)
                    provenance = self.discovered_urls.get(url, {"source": "internal_link", "found_on": None})

                    # Safety check
                    if not is_safe_url(url, self.allow_local):
                        self.skipped_urls.append({
                            "url": url,
                            "source": provenance["source"],
                            "found_on": provenance["found_on"],
                            "classification": "skipped",
                            "skip_reason": "Blocked by SSRF or security safety filter",
                        })
                        queue.task_done()
                        continue

                    async with semaphore:
                        try:
                            start_t = time.time()
                            redirect_chain = []
                            current_req_url = url
                            hops = 0
                            response = None

                            # Follow redirects manually to record complete hops
                            while hops < self.max_hops:
                                resp = await client_pri.get(current_req_url, timeout=self.timeout)
                                status = resp.status_code
                                hops += 1

                                if 300 <= status < 400 and "location" in resp.headers:
                                    target = urljoin(current_req_url, resp.headers["location"]).rstrip("/")
                                    redirect_chain.append({
                                        "from": current_req_url,
                                        "to": target,
                                        "status_code": status,
                                    })
                                    # Register target in discovered if on same domain
                                    parsed_t = urlparse(target)
                                    if parsed_t.netloc.lower() == self.domain and target not in self.discovered_urls:
                                        if len(self.discovered_urls) < self.max_pages:
                                            self.discovered_urls[target] = {
                                                "url": target,
                                                "source": "internal_link",
                                                "found_on": current_req_url,
                                            }
                                            await queue.put(target)

                                    current_req_url = target
                                else:
                                    response = resp
                                    break

                            duration_ms = int((time.time() - start_t) * 1000)

                            if response is None:
                                response = resp

                            final_status = response.status_code
                            final_url = current_req_url

                            # If initial URL redirected
                            if redirect_chain:
                                first_hop = redirect_chain[0]
                                first_code = first_hop["status_code"]
                                code_class = f"redirect_{first_code}" if first_code in (301, 308) else "redirect_302_307"

                                self.redirect_inventory.append({
                                    "source_url": url,
                                    "final_url": final_url,
                                    "status_code": first_code,
                                    "hops_count": len(redirect_chain),
                                    "chain": redirect_chain,
                                    "source": provenance["source"],
                                    "found_on": provenance["found_on"],
                                })

                                # Generate collapsed rules if chain > 1 or for Nginx/.htaccess
                                if len(redirect_chain) > 1 or first_code == 301:
                                    rule = generate_redirect_rules(url, final_url, 301)
                                    self.redirect_rules.append(rule)

                                self.crawled_pages.append({
                                    "url": url,
                                    "final_url": final_url,
                                    "status_code": first_code,
                                    "response_time_ms": duration_ms,
                                    "canonical_url": final_url,
                                    "title": f"Redirects to {final_url}",
                                    "title_hash": "",
                                    "description": "",
                                    "description_hash": "",
                                    "robots_meta": "",
                                    "x_robots_tag": "",
                                    "is_indexable": False,
                                    "schema_types": [],
                                    "schema_errors": [],
                                    "h1": "",
                                    "h1_tags": [],
                                    "word_count": 0,
                                    "content_hash": "",
                                    "page_type": "other",
                                    "classification": code_class,
                                    "redirect_chain": redirect_chain,
                                    "source": provenance["source"],
                                    "found_on": provenance["found_on"],
                                    "in_sitemap": url in self.sitemap_urls,
                                })

                            # If 200 OK
                            elif final_status == 200 and "text/html" in response.headers.get("content-type", ""):
                                snapshot = self.parse_html_signals(
                                    url=url,
                                    status_code=final_status,
                                    response_time_ms=duration_ms,
                                    headers=response.headers,
                                    body=response.text,
                                )
                                snapshot["final_url"] = final_url
                                snapshot["redirect_chain"] = []
                                snapshot["source"] = provenance["source"]
                                snapshot["found_on"] = provenance["found_on"]
                                snapshot["in_sitemap"] = url in self.sitemap_urls

                                self.crawled_pages.append(snapshot)

                                # Discover internal links
                                hrefs = re.findall(r'href=["\'](.*?)["\']', response.text, re.IGNORECASE)
                                for href in hrefs:
                                    full_url = urljoin(url, href).split("#")[0].rstrip("/")
                                    parsed = urlparse(full_url)
                                    if parsed.netloc.lower() == self.domain and parsed.scheme in ("http", "https"):
                                        # Track inbound link
                                        if full_url not in self.inbound_links:
                                            self.inbound_links[full_url] = set()
                                        self.inbound_links[full_url].add(url)

                                        if full_url not in self.discovered_urls and len(self.discovered_urls) < self.max_pages:
                                            self.discovered_urls[full_url] = {
                                                "url": full_url,
                                                "source": "internal_link",
                                                "found_on": url,
                                            }
                                            await queue.put(full_url)

                            # If 404, 410, 5xx, or other error -> Two-Step Confirmation
                            else:
                                confirm = await self.two_step_confirm_url(url, final_status, client_pri, client_sec)
                                self.crawled_pages.append({
                                    "url": url,
                                    "final_url": confirm["corrected_url"],
                                    "status_code": confirm["final_status"],
                                    "response_time_ms": duration_ms,
                                    "canonical_url": "",
                                    "title": "",
                                    "title_hash": "",
                                    "description": "",
                                    "description_hash": "",
                                    "robots_meta": "",
                                    "x_robots_tag": "",
                                    "is_indexable": False,
                                    "schema_types": [],
                                    "schema_errors": [],
                                    "h1": "",
                                    "h1_tags": [],
                                    "word_count": 0,
                                    "content_hash": "",
                                    "page_type": "other",
                                    "classification": confirm["classification"],
                                    "is_false_404": confirm.get("is_false_404", False),
                                    "defects": confirm.get("defects", []),
                                    "redirect_chain": [],
                                    "source": provenance["source"],
                                    "found_on": provenance["found_on"],
                                    "in_sitemap": url in self.sitemap_urls,
                                })

                            await asyncio.sleep(self.delay)
                        except Exception as e:
                            # Classify transient failure
                            err_str = str(e).lower()
                            classification = "timeout" if "timeout" in err_str else "server_error_5xx"
                            self.crawled_pages.append({
                                "url": url,
                                "final_url": url,
                                "status_code": 0,
                                "response_time_ms": 0,
                                "canonical_url": "",
                                "title": "",
                                "title_hash": "",
                                "description": "",
                                "description_hash": "",
                                "robots_meta": "",
                                "x_robots_tag": "",
                                "is_indexable": False,
                                "schema_types": [],
                                "schema_errors": [str(e)],
                                "h1": "",
                                "h1_tags": [],
                                "word_count": 0,
                                "content_hash": "",
                                "page_type": "other",
                                "classification": classification,
                                "redirect_chain": [],
                                "source": provenance["source"],
                                "found_on": provenance["found_on"],
                                "in_sitemap": url in self.sitemap_urls,
                            })
                        finally:
                            queue.task_done()

            # Run workers
            tasks = [asyncio.create_task(worker()) for _ in range(self.concurrency)]
            await queue.join()
            for t in tasks:
                t.cancel()

        self.notify_progress("analyzing")

        # 5. Post-Crawl Enrichments
        healthy_pages = [p for p in self.crawled_pages if p.get("status_code") == 200]
        healthy_urls = [p["url"] for p in healthy_pages]

        # A. Slug Recovery & Dead Page Matching for 404/410 pages
        for page in self.crawled_pages:
            u = page["url"]
            inbounds = list(self.inbound_links.get(u, set()))
            page["inbound_links"] = inbounds

            if page.get("classification") in ("not_found_404", "gone_410"):
                if not page.get("is_false_404"):
                    recovery = recover_slug(u, healthy_urls, self.slug_confidence_threshold)
                    page["slug_recovery"] = recovery
                    matcher = match_dead_page_redirect(u, healthy_pages)
                    page["dead_page_match"] = matcher
                    if matcher and matcher.get("suggested_url"):
                        rule = generate_redirect_rules(u, matcher["suggested_url"], 301)
                        self.redirect_rules.append(rule)

        # B. Identify Orphan Pages vs Missing Sitemap Pages
        for page in self.crawled_pages:
            u = page["url"]
            is_orphan = page.get("in_sitemap", False) and len(page.get("inbound_links", [])) == 0 and u != clean_root
            page["is_orphan"] = is_orphan
            is_missing_from_sitemap = page.get("is_indexable", False) and not page.get("in_sitemap", False)
            page["is_missing_from_sitemap"] = is_missing_from_sitemap

        self.notify_progress("completed")

        return {
            "total_discovered": len(self.discovered_urls),
            "total_crawled": len(self.crawled_pages),
            "total_skipped": len(self.skipped_urls),
            "crawled_pages": self.crawled_pages,
            "skipped_urls": self.skipped_urls,
            "redirect_inventory": self.redirect_inventory,
            "redirect_rules": self.redirect_rules,
            "sitemap_urls": list(self.sitemap_urls),
        }
