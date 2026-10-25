"""
High-performance polite async SEO crawler for SEO GPS.
Author: Ismail El Asiouty
"""
import asyncio
import hashlib
import ipaddress
import json
import re
import socket
import time
from typing import Dict, Any, List, Set, Optional
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

import httpx

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

        # Check for localhost / loopback
        if hostname.lower() in ("localhost", "127.0.0.1", "::1"):
            return False

        # Resolve IP addresses
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
        timeout: int = 25,
        allow_local: bool = False,
    ):
        self.domain = domain.lower()
        self.user_agent = user_agent
        self.max_pages = max_pages
        self.concurrency = concurrency
        self.delay = delay_ms / 1000.0
        self.timeout = timeout
        self.allow_local = allow_local
        self.visited_urls: Set[str] = set()
        self.queue: asyncio.Queue = asyncio.Queue()
        self.sitemap_urls: Set[str] = set()
        self.results: List[Dict[str, Any]] = []

    async def fetch_sitemap(self, sitemap_url: str, client: httpx.AsyncClient) -> List[str]:
        """Fetch and extract URLs from XML sitemap (handles sitemap index files)."""
        urls: List[str] = []
        if not is_safe_url(sitemap_url, self.allow_local):
            return urls

        try:
            resp = await client.get(sitemap_url, timeout=self.timeout)
            if resp.status_code != 200:
                return urls

            content = resp.content
            # Handle gzipped sitemaps if required
            if sitemap_url.endswith(".gz"):
                import gzip
                content = gzip.decompress(content)

            root = ET.fromstring(content)
            # Remove namespace prefixes
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
            print(f"[Crawler] Sitemap fetch warning for {sitemap_url}: {e}")

        return urls

    def parse_html_page(self, url: str, status_code: int, response_time_ms: int, headers: httpx.Headers, body: str) -> Dict[str, Any]:
        """Extract SEO signals from HTML string."""
        x_robots = headers.get("X-Robots-Tag", "")

        # Quick regex extraction for maximum speed & zero-dependency resilience
        title_match = re.search(r"<title[^>]*>(.*?)</title>", body, re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else ""

        desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']', body, re.IGNORECASE)
        if not desc_match:
            desc_match = re.search(r'<meta[^>]+content=["\'](.*?)["\'][^>]+name=["\']description["\']', body, re.IGNORECASE)
        description = desc_match.group(1).strip() if desc_match else ""

        canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\'](.*?)["\']', body, re.IGNORECASE)
        if not canonical_match:
            canonical_match = re.search(r'<link[^>]+href=["\'](.*?)["\'][^>]+rel=["\']canonical["\']', body, re.IGNORECASE)
        canonical = canonical_match.group(1).strip() if canonical_match else ""

        robots_match = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\'](.*?)["\']', body, re.IGNORECASE)
        robots_meta = robots_match.group(1).strip() if robots_match else ""

        # Headings (H1)
        h1_matches = re.findall(r"<h1[^>]*>(.*?)</h1>", body, re.IGNORECASE | re.DOTALL)
        h1_tags = [re.sub(r"<[^>]+>", "", h).strip() for h in h1_matches if h.strip()]

        # Schema JSON-LD discovery
        json_ld_matches = re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', body, re.IGNORECASE | re.DOTALL)
        schema_types = []
        schema_errors = []
        schema_items = {}

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
                            schema_items[stype] = it
            except Exception as err:
                schema_errors.append(str(err))

        # Check indexability
        combined_robots = f"{robots_meta} {x_robots}".lower()
        is_indexable = "noindex" not in combined_robots and status_code == 200

        # Hashes
        content_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        title_hash = hashlib.md5(title.encode("utf-8")).hexdigest() if title else ""
        desc_hash = hashlib.md5(description.encode("utf-8")).hexdigest() if description else ""

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
            "schema_items": schema_items,
            "h1_tags": h1_tags,
            "content_hash": content_hash,
            "in_sitemap": url in self.sitemap_urls,
        }

    async def crawl(self, root_url: str, sitemap_url: Optional[str] = None) -> List[Dict[str, Any]]:
        """Main crawl orchestrator."""
        headers = {"User-Agent": self.user_agent, "Accept": "text/html,application/xhtml+xml"}
        async with httpx.AsyncClient(headers=headers, follow_redirects=True, verify=False) as client:
            # 1. Sitemap extraction
            if sitemap_url:
                s_urls = await self.fetch_sitemap(sitemap_url, client)
                for u in s_urls:
                    self.sitemap_urls.add(u)
                    if len(self.visited_urls) + self.queue.qsize() < self.max_pages:
                        await self.queue.put(u)

            if root_url and root_url not in self.sitemap_urls:
                await self.queue.put(root_url)

            # 2. Worker pool
            semaphore = asyncio.Semaphore(self.concurrency)

            async def worker():
                while not self.queue.empty() and len(self.visited_urls) < self.max_pages:
                    url = await self.queue.get()
                    if url in self.visited_urls:
                        self.queue.task_done()
                        continue

                    self.visited_urls.add(url)
                    if not is_safe_url(url, self.allow_local):
                        self.queue.task_done()
                        continue

                    async with semaphore:
                        try:
                            start_t = time.time()
                            resp = await client.get(url, timeout=self.timeout)
                            duration_ms = int((time.time() - start_t) * 1000)

                            if "text/html" in resp.headers.get("content-type", ""):
                                snapshot = self.parse_html_page(
                                    url=url,
                                    status_code=resp.status_code,
                                    response_time_ms=duration_ms,
                                    headers=resp.headers,
                                    body=resp.text,
                                )
                                self.results.append(snapshot)

                                # Internal link discovery
                                hrefs = re.findall(r'href=["\'](.*?)["\']', resp.text, re.IGNORECASE)
                                for href in hrefs:
                                    full_url = urljoin(url, href).split("#")[0]
                                    parsed = urlparse(full_url)
                                    if parsed.netloc.lower() == self.domain and full_url not in self.visited_urls:
                                        if len(self.visited_urls) + self.queue.qsize() < self.max_pages:
                                            await self.queue.put(full_url)

                            await asyncio.sleep(self.delay)
                        except Exception as e:
                            self.results.append({
                                "url": url,
                                "status_code": 500,
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
                                "schema_items": {},
                                "h1_tags": [],
                                "content_hash": "",
                                "in_sitemap": url in self.sitemap_urls,
                            })
                        finally:
                            self.queue.task_done()

            tasks = [asyncio.create_task(worker()) for _ in range(self.concurrency)]
            await self.queue.join()
            for t in tasks:
                t.cancel()

        return self.results
