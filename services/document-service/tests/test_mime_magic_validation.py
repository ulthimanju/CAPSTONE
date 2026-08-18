import os
os.environ["JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-key!"

import uuid
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from shared.security.jwt import JWTManager, JWTSettings
from shared.config import PlatformSettings
from app.main import app
from app.domain.entities.document import Document
from app.constants.enums import FileType, StorageProvider, DocumentStatus

settings = PlatformSettings()
jwt_manager = JWTManager(JWTSettings(secret_key="test-jwt-secret-minimum-32-chars-key!"))

client = TestClient(app)

user_id = str(uuid.uuid4())
session_id = str(uuid.uuid4())
workspace_id = str(uuid.uuid4())
token = jwt_manager.create_access_token(user_id=user_id, email="test@example.com", role="user", session_id=session_id)
headers = {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_db_session():
    with patch("app.infrastructure.database.session.AsyncSessionLocal") as mock_session_cls:
        session = AsyncMock()
        repo = AsyncMock()
        repo.get_by_checksum.return_value = None

        doc = Document(
            id=uuid.uuid4(),
            workspace_id=uuid.UUID(workspace_id),
            uploaded_by=uuid.UUID(user_id),
            original_filename="test_file.pdf",
            mime_type="application/pdf",
            file_extension=FileType.PDF,
            file_size_bytes=1024,
            storage_provider=StorageProvider.GOOGLE_DRIVE,
            storage_file_id="gdrive_123",
            storage_parent_id=None,
            storage_metadata_json={},
            checksum="test_checksum",
            status=DocumentStatus.UPLOADED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        repo.create.return_value = doc
        session.__aenter__.return_value = session
        mock_session_cls.return_value = session

        # Mock workspace verification and Google OAuth token so tests run without external dependencies
        async def _mock_verify_workspace_access(*args, **kwargs):
            return {"id": workspace_id, "user_role": "EDITOR"}

        mock_token_resp = MagicMock()
        mock_token_resp.status_code = 200
        mock_token_resp.json.return_value = {"access_token": "mock-google-token"}

        mock_drive_resp = MagicMock()
        mock_drive_resp.status_code = 200
        mock_drive_resp.json.return_value = {
            "id": "mock-drive-id-123",
            "name": "document.pdf",
            "webViewLink": "https://drive.google.com/file/d/mock-drive-id-123/view",
        }

        with patch("app.api.routers.documents.verify_workspace_access", side_effect=_mock_verify_workspace_access):
            with patch("app.api.routers.documents.get_document_repository", return_value=repo):
                with patch("httpx.AsyncClient.get", return_value=mock_token_resp):
                    with patch("httpx.AsyncClient.post", return_value=mock_drive_resp):
                        with patch("app.api.routers.documents.UploadDocumentUseCase") as mock_uc:
                            instance = AsyncMock()
                            instance.execute.return_value = doc
                            mock_uc.return_value = instance
                            yield



def test_valid_pdf_magic_bytes_accepted():
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n"
    files = {"file": ("document.pdf", pdf_content, "application/pdf")}
    data = {"workspace_id": workspace_id}

    response = client.post("/api/v1/documents/raw", headers=headers, data=data, files=files)
    assert response.status_code == 201


def test_valid_docx_magic_bytes_accepted():
    docx_content = b"PK\x03\x04\x14\x00\x00\x00\x08\x00word/document.xml"
    files = {"file": ("notes.docx", docx_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    data = {"workspace_id": workspace_id}

    response = client.post("/api/v1/documents/raw", headers=headers, data=data, files=files)
    assert response.status_code == 201


def test_markdown_extension_rejected():
    """Markdown (.md) is not in the allowed extension list — router returns 400."""
    text_content = b"# System Architecture Overview\nThis is a test markdown document."
    files = {"file": ("summary.md", text_content, "text/markdown")}
    data = {"workspace_id": workspace_id}

    response = client.post("/api/v1/documents/raw", headers=headers, data=data, files=files)
    assert response.status_code == 400
    res_data = response.json()
    assert "Unsupported file extension" in res_data["error"]["message"]


def test_spoofed_executable_renamed_pdf_rejected_with_415():
    exe_content = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00"
    files = {"file": ("evil.pdf", exe_content, "application/pdf")}
    data = {"workspace_id": workspace_id}

    response = client.post("/api/v1/documents/raw", headers=headers, data=data, files=files)
    assert response.status_code == 415
    res_data = response.json()
    assert res_data["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert "Unsupported file type" in res_data["error"]["message"] or "Executable" in res_data["error"]["message"]


def test_unsupported_binary_format_rejected():
    """Unknown binary extension (.bin) is caught at extension check — returns 400."""
    binary_content = b"\x01\x02\x03\x04\x00\x05\x06\x07\x00\x08\x09\x0a"
    files = {"file": ("data.bin", binary_content, "application/octet-stream")}
    data = {"workspace_id": workspace_id}

    response = client.post("/api/v1/documents/raw", headers=headers, data=data, files=files)
    assert response.status_code == 400
    res_data = response.json()
    assert "Unsupported file extension" in res_data["error"]["message"]
