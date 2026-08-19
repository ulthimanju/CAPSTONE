"""
Category 8 — UI / UX Tests (Frontend)
Documents manual/browser testing requirements for UI components, SSE updates, and markdown rendering.
"""
from tests.core.reporter import reporter

CAT = "Category 8 — UI / UX Tests (Frontend)"

def test_login_page_renders():
    reporter.record("TC-UI-181", CAT, "Login page renders at / with Google OAuth button", "P1", "Login UI visible", "Manual/Playwright browser verification required", "GAP", notes="Frontend browser UI test")

def test_google_oauth_button_action():
    reporter.record("TC-UI-182", CAT, "Google OAuth button click triggers redirect flow", "P1", "302 redirect to accounts.google.com", "Manual/Playwright browser verification required", "GAP", notes="Frontend browser UI test")

def test_jwt_auto_attachment_interceptor():
    reporter.record("TC-UI-183", CAT, "Axios / Fetch interceptor auto-attaches JWT Bearer header", "P1", "Authorization: Bearer <token>", "Manual/Playwright browser verification required", "GAP", notes="Frontend browser UI test")

def test_sse_realtime_document_status_update():
    reporter.record("TC-UI-184", CAT, "Document processing status updates in real-time via SSE without reload", "P1", "Status changes to READY_FOR_RAG in UI", "Manual/Playwright browser verification required", "GAP", notes="Frontend browser UI test")

def test_rag_answer_markdown_and_citations():
    reporter.record("TC-UI-185", CAT, "RAG chat answer renders GitHub Flavored Markdown and citation badges", "P1", "Formatted markdown + clickable citations", "Manual/Playwright browser verification required", "GAP", notes="Frontend browser UI test")
