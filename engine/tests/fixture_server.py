"""
Lightweight Regression Fixture Server for End-to-End Crawler Testing.
Simulates healthy baseline vs broken regressions (404, noindex, missing canonical, schema alterations).
Author: Ismail El Asiouty
"""
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
from typing import Dict


class MockSiteHandler(BaseHTTPRequestHandler):
    regression_active: bool = False

    def log_message(self, format, *args):
        # Silence standard HTTP access logs in test suite
        pass

    def do_GET(self):
        if self.path == "/sitemap.xml":
            self.send_response(200)
            self.send_header("Content-Type", "application/xml")
            self.end_headers()
            self.wfile.write(b"""<?xml version="1.0" encoding="UTF-8"?>
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
                <url><loc>http://127.0.0.1:8088/</loc></url>
                <url><loc>http://127.0.0.1:8088/about</loc></url>
                <url><loc>http://127.0.0.1:8088/pricing</loc></url>
            </urlset>""")
            return

        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>SEO GPS Home - Monitor Silent Regressions</title>
                <meta name="description" content="Commercial grade automated SEO regression monitoring platform by Ismail El Asiouty.">
                <link rel="canonical" href="http://127.0.0.1:8088/">
            </head>
            <body>
                <h1>Welcome to SEO GPS</h1>
                <a href="/about">About Us</a>
                <a href="/pricing">Pricing</a>
            </body>
            </html>
            """
            self.wfile.write(html.encode("utf-8"))
            return

        if self.path == "/pricing":
            if self.regression_active:
                # Regressed state: 404 Not Found
                self.send_response(404)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"<h1>404 Not Found</h1>")
            else:
                # Healthy baseline
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Pricing Plans - SEO GPS Platform</title>
                    <meta name="description" content="Check our zero cost hosting plans and features for automated daily monitoring.">
                    <link rel="canonical" href="http://127.0.0.1:8088/pricing">
                </head>
                <body>
                    <h1>Simple Pricing</h1>
                </body>
                </html>
                """)
            return

        if self.path == "/about":
            if self.regression_active:
                # Regressed state: Accidental noindex tag added!
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>About Us</title>
                    <meta name="robots" content="noindex, nofollow">
                    <link rel="canonical" href="http://127.0.0.1:8088/about">
                </head>
                <body>
                    <h1>About Ismail El Asiouty</h1>
                </body>
                </html>
                """)
            else:
                # Healthy baseline
                self.send_response(200)
                self.send_header("Content-Type", "text/html")
                self.end_headers()
                self.wfile.write(b"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>About Us - Built by Ismail El Asiouty</title>
                    <meta name="description" content="Discover the story and technology behind the SEO GPS health monitoring suite.">
                    <link rel="canonical" href="http://127.0.0.1:8088/about">
                </head>
                <body>
                    <h1>About Ismail El Asiouty</h1>
                </body>
                </html>
                """)
            return

        self.send_response(404)
        self.end_headers()


class FixtureServer:
    def __init__(self, port: int = 8088):
        self.port = port
        self.server = HTTPServer(("127.0.0.1", port), MockSiteHandler)
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.daemon = True

    def start(self):
        self.thread.start()

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

    def set_regression(self, active: bool):
        MockSiteHandler.regression_active = active
