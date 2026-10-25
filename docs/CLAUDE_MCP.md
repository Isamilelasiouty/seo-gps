# Connecting Claude to SEO GPS via Model Context Protocol (MCP)

**SEO GPS** includes an optional, read-only MCP server located in `/mcp`. This allows Claude (Desktop or Web) to connect directly to your monitored websites and answer natural language inquiries such as:
> *"What broke on my website this week?"*
> *"Which pages experienced title tag modifications today?"*

---

## 1. Available Read-Only Tools

1. `list_projects`: Returns all monitored websites and their current health score.
2. `get_latest_audit`: Returns the summary of the most recent daily crawl for a project.
3. `list_active_issues`: Lists open Critical, Warning, and Notice regressions with before/after state diffs.
4. `get_page_snapshot`: Fetches the recorded technical snapshot (status, canonical, title, schema) for a specific URL.

---

## 2. Configuration for Claude Desktop

Add this block to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "seo-gps": {
      "command": "python",
      "args": ["-m", "mcp.server"],
      "cwd": "D:\\SEO GPS",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SEO_GPS_USER_TOKEN": "your-user-jwt-or-token"
      }
    }
  }
}
```

---

## 3. Security Guarantee

The MCP server is strictly **read-only**. It cannot trigger crawls, modify project settings, or delete audit histories.
