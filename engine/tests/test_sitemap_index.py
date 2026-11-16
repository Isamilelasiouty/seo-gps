import pytest
import httpx
from engine.crawler import PoliteCrawler

@pytest.mark.asyncio
async def test_recursive_sitemap_index_parsing():
    crawler = PoliteCrawler(domain="test-angular.com", max_pages=10000, allow_local=True)

    # Mock XML responses
    sitemap_index_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>http://127.0.0.1:8099/sitemap-part1.xml</loc>
      </sitemap>
      <sitemap>
        <loc>http://127.0.0.1:8099/sitemap-part2.xml</loc>
      </sitemap>
    </sitemapindex>"""

    sitemap_part1_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://test-angular.com/page-1</loc></url>
      <url><loc>https://test-angular.com/page-2</loc></url>
    </urlset>"""

    sitemap_part2_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://test-angular.com/page-3</loc></url>
      <url><loc>https://test-angular.com/page-4</loc></url>
    </urlset>"""

    # Custom transport for mocking
    def handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if "sitemap_index.xml" in url_str:
            return httpx.Response(200, content=sitemap_index_xml.encode("utf-8"))
        elif "sitemap-part1.xml" in url_str:
            return httpx.Response(200, content=sitemap_part1_xml.encode("utf-8"))
        elif "sitemap-part2.xml" in url_str:
            return httpx.Response(200, content=sitemap_part2_xml.encode("utf-8"))
        return httpx.Response(404)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        urls = await crawler.fetch_sitemap("http://127.0.0.1:8099/sitemap_index.xml", client)
        assert len(urls) == 4
        assert "https://test-angular.com/page-1" in urls
        assert "https://test-angular.com/page-4" in urls
