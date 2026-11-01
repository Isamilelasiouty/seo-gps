"""
Unified Local Dev Runner, Scheduler, and CLI for SEO GPS.
Author: Ismail El Asiouty

Usage:
  python -m engine.local_runner --start                   # Starts fixture site + local scheduler
  python -m engine.local_runner --scan <url>              # Run immediate audit on URL
  python -m engine.local_runner --simulate-day +1         # Time-travel fixture to Day 2 and re-scan
  python -m engine.local_runner --verify <scan_id>        # Run accuracy verification on a scan
  python -m engine.local_runner --serve-fixture           # Serve fixture site on http://127.0.0.1:8099
"""
import argparse
import asyncio
import os
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
import httpx

from engine.storage import LocalStorage
from engine.main import run_audit_for_project
from engine.verify import ReportVerifier
from engine.tests.fixture_site import run_fixture_server


def ensure_local_dirs():
    base = Path(__file__).resolve().parent.parent / ".local"
    (base / "outbox").mkdir(parents=True, exist_ok=True)
    return base


def seed_demo_project(storage: LocalStorage) -> dict:
    storage.init_db()
    existing = storage.list_projects()
    for p in existing:
        if "8099" in p.get("domain", ""):
            return p

    proj = {
        "id": "proj-fixture-local",
        "user_id": "local_demo_user",
        "name": "Fixture University",
        "domain": "127.0.0.1:8099",
        "root_url": "http://127.0.0.1:8099/",
        "sitemap_url": "http://127.0.0.1:8099/sitemap.xml",
        "recipients": ["local-demo@seogps.internal"],
        "daily_crawl_hour": 6,
        "timezone": "UTC",
        "email_policy": "every_run",
    }
    storage.save_project(proj)
    print(f"[LocalRunner] Seeded demo project: {proj['name']} ({proj['domain']})")
    return proj


async def run_scan_command(target: str, scan_type: str = "auto", extra_urls: list = None):
    storage = LocalStorage()
    ensure_local_dirs()

    # Find project by domain or create temporary target
    projects = storage.list_projects()
    matched = None
    for p in projects:
        if target in p.get("domain", "") or target in p.get("root_url", ""):
            matched = p
            break

    if not matched:
        # Create ad-hoc project
        domain = target.replace("http://", "").replace("https://", "").split("/")[0]
        root_url = target if target.startswith("http") else f"https://{target}"
        matched = {
            "id": f"proj-{int(time.time())}",
            "name": domain,
            "domain": domain,
            "root_url": root_url,
            "sitemap_url": f"{root_url.rstrip('/')}/sitemap.xml",
            "recipients": ["local-audit@seogps.internal"],
        }
        storage.save_project(matched)

    print(f"\n[LocalRunner] Triggering scan for: {matched['name']} (Type: {scan_type})")
    res = await run_audit_for_project(
        project=matched,
        scan_type=scan_type,
        imported_urls=extra_urls,
        storage=storage,
        local_mode=True,
    )

    print(f"\n=======================================================")
    print(f"[LocalRunner] Scan Summary Complete:")
    print(f"  Scan ID:        {res['scan_id']}")
    print(f"  Health Score:   {res['health_score']}/100")
    print(f"  Discovered:     {res['stats']['total_discovered']}")
    print(f"  Crawled:        {res['stats']['total_crawled']}")
    print(f"  Skipped:        {res['stats']['total_skipped']}")
    recon = res["reconciliation"]
    print(f"  Active Issues:  {len(recon['active_issues'])}")
    print(f"  - New:          {len(recon['new_issues'])}")
    print(f"  - Persisting:   {len(recon['persisting_issues'])}")
    print(f"  - Resolved:     {len(recon['resolved_issues'])}")
    print(f"  - Reappeared:   {len(recon['reappeared_issues'])}")
    print(f"  Verification:   {'PASSED' if res['verification']['passed'] else 'FAILED'}")
    print(f"=======================================================\n")
    return res


async def run_time_travel_day2():
    """Simulates Day 2 on local fixture website and runs daily audit."""
    print("\n[LocalRunner] *** INITIATING TIME-TRAVEL: Day 1 -> Day 2 ***")
    
    # 1. Switch fixture server state
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post("http://127.0.0.1:8099/__state?day=2", timeout=3.0)
            print(f"[LocalRunner] Fixture site switched to Day 2 state: {r.json()}")
    except Exception as e:
        print(f"[LocalRunner] Error: Fixture server on http://127.0.0.1:8099 is not responding ({e}).")
        print("Please start fixture server first with: python -m engine.local_runner --start")
        return

    # 2. Run Daily Scan against fixture project
    res = await run_scan_command("127.0.0.1:8099", scan_type="daily")
    recon = res["reconciliation"]
    
    print("\n[LocalRunner] Day 2 Reconciliation Telemetry:")
    print(f"  New Regressions Detected:     {len(recon['new_issues'])}")
    for iss in recon['new_issues']:
        print(f"    + [{iss.get('severity', '').upper()}] {iss.get('title')} ({iss.get('url')})")

    print(f"\n  Still Open (Persisting):      {len(recon['persisting_issues'])}")
    base_count = sum(1 for i in recon['persisting_issues'] if i.get('is_baseline'))
    print(f"    (of which {base_count} have been open since the first baseline scan)")

    print(f"\n  Confirmed Resolved:           {len(recon['resolved_issues'])}")
    for iss in recon['resolved_issues']:
        print(f"    - [RESOLVED] {iss.get('title')} ({iss.get('url')})")

    print("\n[LocalRunner] Daily alert email successfully written to .local/outbox/")


def run_verify_command(scan_id_or_domain: str, sample_size: int = 5):
    storage = LocalStorage()
    verifier = ReportVerifier()

    # Find scan
    scan = storage.get_scan(scan_id_or_domain)
    if not scan:
        projects = storage.list_projects()
        for p in projects:
            if scan_id_or_domain in p.get("domain", ""):
                scan = storage.get_latest_scan(p["id"])
                break

    if not scan:
        print(f"[LocalRunner] Error: No scan found matching '{scan_id_or_domain}'")
        return

    scan_id = scan["id"]
    snapshot = storage.get_report_snapshot(scan_id)
    if not snapshot:
        print(f"[LocalRunner] Error: No report snapshot stored for scan '{scan_id}'")
        return

    print(f"\n[LocalRunner] Verifying Scan Report: {scan_id}")
    res = verifier.verify_report(snapshot)
    print(f"  Structural Invariants: {'PASSED' if res['passed'] else 'FAILED'}")
    if not res["passed"]:
        for err in res["errors"]:
            print(f"    ! {err}")

    # Live Sample Check
    scan_urls = storage.get_scan_urls(scan_id)
    print(f"\n[LocalRunner] Running Live Sample Ground-Truth Check (Sample Size: {sample_size})...")
    live_res = asyncio.run(verifier.verify_live_sample(scan_urls, sample_size=sample_size))
    print(f"  Live Sample Check:     {'PASSED' if live_res['passed'] else 'FAILED'}")
    print(f"  Sampled URLs:          {live_res['sampled_count']}")
    print(f"  Mismatches:            {live_res['mismatches']}")
    if not live_res["passed"]:
        for err in live_res["errors"]:
            print(f"    ! {err}")


def main():
    parser = argparse.ArgumentParser(description="SEO GPS Local Runner & CLI")
    parser.add_argument("--start", action="store_true", help="Start local fixture server + seed demo data")
    parser.add_argument("--scan", type=str, help="Run an immediate audit against a URL or domain")
    parser.add_argument("--baseline", action="store_true", help="Force scan to run as baseline")
    parser.add_argument("--daily", action="store_true", help="Force scan to run as daily re-scan")
    parser.add_argument("--simulate-day", type=str, help="Simulate day delta, e.g. +1")
    parser.add_argument("--verify", type=str, help="Verify report invariants & ground truth for scan ID or domain")
    parser.add_argument("--live-sample", type=int, default=5, help="Sample size for live verification check")
    parser.add_argument("--serve-fixture", action="store_true", help="Run the fixture site on http://127.0.0.1:8099")

    args = parser.parse_args()

    ensure_local_dirs()

    if args.serve_fixture:
        print("Starting SEO GPS Fixture Server on http://127.0.0.1:8099...")
        server = run_fixture_server(port=8099)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
        return

    if args.simulate_day == "+1":
        asyncio.run(run_time_travel_day2())
        return

    if args.verify:
        run_verify_command(args.verify, sample_size=args.live_sample)
        return

    if args.scan:
        scan_type = "baseline" if args.baseline else ("daily" if args.daily else "auto")
        asyncio.run(run_scan_command(args.scan, scan_type=scan_type))
        return

    if args.start:
        print("\n=======================================================")
        print("SEO GPS Local Development Environment by Ismail El Asiouty")
        print("=======================================================")
        
        # 1. Start Fixture Site on Port 8099 in Background
        server = run_fixture_server(port=8099)
        t = threading.Thread(target=server.serve_forever, daemon=True)
        t.start()
        print(" [1/3] Fixture Website running: http://127.0.0.1:8099")

        # 2. Seed Storage & Demo Project
        storage = LocalStorage()
        demo_proj = seed_demo_project(storage)
        print(" [2/3] Local Database initialized (.local/seo_gps.db)")

        # 3. Initial Baseline Scan
        print(" [3/3] Running initial baseline scan against fixture site...")
        asyncio.run(run_scan_command("127.0.0.1:8099", scan_type="baseline"))

        print("\nLocal Environment Ready!")
        print(" Frontend UI:        http://localhost:5173")
        print(" Fixture Website:    http://127.0.0.1:8099")
        print(" Local Email Outbox: .local/outbox/\n")
        print("Press Ctrl+C to stop.\n")

        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down local runner...")
            server.shutdown()
        return

    parser.print_help()


if __name__ == "__main__":
    main()
