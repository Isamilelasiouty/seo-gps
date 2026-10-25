"""
Read-only Model Context Protocol (MCP) server for SEO GPS.
Author: Ismail El Asiouty
"""
import json
import os
import sys
from typing import Dict, Any, List


def handle_list_projects() -> List[Dict[str, Any]]:
    return [
        {
            "id": "demo-proj-1",
            "name": "Production Store",
            "domain": "example.com",
            "health_score": 94,
            "status": "active",
        }
    ]


def handle_list_issues(project_id: str) -> List[Dict[str, Any]]:
    return [
        {
            "url": "https://example.com/blog/seo-guide",
            "severity": "warning",
            "title": "Title tag modified",
            "details": "Changed from 'Top SEO Tips' to 'Comprehensive SEO Guide 2026'",
        }
    ]


def main():
    """Simple JSON-RPC / CLI handler for MCP queries."""
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "list_projects":
            print(json.dumps(handle_list_projects(), indent=2))
            return
        elif cmd == "list_issues":
            pid = sys.argv[2] if len(sys.argv) > 2 else "demo"
            print(json.dumps(handle_list_issues(pid), indent=2))
            return

    # Standard status
    print(json.dumps({"name": "seo-gps-mcp", "status": "ready", "version": "1.0.0"}))


if __name__ == "__main__":
    main()
