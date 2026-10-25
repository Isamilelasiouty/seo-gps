# Security Policy & Safeguards

---

## 1. SSRF & Abuse Prevention

The crawler incorporates active protection against Server-Side Request Forgery (SSRF):
- **IP Address Validation**: Every crawled target URL hostname is resolved to its underlying IP address prior to initiating HTTP connections.
- **Blocked Ranges**: All private, loopback, link-local, and reserved IPv4 and IPv6 CIDR blocks are rejected (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1/128`, `fc00::/7`).
- **Scheme Restriction**: Only explicit `http://` and `https://` protocols are permitted.

---

## 2. Row Level Security (RLS) & Multi-Tenancy

Every database table in Supabase enforces Row Level Security:
- Users are isolated by their `auth.uid()`.
- Projects, snapshots, issues, and audit runs can only be accessed or modified by their respective verified owner.
- Automated tests ensure User A cannot query or alter User B's monitored websites.

---

## 3. Domain Ownership Verification

Before initiating recurring crawls, users verify domain ownership via:
1. Meta tag: `<meta name="seo-gps-verification" content="TOKEN">`
2. Static file: `/.well-known/seo-gps.txt`
3. DNS TXT record: `seo-gps-verification=TOKEN`

This safeguards third-party websites against unauthorized crawling or resource exhaustion.

---

## 4. Secret Isolation

- Secrets are strictly managed through GitHub Actions Secrets and environment variables.
- No API keys or credentials are ever committed to source code or logged in test output.
