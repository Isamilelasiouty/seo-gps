"""
Comprehensive Site Report Builder and Snapshot Compiler for SEO GPS.
Author: Ismail El Asiouty
"""
from typing import Dict, Any, List, Optional
from collections import defaultdict
from urllib.parse import urlparse
import rapidfuzz.fuzz as fuzz

from engine.url_sanitizer import (
    generate_redirect_rules,
    recover_slug,
    match_dead_page_redirect,
)
from engine.content_analyzers import (
    build_deterministic_action_plan,
)
from engine.analytics.cluster import find_cannibalization_clusters


class SiteReportCompiler:
    """
    Compiles the unified Site Report snapshot from crawl data and reconciled issues.
    """

    @staticmethod
    def compile_report(
        scan_id: str,
        project_id: str,
        domain: str,
        root_url: str,
        crawled_pages: List[Dict[str, Any]],
        skipped_urls: List[Dict[str, Any]],
        redirect_inventory: List[Dict[str, Any]],
        redirect_rules: List[Dict[str, Any]],
        issues: List[Dict[str, Any]],
        target_year: int = 2027,
    ) -> Dict[str, Any]:
        total_discovered = len(crawled_pages) + len(skipped_urls)
        total_crawled = len(crawled_pages)
        total_skipped = len(skipped_urls)

        # 1. Classification distribution
        status_distribution = {
            "200_ok": 0,
            "redirect_3xx": 0,
            "not_found_404": 0,
            "gone_410": 0,
            "server_error_5xx": 0,
            "timeout": 0,
            "blocked_unverified": 0,
            "soft_404": 0,
            "skipped": total_skipped,
        }

        classification_counts = defaultdict(int)
        for page in crawled_pages:
            c = page.get("classification", "200_ok")
            classification_counts[c] += 1
            if c == "200_ok":
                status_distribution["200_ok"] += 1
            elif c.startswith("redirect_"):
                status_distribution["redirect_3xx"] += 1
            elif c == "not_found_404":
                status_distribution["not_found_404"] += 1
            elif c == "gone_410":
                status_distribution["gone_410"] += 1
            elif c == "server_error_5xx":
                status_distribution["server_error_5xx"] += 1
            elif c == "timeout":
                status_distribution["timeout"] += 1
            elif c == "blocked_unverified":
                status_distribution["blocked_unverified"] += 1
            elif c == "soft_404":
                status_distribution["soft_404"] += 1

        # 2. Section A: Status & 404 Analysis
        false_404s = [p for p in crawled_pages if p.get("is_false_404")]
        all_404s = [p for p in crawled_pages if p.get("classification") in ("not_found_404", "gone_410")]
        true_dead = [p for p in all_404s if not p.get("is_false_404")]
        soft_404s = [p for p in crawled_pages if p.get("classification") == "soft_404"]

        false_vs_true_ratio = {
            "false_404_count": len(false_404s),
            "true_dead_count": len(true_dead),
            "soft_404_count": len(soft_404s),
            "ratio_percentage": round((len(false_404s) / max(1, len(all_404s))) * 100, 1),
        }

        status_section = {
            "all_pages_count": total_crawled,
            "distribution": status_distribution,
            "false_vs_true_ratio": false_vs_true_ratio,
            "false_404s": [
                {
                    "url": p["url"],
                    "corrected_url": p.get("final_url") or p["url"],
                    "defects": p.get("defects", []),
                    "source": p.get("source"),
                    "found_on": p.get("found_on"),
                    "fix_suggestion": "Correct malformed URL in source link or sitemap entry.",
                }
                for p in false_404s
            ],
            "true_dead_pages": [
                {
                    "url": p["url"],
                    "status_code": p.get("status_code", 404),
                    "inbound_links_count": len(p.get("inbound_links", [])),
                    "inbound_links": p.get("inbound_links", []),
                    "in_sitemap": p.get("in_sitemap", False),
                    "slug_recovery": p.get("slug_recovery"),
                    "suggested_redirect": p.get("dead_page_match"),
                }
                for p in true_dead
            ],
            "soft_404s": [
                {
                    "url": p["url"],
                    "reason": p.get("soft_404_reason", "Error phrase detected in 200 OK response"),
                    "confidence": "medium",
                }
                for p in soft_404s
            ],
        }

        # 3. Section B: Redirects & Legacy CMS Paths
        redirect_chains = []
        crawl_budget_waste = []
        legacy_path_groups = defaultdict(list)

        for red in redirect_inventory:
            src = red["source_url"]
            dst = red["final_url"]
            chain = red.get("chain", [])

            # Detect chain or loop
            if len(chain) > 1:
                is_loop = any(hop["to"] == src for hop in chain)
                collapsed_rule = generate_redirect_rules(src, dst, 301)
                redirect_chains.append({
                    "source_url": src,
                    "final_url": dst,
                    "hops_count": len(chain),
                    "chain": chain,
                    "is_loop": is_loop,
                    "collapsed_rule": collapsed_rule,
                })

            # Check crawl budget waste (inbound links or sitemap pointing to redirect)
            if red.get("source") in ("sitemap", "internal_link") or red.get("found_on"):
                crawl_budget_waste.append({
                    "source_location": red.get("found_on") or red.get("source"),
                    "redirecting_url": src,
                    "final_url": dst,
                    "code": red.get("status_code", 301),
                })

            # Legacy path grouping (extract first 2 path segments)
            parsed_src = urlparse(src)
            parts = [p for p in parsed_src.path.split("/") if p]
            if len(parts) >= 1:
                pattern = f"/{parts[0]}/*"
                legacy_path_groups[pattern].append(src)

        legacy_patterns_list = [
            {
                "pattern": pat,
                "count": len(urls),
                "sample_urls": urls[:3],
                "fix_suggestion": f"Consolidate {len(urls)} legacy {pat} URLs into a single wildcard rewrite rule.",
            }
            for pat, urls in sorted(legacy_path_groups.items(), key=lambda x: len(x[1]), reverse=True)
            if len(urls) >= 2
        ]

        redirects_section = {
            "total_redirects": len(redirect_inventory),
            "chains_count": len(redirect_chains),
            "chains": redirect_chains,
            "crawl_budget_waste_count": len(crawl_budget_waste),
            "crawl_budget_waste": crawl_budget_waste,
            "legacy_patterns": legacy_patterns_list,
            "generated_rules": redirect_rules[:20],
        }

        # 4. Section C: Live 200 Pages (Freshness & Quality)
        healthy_pages = [p for p in crawled_pages if p.get("status_code") == 200]
        year_outdated_pages = []
        thin_content_pages = []
        orphan_pages = []
        missing_sitemap_pages = []
        title_meta_issues = []

        for p in healthy_pages:
            u = p["url"]
            # Year findings
            if p.get("year_findings"):
                year_outdated_pages.append({
                    "url": u,
                    "findings": p["year_findings"],
                })

            # Thin content
            if p.get("word_count", 0) < 250 and not p.get("requires_rendering"):
                thin_content_pages.append({
                    "url": u,
                    "word_count": p.get("word_count", 0),
                    "title": p.get("title", ""),
                })

            # Orphans
            if p.get("is_orphan"):
                orphan_pages.append({
                    "url": u,
                    "title": p.get("title", ""),
                })

            # Missing from sitemap
            if p.get("is_missing_from_sitemap"):
                missing_sitemap_pages.append({
                    "url": u,
                    "title": p.get("title", ""),
                })

            # Title & Meta issues
            tmq = p.get("title_meta_quality", {})
            if tmq.get("issues"):
                title_meta_issues.append({
                    "url": u,
                    "title": p.get("title", ""),
                    "issues": tmq["issues"],
                    "has_ctr_triggers": tmq.get("has_ctr_triggers", False),
                })

        onpage_section = {
            "total_live_pages": len(healthy_pages),
            "year_outdated_count": len(year_outdated_pages),
            "year_outdated_pages": year_outdated_pages,
            "thin_content_count": len(thin_content_pages),
            "thin_content_pages": thin_content_pages,
            "orphan_pages_count": len(orphan_pages),
            "orphan_pages": orphan_pages,
            "missing_sitemap_count": len(missing_sitemap_pages),
            "missing_sitemap_pages": missing_sitemap_pages,
            "title_meta_issues_count": len(title_meta_issues),
            "title_meta_issues": title_meta_issues[:25],
        }

        # 5. Section D: Crawl-Based Cannibalization
        cannibalization_clusters = find_cannibalization_clusters(healthy_pages, threshold=0.75)
        formatted_clusters = []

        for cluster in cannibalization_clusters:
            pages_in_cluster = cluster.get("pages", [])
            if len(pages_in_cluster) < 2:
                continue

            # Transparent scoring to propose Keep vs Merge/301
            scored_candidates = []
            for p in pages_in_cluster:
                score = 0
                score += min(40, (p.get("word_count", 0) / 30))  # Depth up to 40 pts
                score += min(30, len(p.get("inbound_links", [])) * 6)  # Inbounds up to 30 pts
                score += len(p.get("schema_types", [])) * 5  # Schemas up to 15 pts
                if not p.get("year_findings"):
                    score += 15  # Freshness 15 pts
                scored_candidates.append({
                    "url": p["url"],
                    "title": p.get("title", ""),
                    "score": round(score, 1),
                    "word_count": p.get("word_count", 0),
                    "inbound_count": len(p.get("inbound_links", [])),
                    "schema_count": len(p.get("schema_types", [])),
                })

            scored_candidates.sort(key=lambda x: x["score"], reverse=True)
            keep_page = scored_candidates[0]
            merge_candidates = scored_candidates[1:]

            formatted_clusters.append({
                "topic": cluster.get("topic", "Shared Topic Intent"),
                "similarity": round(cluster.get("similarity", 0.8) * 100, 1),
                "keep_page": keep_page,
                "merge_candidates": merge_candidates,
                "note": "Based on on-site signals; Search Console clicks improve this decision.",
            })

        cannibalization_section = {
            "clusters_count": len(formatted_clusters),
            "clusters": formatted_clusters,
        }

        # 6. Section E: Structured Data Gaps
        schema_gaps_list = []
        for p in healthy_pages:
            gaps = p.get("schema_gaps", [])
            if gaps:
                schema_gaps_list.append({
                    "url": p["url"],
                    "title": p.get("title", ""),
                    "existing_schemas": p.get("schema_types", []),
                    "gaps": gaps,
                    "generated_faq": p.get("generated_faq"),
                })

        schema_section = {
            "pages_with_gaps_count": len(schema_gaps_list),
            "gaps": schema_gaps_list,
        }

        # 7. Section F: Taxonomy Classification
        taxonomy_counts = defaultdict(int)
        for p in crawled_pages:
            taxonomy_counts[p.get("page_type", "other")] += 1

        taxonomy_section = {
            "guides_and_fees_count": taxonomy_counts["guides_and_fees"],
            "blog_guide_count": taxonomy_counts["blog_guide"],
            "landing_page_count": taxonomy_counts["landing_page"],
            "listing_count": taxonomy_counts["listing"],
            "other_count": taxonomy_counts["other"],
            "guidance": {
                "guides_and_fees": "Ensure admission & tuition fee tables are updated for target year with EducationalOrganization schema.",
                "blog_guide": "Ensure dates are fresh, interlink to university programs, and check for topic overlap.",
                "landing_page": "Optimize for Core Web Vitals, clear above-the-fold CTA, and trust signals.",
                "listing": "Implement clean canonical pagination and indexable category breadcrumbs.",
            }
        }

        # 8. Section G: Action Plans & Top 10 Fixes
        action_plans = []
        for p in crawled_pages:
            url_issues = [i for i in issues if i.get("url") == p["url"]]
            plan = build_deterministic_action_plan(
                url=p["url"],
                page_type=p.get("page_type", "other"),
                issues=url_issues,
                target_year=target_year,
            )
            action_plans.append(plan)

        action_plans.sort(key=lambda x: x["priority_score"], reverse=True)
        top_10_fixes = action_plans[:10]

        # Overall health score calculation
        crit_count = sum(1 for i in issues if i.get("severity") == "critical" and i.get("status") in ("new", "persisting", "reappeared", "open"))
        warn_count = sum(1 for i in issues if i.get("severity") == "warning" and i.get("status") in ("new", "persisting", "reappeared", "open"))
        notice_count = sum(1 for i in issues if i.get("severity") == "notice" and i.get("status") in ("new", "persisting", "reappeared", "open"))

        deduction = (crit_count * 15) + (warn_count * 5) + (notice_count * 1)
        health_score = max(5, min(100, 100 - deduction))

        summary = {
            "health_score": health_score,
            "total_discovered": total_discovered,
            "total_crawled": total_crawled,
            "total_skipped": total_skipped,
            "critical_count": crit_count,
            "warning_count": warn_count,
            "notice_count": notice_count,
            "healthy_count": max(0, total_crawled - crit_count - warn_count - notice_count),
            "status_distribution": status_distribution,
        }

        return {
            "scan_id": scan_id,
            "project_id": project_id,
            "domain": domain,
            "root_url": root_url,
            "summary": summary,
            "section_status": status_section,
            "section_redirects": redirects_section,
            "section_onpage": onpage_section,
            "section_cannibalization": cannibalization_section,
            "section_schema": schema_section,
            "section_taxonomy": taxonomy_section,
            "section_action_plans": action_plans,
            "top_fixes": top_10_fixes,
        }
