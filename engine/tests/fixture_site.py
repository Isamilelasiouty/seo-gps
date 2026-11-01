"""
Deterministic Fixture Website Server for Local Testing.
Author: Ismail El Asiouty

Runs on http://127.0.0.1:8099 with two deterministic states:
- Day 1 (Baseline): Full inventory of clean and defect pages
- Day 2 (Daily re-scan): Resolves some issues, persists others, introduces new ones, and revives a resolved one.
Switch states via: POST /__state?day=1 or POST /__state?day=2
"""
import sys
import time
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

CURRENT_STATE = 1


class FixtureHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence default access logs to keep terminal clean unless debugging
        pass

    def send_html(self, content: str, status_code: int = 200, headers: dict = None):
        self.send_response(status_code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        if headers:
            for k, v in headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(content.encode("utf-8"))

    def send_redirect(self, location: str, status_code: int = 301):
        self.send_response(status_code)
        self.send_header("Location", location)
        self.end_headers()

    def do_POST(self):
        global CURRENT_STATE
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/__state":
            qs = urllib.parse.parse_qs(parsed.query)
            day = int(qs.get("day", ["1"])[0])
            CURRENT_STATE = day
            self.send_html(f'{{"status": "ok", "day": {CURRENT_STATE}}}', 200, {"Content-Type": "application/json"})
            return
        self.send_error(404, "Not Found")

    def do_GET(self):
        global CURRENT_STATE
        raw_path = self.path
        parsed = urllib.parse.urlparse(raw_path)
        path = parsed.path
        decoded_path = urllib.parse.unquote(path)

        # State inspection
        if path == "/__state":
            self.send_html(f'{{"status": "ok", "day": {CURRENT_STATE}}}', 200, {"Content-Type": "application/json"})
            return

        # robots.txt
        if path == "/robots.txt":
            content = (
                "User-agent: *\n"
                "Disallow: /blocked-admin/\n"
                "Sitemap: http://127.0.0.1:8099/sitemap.xml\n"
            )
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
            return

        # sitemap.xml
        if path == "/sitemap.xml":
            sitemap_urls = [
                "http://127.0.0.1:8099/",
                "http://127.0.0.1:8099/programs/computer-science",
                "http://127.0.0.1:8099/programs/medicine",
                "http://127.0.0.1:8099/programs/business",
                "http://127.0.0.1:8099/blog/admission-guide",
                "http://127.0.0.1:8099/legacy/old-course-1",  # redirects to CS
                "http://127.0.0.1:8099/legacy/old-course-2",  # redirects to CS
                "http://127.0.0.1:8099/sitemap-dead-page",     # 404 in sitemap
                "http://127.0.0.1:8099/chain-step-1",          # chain start
                "http://127.0.0.1:8099/canonical-mismatch",
                "http://127.0.0.1:8099/soft-404-page",
                "http://127.0.0.1:8099/cannibal-article-a",
                "http://127.0.0.1:8099/cannibal-article-b",
                "http://127.0.0.1:8099/arabic-slug-دليل-القبول",
            ]
            if CURRENT_STATE == 2:
                sitemap_urls.append("http://127.0.0.1:8099/new-broken-link")

            xml_items = "\n".join([f"  <url><loc>{u}</loc><lastmod>2026-10-30</lastmod></url>" for u in sitemap_urls])
            xml = f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{xml_items}\n</urlset>'
            self.send_response(200)
            self.send_header("Content-Type", "application/xml; charset=utf-8")
            self.end_headers()
            self.wfile.write(xml.encode("utf-8"))
            return

        # Homepage
        if path in ("/", "/index.html"):
            links_day2 = ""
            if CURRENT_STATE == 2:
                links_day2 = """
                <li><a href="/new-broken-link">New Broken Link (Day 2)</a></li>
                <li><a href="/reappeared-issue">Reappeared Issue (Day 2)</a></li>
                """

            html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>بوابة القبول الجامعي 2026 - الصفحة الرئيسية</title>
  <meta name="description" content="دليل شامل لكافة متطلبات وشروط القبول بالجامعات المصرية والدولية لعام 2026.">
  <link rel="canonical" href="http://127.0.0.1:8099/">
</head>
<body>
  <h1>بوابة التنسيق والقبول الأكاديمي</h1>
  <p>أهلاً بكم في الموقع النموذجي لاختبار نظام SEO GPS.</p>
  <ul>
    <li><a href="/programs/computer-science">برنامج علوم الحاسب</a></li>
    <li><a href="/programs/medicine">شروط القبول في كلية الطب 2024</a></li>
    <li><a href="/programs/business">إدارة الأعمال والتمويل</a></li>
    <li><a href="/blog/admission-guide">مقال توجيهي موجز</a></li>
    <li><a href="/%20false-404-leading-space">رابط بمساحة بيضاء زائدة (False 404)</a></li>
    <li><a href="/arabic-slug-%D8%AF%D9%84%D9%8A%D9%84-%D8%A7%D9%84%D9%82%D8%A8">رابط عربي مقطوع (Truncated Arabic Slug)</a></li>
    <li><a href="/true-dead-page-xyz">صفحة محذوفة نهائياً (True Dead Page)</a></li>
    <li><a href="/chain-step-1">سلسلة تحويلات (Redirect Chain)</a></li>
    <li><a href="/redirect-loop-1">دائرة تحويل لا نهائية (Redirect Loop)</a></li>
    <li><a href="/temporary-redirect">تحويل مؤقت 302</a></li>
    <li><a href="/noindex-page">صفحة تحتوي noindex</a></li>
    <li><a href="/blocked-admin/secret">صفحة إدارية محظورة 403</a></li>
    <li><a href="/server-error-500">خطأ في الخادم 500</a></li>
    <li><a href="/timeout-slow">صفحة بطيئة الاستجابة</a></li>
    <li><a href="/cannibal-article-a">دليل شروط المنح الدراسية بالخارج</a></li>
    <li><a href="/cannibal-article-b">شروط المنح الدراسية الخارجية للطلاب</a></li>
    <li><a href="/soft-404-page">صفحة خطأ ناعم Soft 404</a></li>
    {links_day2}
  </ul>
</body>
</html>"""
            self.send_html(html)
            return

        # /programs/computer-science (Clean 200)
        if path == "/programs/computer-science":
            html = """<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <title>برنامج علوم الحاسب والذكاء الاصطناعي - شروط القبول 2027</title>
  <meta name="description" content="تعرف على مصاريف وشروط القبول وتنسيق كلية علوم الحاسب لعام 2027 مع خطوات التسجيل كاملة.">
  <link rel="canonical" href="http://127.0.0.1:8099/programs/computer-science">
</head>
<body>
  <h1>برنامج علوم الحاسب المتقدم</h1>
  <p>يقدم قسم علوم الحاسب دراسات متقدمة في هندسة البرمجيات والذكاء الاصطناعي والأمن السيبراني. تتطلب الكلية حداً أدنى 80% في الثانوية العامة.</p>
</body>
</html>"""
            self.send_html(html)
            return

        # /programs/medicine (Outdated year 2024, weak CTR triggers)
        if path == "/programs/medicine":
            html = """<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <title>كلية الطب البشري 2024</title>
  <meta name="description" content="معلومات عامة عن كلية الطب في العام الماضي.">
  <link rel="canonical" href="http://127.0.0.1:8099/programs/medicine">
</head>
<body>
  <h1>شروط القبول في كلية الطب 2024</h1>
  <p>أعلنت الكلية عن خطة القبول للعام الدراسي 2024 لجميع الطلاب المتقدمين.</p>
</body>
</html>"""
            self.send_html(html)
            return

        # /programs/business (Schema gap: FAQ content present in HTML but no JSON-LD)
        if path == "/programs/business":
            html = """<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <title>برنامج إدارة الأعمال والمحاسبة الدولية 2027</title>
  <meta name="description" content="تفاصيل مصاريف كلية إدارة الأعمال وشروط القبول والرسوم الدراسية لعام 2027.">
  <link rel="canonical" href="http://127.0.0.1:8099/programs/business">
</head>
<body>
  <h1>قسم إدارة الأعمال</h1>
  <p>يوفر البرنامج تعليماً متميزاً في التمويل والاستثمار والتسويق الرقمي.</p>
  
  <h2>الأسئلة الشائعة حول القبول:</h2>
  <div class="faq-item">
    <h3>ما هي شروط القبول في الكلية؟</h3>
    <p>يشترط الحصول على شهادة الثانوية العامة بمعدل لا يقل عن 70% واجتياز اختبار اللغة الإنجليزية.</p>
  </div>
  <div class="faq-item">
    <h3>كم تبلغ الرسوم الدراسية السنوية؟</h3>
    <p>تبلغ الرسوم الدراسية السنوية 45000 جنيه مصري تسدد على قسطين دراسيين.</p>
  </div>
</body>
</html>"""
            self.send_html(html)
            return

        # /blog/admission-guide (Thin content: low word count, missing meta description)
        if path == "/blog/admission-guide":
            html = """<!DOCTYPE html>
<html>
<head>
  <title>مقال توجيهي</title>
</head>
<body>
  <h1>دليل سريع</h1>
  <p>نص قصير جداً لا يتعدى بضع كلمات تجريبية.</p>
</body>
</html>"""
            self.send_html(html)
            return

        # Clean target for false-404: /false-404-leading-space (200 OK)
        if path == "/false-404-leading-space":
            html = """<!DOCTYPE html>
<html>
<head><title>الصفحة المستهدفة بدون فراغات</title></head>
<body><h1>تم الوصول للصفحة الصحيحة بنجاح!</h1></body>
</html>"""
            self.send_html(html)
            return

        # Malformed path with %20: returns 404!
        if "%20" in raw_path or " " in raw_path or "/ false-404" in raw_path:
            self.send_html("<h1>404 Not Found - Malformed URL with Whitespace</h1>", 404)
            return

        # /arabic-slug-دليل-القبول (200 OK)
        if decoded_path in ("/arabic-slug-دليل-القبول", "/arabic-slug-دليل-القبول/"):
            html = """<!DOCTYPE html>
<html lang="ar">
<head><title>دليل القبول الجامعي الموحد</title></head>
<body><h1>دليل القبول الجامعي الموحد لجميع الطلاب</h1></body>
</html>"""
            self.send_html(html)
            return

        # Truncated Arabic slug returns 404!
        if "arabic-slug" in decoded_path and decoded_path != "/arabic-slug-دليل-القبول":
            self.send_html("<h1>404 Not Found - Truncated Slug</h1>", 404)
            return

        # /true-dead-page-xyz: Day 1 = 404, Day 2 = Fixed (200 OK)
        if path == "/true-dead-page-xyz":
            if CURRENT_STATE == 1:
                self.send_html("<h1>404 Not Found - Dead Page</h1>", 404)
                return
            else:
                self.send_html("<h1>200 OK - Page Restored in Day 2!</h1>", 200)
                return

        # /sitemap-dead-page: in sitemap but returns 404
        if path == "/sitemap-dead-page":
            self.send_html("<h1>404 Not Found - Broken Sitemap Link</h1>", 404)
            return

        # Redirect Chains: /chain-step-1 -> 2 -> 3 -> /programs/computer-science
        if path == "/chain-step-1":
            self.send_redirect("/chain-step-2", 301)
            return
        if path == "/chain-step-2":
            self.send_redirect("/chain-step-3", 301)
            return
        if path == "/chain-step-3":
            self.send_redirect("/programs/computer-science", 301)
            return

        # Redirect Loops: /redirect-loop-1 <-> /redirect-loop-2
        if path == "/redirect-loop-1":
            self.send_redirect("/redirect-loop-2", 301)
            return
        if path == "/redirect-loop-2":
            self.send_redirect("/redirect-loop-1", 301)
            return

        # Legacy paths: /legacy/old-course-1, 2
        if path.startswith("/legacy/old-course-"):
            self.send_redirect("/programs/computer-science", 301)
            return

        # Temporary redirect 302
        if path == "/temporary-redirect":
            self.send_redirect("/programs/business", 302)
            return

        # Noindex page
        if path == "/noindex-page":
            html = """<!DOCTYPE html>
<html>
<head>
  <title>صفحة مسدودة عن الفهرسة</title>
  <meta name="robots" content="noindex, follow">
</head>
<body><h1>هذه الصفحة تحمل وسم noindex</h1></body>
</html>"""
            self.send_html(html)
            return

        # Canonical mismatch
        if path == "/canonical-mismatch":
            html = """<!DOCTYPE html>
<html>
<head>
  <title>صفحة بتوجيه كانونيكال غير متطابق</title>
  <link rel="canonical" href="http://127.0.0.1:8099/different-target-canonical">
</head>
<body><h1>Canonical Mismatch Example</h1></body>
</html>"""
            self.send_html(html)
            return

        # Soft 404 page (returns 200 but content is error message)
        if path == "/soft-404-page":
            html = """<!DOCTYPE html>
<html lang="ar">
<head><title>الصفحة غير موجودة - خطأ 404</title></head>
<body>
  <h1>عذرًا، الصفحة غير موجودة</h1>
  <p>الصفحة المطلوبة تم نقلها أو حذفها نهائياً من الموقع.</p>
</body>
</html>"""
            self.send_html(html, status_code=200)
            return

        # Blocked / 403 Forbidden
        if path.startswith("/blocked-admin"):
            self.send_html("<h1>403 Forbidden - Access Denied</h1>", 403)
            return

        # 500 Server Error
        if path == "/server-error-500":
            self.send_html("<h1>500 Internal Server Error</h1>", 500)
            return

        # Timeout / slow endpoint
        if path == "/timeout-slow":
            time.sleep(0.5)
            self.send_html("<h1>Slow Response Page</h1>", 200)
            return

        # Cannibalization candidates A & B
        if path == "/cannibal-article-a":
            html = """<!DOCTYPE html>
<html lang="ar">
<head>
  <title>دليل شروط المنح الدراسية بالخارج لعام 2027</title>
  <meta name="description" content="تعرف على كامل شروط ومواعيد التقديم لمنح البكالوريوس والدراسات العليا بالخارج.">
</head>
<body>
  <h1>شروط التقديم للمنح الدراسية بالخارج</h1>
  <p>تقدم العديد من الهيئات الدولية منحاً مجانية تغطي كافة تكاليف المعيشة والدراسة للطلاب المتفوقين في مجالات الهندسة والطب.</p>
  <p>متطلبات القبول تشمل إتقان اللغة وتقديم خطاب توصية وسيرة ذاتية مفصلة مع شهادة الثانوية العامة.</p>
</body>
</html>"""
            self.send_html(html)
            return

        if path == "/cannibal-article-b":
            html = """<!DOCTYPE html>
<html lang="ar">
<head>
  <title>شروط المنح الدراسية الخارجية للطلاب 2027</title>
  <meta name="description" content="كافة التفاصيل حول متطلبات القبول للمنح الدراسية الخارجية للطلاب بالجامعات الدولية.">
</head>
<body>
  <h1>شروط المنح الدراسية الخارجية للطلاب</h1>
  <p>تقدم الهيئات الدولية منحاً مجانية تغطي تكاليف المعيشة والدراسة بالخارج لطلاب الهندسة والطب المتفوقين.</p>
  <p>المتطلبات الأساسية تتضمن شهادات اللغة الإنجليزية وخطابات التوصية والسيرة الذاتية وشهادة التخرج.</p>
</body>
</html>"""
            self.send_html(html)
            return

        # Day 2 specific pages:
        if CURRENT_STATE == 2:
            if path == "/new-broken-link":
                self.send_html("<h1>404 Not Found - Brand New Regressed Page!</h1>", 404)
                return
            if path == "/reappeared-issue":
                self.send_html("<h1>404 Not Found - Reappeared Issue</h1>", 404)
                return

        # Fallback 404
        self.send_html("<h1>404 Not Found</h1>", 404)


def run_fixture_server(host: str = "127.0.0.1", port: int = 8099) -> HTTPServer:
    server = HTTPServer((host, port), FixtureHandler)
    return server


def start_fixture_in_thread(host: str = "127.0.0.1", port: int = 8099) -> threading.Thread:
    server = run_fixture_server(host, port)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return thread


if __name__ == "__main__":
    port = 8099
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    print(f"Starting SEO GPS Fixture Server on http://127.0.0.1:{port} (Day {CURRENT_STATE})")
    server = run_fixture_server(port=port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Fixture Server...")
        server.server_close()
