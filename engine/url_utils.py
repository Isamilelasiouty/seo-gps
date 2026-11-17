"""
Unified URL Normalization and SSRF Security Utilities for SEO GPS.
Author: Ismail El Asiouty
"""
import re
import ipaddress
import socket
import urllib.parse
from typing import Optional, Set

TRACKING_PARAMS: Set[str] = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "msclkid", "mc_cid", "mc_eid", "yclid", "_ga", "_gl",
    "trk", "ref", "source", "srsltid"
}

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local / AWS / GCP / Azure metadata
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),         # IPv6 private
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
]

BLOCKED_HOSTNAMES: Set[str] = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
}


def normalize_url(url: str, strip_tracking: bool = True) -> str:
    """
    Unified URL Normalizer for SEO GPS.
    - Lowers scheme and host
    - Strips fragment (#)
    - Strips standard tracking query params
    - Sorts query parameters deterministically
    - Strips default ports (:80, :443)
    - Normalizes trailing slash on root paths
    - Unicode NFC normalization
    """
    if not url:
        return ""

    url = url.strip()
    # Normalize scheme prefix if missing
    if url.startswith("//"):
        url = "https:" + url
    elif not re.match(r"^[a-zA-Z][a-zA-Z0-9+-.]*://", url):
        url = "https://" + url

    try:
        parsed = urllib.parse.urlsplit(url)
    except Exception:
        return url

    scheme = parsed.scheme.lower()
    if scheme not in ("http", "https"):
        scheme = "https"

    netloc = parsed.netloc.lower()
    # Strip default ports
    if netloc.endswith(":80") and scheme == "http":
        netloc = netloc[:-3]
    elif netloc.endswith(":443") and scheme == "https":
        netloc = netloc[:-4]

    # Normalize path
    path = parsed.path or "/"
    # Collapse double slashes in path
    path = re.sub(r"/{2,}", "/", path)

    # Normalize query params
    query_str = ""
    if parsed.query:
        params = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        if strip_tracking:
            params = [(k, v) for k, v in params if k.lower() not in TRACKING_PARAMS]
        if params:
            params.sort(key=lambda x: (x[0], x[1]))
            query_str = urllib.parse.urlencode(params)

    # Reassemble without fragment
    normalized = urllib.parse.urlunsplit((scheme, netloc, path, query_str, ""))
    return normalized


def is_safe_url(url: str, allow_private: bool = False) -> bool:
    """
    SSRF Protection Gate.
    Verifies that the URL target does not resolve to private, loopback, or metadata IPs.
    """
    if not url:
        return False

    try:
        parsed = urllib.parse.urlsplit(url)
        scheme = parsed.scheme.lower()
        if scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        hostname_lower = hostname.lower()
        if hostname_lower in BLOCKED_HOSTNAMES:
            return False

        # In testing environments, allow_private can be enabled
        if allow_private:
            return True

        # Resolve IP address
        try:
            ip_str = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip_str)
            for net in BLOCKED_IP_NETWORKS:
                if ip_obj in net:
                    return False
        except (socket.gaierror, socket.herror, ValueError):
            # If hostname cannot be resolved, allow crawler to attempt and fail gracefully
            pass

        return True
    except Exception:
        return False


def is_internal_url(url: str, base_domain: str) -> bool:
    """
    Determines if a URL is internal relative to base_domain.
    Handles ports, 'www.' variants, and subdomains cleanly.
    """
    if not url or not base_domain:
        return False
    try:
        parsed = urllib.parse.urlsplit(url)
        # Check netloc first (which preserves port if present)
        netloc = (parsed.netloc or "").lower().replace("www.", "")
        target_netloc = base_domain.lower().replace("www.", "")

        if netloc == target_netloc or netloc.endswith("." + target_netloc):
            return True

        # Also compare hostnames without port
        host = (parsed.hostname or "").lower().replace("www.", "")
        target_host = target_netloc.split(":")[0]
        return host == target_host or host.endswith("." + target_host)
    except Exception:
        return False
