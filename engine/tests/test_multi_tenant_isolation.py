"""
Multi-Tenant Security & Data Isolation Tests for SEO GPS.
Proves that User A cannot read, edit, or delete User B's data,
including cross-tenant ID tampering in requests.
"""
import uuid
import pytest
from pathlib import Path
from engine.storage import LocalStorage


@pytest.fixture
def isolated_storage(tmp_path: Path):
    db_file = tmp_path / "test_multi_tenant.db"
    return LocalStorage(db_path=db_file)


def test_user_cannot_view_other_user_projects(isolated_storage: LocalStorage):
    user_a = f"usr_a_{uuid.uuid4().hex[:8]}"
    user_b = f"usr_b_{uuid.uuid4().hex[:8]}"

    proj_a_id = isolated_storage.save_project({
        "user_id": user_a,
        "name": "Site A",
        "domain": "site-a.com",
        "root_url": "https://site-a.com",
    })

    proj_b_id = isolated_storage.save_project({
        "user_id": user_b,
        "name": "Site B",
        "domain": "site-b.com",
        "root_url": "https://site-b.com",
    })

    # User A listing projects
    projs_for_a = isolated_storage.list_projects(user_id=user_a)
    assert len(projs_for_a) == 1
    assert projs_for_a[0]["id"] == proj_a_id
    assert projs_for_a[0]["domain"] == "site-a.com"

    # User B listing projects
    projs_for_b = isolated_storage.list_projects(user_id=user_b)
    assert len(projs_for_b) == 1
    assert projs_for_b[0]["id"] == proj_b_id
    assert projs_for_b[0]["domain"] == "site-b.com"


def test_id_tampering_get_project_rejected(isolated_storage: LocalStorage):
    user_a = f"usr_a_{uuid.uuid4().hex[:8]}"
    user_b = f"usr_b_{uuid.uuid4().hex[:8]}"

    proj_a_id = isolated_storage.save_project({
        "user_id": user_a,
        "name": "Site A Private",
        "domain": "private-a.com",
        "root_url": "https://private-a.com",
    })

    # User A accesses own project -> SUCCESS
    allowed = isolated_storage.get_project(proj_a_id, user_id=user_a)
    assert allowed is not None
    assert allowed["domain"] == "private-a.com"

    # User B attempts to access User A's project using Project A ID (ID Tampering) -> REJECTED
    tamper_attempt = isolated_storage.get_project(proj_a_id, user_id=user_b)
    assert tamper_attempt is None, "Cross-tenant access must return None to prevent data leakage"


def test_id_tampering_delete_project_rejected(isolated_storage: LocalStorage):
    user_a = f"usr_a_{uuid.uuid4().hex[:8]}"
    user_b = f"usr_b_{uuid.uuid4().hex[:8]}"

    proj_a_id = isolated_storage.save_project({
        "user_id": user_a,
        "name": "Site A Protected",
        "domain": "protected-a.com",
        "root_url": "https://protected-a.com",
    })

    # User B attempts to delete User A's project -> REJECTED (returns False)
    delete_result = isolated_storage.delete_project(proj_a_id, user_id=user_b)
    assert delete_result is False, "Unauthorized deletion attempt must fail"

    # Project A still exists intact
    project_still_exists = isolated_storage.get_project(proj_a_id, user_id=user_a)
    assert project_still_exists is not None
    assert project_still_exists["domain"] == "protected-a.com"

    # Legitimate owner User A deletes project -> SUCCESS (returns True)
    legit_delete = isolated_storage.delete_project(proj_a_id, user_id=user_a)
    assert legit_delete is True

    # Now project is permanently deleted
    deleted_check = isolated_storage.get_project(proj_a_id, user_id=user_a)
    assert deleted_check is None


def test_child_resources_isolated_from_cross_tenant_access(isolated_storage: LocalStorage):
    user_a = f"usr_a_{uuid.uuid4().hex[:8]}"
    user_b = f"usr_b_{uuid.uuid4().hex[:8]}"

    proj_a_id = isolated_storage.save_project({
        "user_id": user_a,
        "name": "Site A",
        "domain": "site-a.com",
        "root_url": "https://site-a.com",
    })

    # Create scan and issue for Project A
    scan_id = isolated_storage.create_scan(proj_a_id, scan_type="baseline")
    isolated_storage.save_issues(proj_a_id, [
        {
            "id": "iss-1",
            "check_id": "http_status_404",
            "url": "https://site-a.com/missing",
            "severity": "critical",
            "title": "Broken 404 URL",
            "category": "technical",
            "status": "new",
        }
    ])
    isolated_storage.save_report_snapshot({
        "scan_id": scan_id,
        "project_id": proj_a_id,
        "health_score": 75,
        "counters": {"pages": 1, "critical": 1},
        "summary": {"test": True},
        "section_status": {},
        "section_redirects": {},
        "section_onpage": {},
        "section_cannibalization": {},
        "section_schema": {},
        "section_taxonomy": {},
        "section_action_plans": [],
        "top_fixes": [],
        "execution_time_seconds": 1.2,
    })

    # Legitimate owner User A can read issues, scans, snapshots
    assert len(isolated_storage.get_issues(proj_a_id, user_id=user_a)) == 1
    assert len(isolated_storage.list_scans(proj_a_id, user_id=user_a)) == 1
    assert isolated_storage.get_report_snapshot(scan_id, user_id=user_a) is not None

    # Attacker User B attempting to read Project A's issues -> REJECTED
    assert isolated_storage.get_issues(proj_a_id, user_id=user_b) == []

    # Attacker User B attempting to list Project A's scans -> REJECTED
    assert isolated_storage.list_scans(proj_a_id, user_id=user_b) == []

    # Attacker User B attempting to retrieve Project A's report snapshot -> REJECTED
    assert isolated_storage.get_report_snapshot(scan_id, user_id=user_b) is None


def test_supabase_live_rls_isolation():
    """Verify live Supabase Row Level Security policy enforcement across real users."""
    import os
    import httpx
    from dotenv import load_dotenv

    load_dotenv()
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    anon_key = os.getenv("SUPABASE_ANON_KEY")

    if not url or not service_key or not anon_key:
        pytest.skip("Supabase environment variables not configured")

    with httpx.Client() as client:
        # 1. Anonymous query returns empty list (RLS blocks unauthenticated reads)
        anon_res = client.get(
            f"{url}/rest/v1/projects?select=*",
            headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"}
        )
        assert anon_res.status_code == 200
        assert anon_res.json() == []

        # 2. Authenticate as User Mohamed ElSaeed
        gen_res = client.post(
            f"{url}/auth/v1/admin/generate_link",
            headers={"apikey": service_key, "Authorization": f"Bearer {service_key}"},
            json={"type": "magiclink", "email": "info@mohamedelsaeed.com"}
        )
        otp = gen_res.json().get("email_otp")
        if not otp:
            pytest.skip("Could not generate OTP for test user")

        verify_res = client.post(
            f"{url}/auth/v1/verify",
            headers={"apikey": anon_key, "Content-Type": "application/json"},
            json={"type": "magiclink", "email": "info@mohamedelsaeed.com", "token": otp}
        )
        token = verify_res.json().get("access_token")
        assert token is not None

        user_headers = {"apikey": anon_key, "Authorization": f"Bearer {token}"}

        # 3. User can ONLY see his own project
        user_projs = client.get(
            f"{url}/rest/v1/projects?select=id,domain,user_id",
            headers=user_headers
        ).json()
        assert len(user_projs) == 1
        assert user_projs[0]["domain"] == "mohamedelsaeed.com"

        # 4. ID Tampering: User attempts to read Ismail's project by ID -> RLS blocks it (returns [])
        ismail_proj_id = "b9ef38fb-c5f1-4f0c-866f-f4f9fb55772a"
        tamper_read = client.get(
            f"{url}/rest/v1/projects?id=eq.{ismail_proj_id}",
            headers=user_headers
        ).json()
        assert tamper_read == [], "RLS must block cross-tenant reads even when project ID is known"

