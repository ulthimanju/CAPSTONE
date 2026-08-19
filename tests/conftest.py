import uuid
import pytest
from typing import Dict, Any, Generator

from tests.core.client import ApiClient
from tests.core.reporter import reporter
from tests.config import DEFAULT_PASSWORD, BASE_URL

@pytest.fixture(scope="session")
def client() -> ApiClient:
    return ApiClient(BASE_URL)

@pytest.fixture(scope="session")
def auth_context(client: ApiClient) -> Dict[str, Any]:
    sfx = uuid.uuid4().hex[:6]
    accounts = {
        "Owner": f"owner.{sfx}@synapse.local",
        "Collab1": f"collab1.{sfx}@synapse.local",
        "Collab2": f"collab2.{sfx}@synapse.local",
        "Attacker": f"attacker.{sfx}@synapse.local",
    }
    data = {"suffix": sfx, "users": {}, "tokens": {}, "user_ids": {}}

    for role, email in accounts.items():
        s, resp, _ = client.json_request(
            "POST",
            "/api/v1/test-auth/register",
            body={"email": email, "password": DEFAULT_PASSWORD, "full_name": f"Test {role}"}
        )
        assert s in (200, 201), f"Failed to register {role} ({email}): {s} {resp}"
        data["users"][role] = email
        data["tokens"][role] = resp["access_token"]
        data["user_ids"][role] = resp["user"]["id"]

    return data

@pytest.fixture(scope="session")
def owner_token(auth_context: Dict[str, Any]) -> str:
    return auth_context["tokens"]["Owner"]

@pytest.fixture(scope="session")
def collab1_token(auth_context: Dict[str, Any]) -> str:
    return auth_context["tokens"]["Collab1"]

@pytest.fixture(scope="session")
def collab2_token(auth_context: Dict[str, Any]) -> str:
    return auth_context["tokens"]["Collab2"]

@pytest.fixture(scope="session")
def attacker_token(auth_context: Dict[str, Any]) -> str:
    return auth_context["tokens"]["Attacker"]

@pytest.fixture
def test_workspace(client: ApiClient, owner_token: str) -> Generator[Dict[str, Any], None, None]:
    name = f"PytestWS-{uuid.uuid4().hex[:6]}"
    s, d, _ = client.json_request(
        "POST",
        "/api/v1/workspaces",
        token=owner_token,
        body={"name": name, "visibility": "PRIVATE", "domain_type": "TECHNICAL"}
    )
    assert s in (200, 201), f"Failed to create test workspace: {s} {d}"
    ws_id = d["id"]

    yield {"id": ws_id, "name": name, "raw": d}

    # Teardown: delete workspace
    client.json_request("DELETE", f"/api/v1/workspaces/{ws_id}", token=owner_token)
