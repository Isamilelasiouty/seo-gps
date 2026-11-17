"""
Gate 1: Typed Contract Enforcement Test via AST Inspection.
Verifies that every check in engine/checks/ accesses exclusively valid fields defined on PageSnapshot.
Author: Ismail El Asiouty
"""
import ast
from pathlib import Path
from dataclasses import fields
import pytest
from engine.models import PageSnapshot

# Extract all formal fields defined on PageSnapshot
VALID_CONTRACT_FIELDS = {f.name for f in fields(PageSnapshot)}

# Add formal compatibility aliases and runtime enrichments
VALID_CONTRACT_FIELDS.update({
    "defects", "corrected_url", "inlinks", "body_text", "text_sample",
    "canonical", "h1", "robots", "crawl_depth", "is_soft_404", "soft_404_evidence",
    "schema_items", "slug_recovery", "dead_page_match", "raw_html", "path",
    "is_false_404", "in_sitemap", "classification", "pagerank", "is_orphan",
    "is_missing_from_sitemap", "skip_reason"
})

SNAPSHOT_VAR_NAMES = {
    "current_snapshot", "previous_snapshot", "snapshot", "prev_snapshot", "prev_snap"
}


def get_accessed_snapshot_keys(file_path: Path) -> set:
    """
    Parses Python AST and extracts keys accessed specifically on snapshot variables.
    Distinguishes snapshot access from context.get() or local dict calls.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read(), filename=str(file_path))

    accessed_keys = set()

    for node in ast.walk(tree):
        # Match snap["key"]
        if isinstance(node, ast.Subscript):
            if isinstance(node.value, ast.Name) and node.value.id in SNAPSHOT_VAR_NAMES:
                if isinstance(node.slice, ast.Constant) and isinstance(node.slice.value, str):
                    accessed_keys.add(node.slice.value)

        # Match snap.get("key")
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute) and node.func.attr == "get":
                if isinstance(node.func.value, ast.Name) and node.func.value.id in SNAPSHOT_VAR_NAMES:
                    if node.args and isinstance(node.args[0], ast.Constant) and isinstance(node.args[0].value, str):
                        accessed_keys.add(node.args[0].value)

    return accessed_keys


def test_typed_contract_ast_enforcement():
    """Asserts that all checks in engine/checks/ only access contract-defined keys."""
    checks_dir = Path(__file__).parent.parent / "checks"
    check_files = [f for f in checks_dir.glob("check_*.py")]

    assert len(check_files) >= 10, f"Expected checks, found {len(check_files)}"

    disallowed_keys_found = {}

    for cfile in check_files:
        accessed = get_accessed_snapshot_keys(cfile)
        unknown = accessed - VALID_CONTRACT_FIELDS
        if unknown:
            disallowed_keys_found[cfile.name] = unknown

    assert not disallowed_keys_found, f"Checks accessed unknown fields outside PageSnapshot contract: {disallowed_keys_found}"
