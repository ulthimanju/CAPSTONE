import os

BASE_URL = os.getenv("CPA_BASE_URL", "http://localhost:8000")
API_V1_PREFIX = "/api/v1"

SERVICE_PORTS = {
    "api_gateway": 8000,
    "identity_service": 8001,
    "workspace_service": 8002,
    "document_service": 8003,
    "rag_service": 8004,
    "ai_service": 8005,
    "notification_service": 8006,
}

DOCS_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_documents"))
DEFAULT_PASSWORD = "CapstonePass123!@"

EXCEL_TRACKER_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "docs", "CPA_V2_Test_Execution_Tracker.xlsx")
)
