from shared.enums import (
    DocumentStatus,
    WorkspaceStatus,
    NotificationStatus,
    ProcessingJobType,
)


def test_shared_domain_enums():
    assert DocumentStatus.READY_FOR_RAG.value == "READY_FOR_RAG"
    assert WorkspaceStatus.ACTIVE.value == "ACTIVE"
    assert NotificationStatus.UNREAD.value == "UNREAD"
    assert ProcessingJobType.PARSE_DOCUMENT.value == "PARSE_DOCUMENT"
