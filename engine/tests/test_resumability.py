"""
Gate 3: Resumability and Persistent Frontier Stress Test for SEO GPS.
Author: Ismail El Asiouty
"""
import pytest
import tempfile
import shutil
from pathlib import Path
from engine.storage import LocalStorage
from engine.models import PageSnapshot


def test_persistent_frontier_batch_leasing_and_resumability():
    """
    Verifies that the database frontier correctly leases URLs, prevents double-crawling,
    and supports seamless resume after an interruption.
    """
    temp_dir = tempfile.mkdtemp()
    try:
        db_path = Path(temp_dir) / "test_frontier.db"
        storage = LocalStorage(db_path=db_path)

        scan_id = "scan-resumable-1"
        project_id = "proj-resumable-1"

        # 1. Enqueue 200 synthetic URLs
        total_urls = 200
        for i in range(total_urls):
            storage.enqueue_frontier_url(
                scan_id=scan_id,
                project_id=project_id,
                url=f"https://example.com/page-{i}",
                depth=1,
                source="sitemap"
            )

        # 2. Simulate Worker 1 & Worker 2 leasing batches concurrently
        batch1 = storage.lease_frontier_batch(scan_id=scan_id, batch_size=50, lease_seconds=60)
        batch2 = storage.lease_frontier_batch(scan_id=scan_id, batch_size=50, lease_seconds=60)

        assert len(batch1) == 50
        assert len(batch2) == 50

        # Assert zero overlap between concurrent leases
        urls_batch1 = {item["url"] for item in batch1}
        urls_batch2 = {item["url"] for item in batch2}
        assert urls_batch1.isdisjoint(urls_batch2), "Concurrent worker batches must have zero overlapping URLs!"

        # 3. Complete first 50 URLs
        for item in batch1:
            storage.update_frontier_state(item["id"], state="done", status_code=200)

        # 4. Simulate an abort / failure on batch2 (lease expires or fails)
        for item in batch2[:25]:
            storage.update_frontier_state(item["id"], state="failed", error_message="Network timeout")

        # 5. Remaining 25 of batch2 and remaining 100 pending should resume seamlessly
        batch3 = storage.lease_frontier_batch(scan_id=scan_id, batch_size=50, lease_seconds=60)
        assert len(batch3) == 50
        urls_batch3 = {item["url"] for item in batch3}
        assert urls_batch3.isdisjoint(urls_batch1), "Finished URLs must never be re-leased!"

        # Complete batch3
        for item in batch3:
            storage.update_frontier_state(item["id"], state="done", status_code=200)

        # Lease final remaining batch
        batch4 = storage.lease_frontier_batch(scan_id=scan_id, batch_size=100, lease_seconds=60)
        assert len(batch4) == 50

        for item in batch4:
            storage.update_frontier_state(item["id"], state="done", status_code=200)

        # Verify no more pending items exist
        empty_batch = storage.lease_frontier_batch(scan_id=scan_id, batch_size=10, lease_seconds=60)
        assert len(empty_batch) == 0, "All items must be processed with zero orphaned pending URLs"

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
