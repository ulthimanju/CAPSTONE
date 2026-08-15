import uuid
import respx
import httpx
from fastapi.testclient import TestClient
from shared.security import JWTManager, JWTSettings
from app.main import app, settings


def get_auth_headers(user_id: uuid.UUID | None = None) -> dict:
    uid = user_id or uuid.uuid4()
    jwt_mgr = JWTManager(JWTSettings(
        secret_key=settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
        issuer=settings.jwt_issuer,
        audience=settings.jwt_audience,
    ))
    token = jwt_mgr.create_access_token(
        user_id=uid,
        email="test@example.com",
        role="student",
        session_id=uuid.uuid4(),
    )
    return {"Authorization": f"Bearer {token}"}


@respx.mock
def test_get_dashboard_aggregation(respx_mock):
    user_id = uuid.uuid4()
    headers = get_auth_headers(user_id)

    respx_mock.get(f"{settings.service_workspace_url}/api/v1/workspaces").respond(
        200, json=[{"id": str(uuid.uuid4()), "name": "Algorithms"}]
    )
    respx_mock.get(f"{settings.service_notification_url}/api/v1/notifications").respond(
        200, json={"notifications": [{"id": "1", "message": "Done"}], "unread_count": 1}
    )

    client = TestClient(app)
    res = client.get("/api/v1/dashboard", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["user_id"] == str(user_id)
    assert len(data["workspaces"]) == 1
    assert data["unread_notifications"] == 1


@respx.mock
def test_get_workspace_overview_aggregation(respx_mock):
    user_id = uuid.uuid4()
    ws_id = uuid.uuid4()
    headers = get_auth_headers(user_id)

    respx_mock.get(f"{settings.service_workspace_url}/api/v1/workspaces/{ws_id}").respond(
        200, json={"id": str(ws_id), "name": "Data Structures", "description": "Trees and Graphs"}
    )
    respx_mock.get(f"{settings.service_document_url}/api/v1/documents?workspace_id={ws_id}").respond(
        200, json={"documents": [{"id": str(uuid.uuid4()), "filename": "lecture1.pdf"}]}
    )

    client = TestClient(app)
    res = client.get(f"/api/v1/workspaces/{ws_id}/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["workspace"]["name"] == "Data Structures"
    assert data["total_documents"] == 1


@respx.mock
def test_get_document_overview_aggregation(respx_mock):
    doc_id = uuid.uuid4()

    respx_mock.get(f"{settings.service_document_url}/api/v1/documents/{doc_id}").respond(
        200, json={"id": str(doc_id), "filename": "chapter1.pdf"}
    )
    respx_mock.get(f"{settings.service_document_url}/api/v1/documents/{doc_id}/markdown").respond(
        200, json={"markdown": "# Chapter 1\nIntroduction to Machine Learning"}
    )
    respx_mock.get(f"{settings.service_document_url}/api/v1/documents/{doc_id}/chunks").respond(
        200, json={"chunks": [{"id": str(uuid.uuid4()), "title": "Chunk 1"}]}
    )

    client = TestClient(app)
    res = client.get(f"/api/v1/documents/{doc_id}/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["document"]["filename"] == "chapter1.pdf"
    assert data["total_chunks"] == 1
    assert "Chapter 1" in data["markdown_snippet"]
