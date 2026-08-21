import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class BasePromptContextBuilder:
    """
    Standardized context builder and grounding utility for all AI generation prompts.
    Handles workspace metadata formatting, outline stitching, and token/character length guardrails.
    """

    @staticmethod
    def build_workspace_header(
        workspace_meta: Dict[str, Any],
        workspace_code_language: Optional[str] = None,
    ) -> List[str]:
        """Formats standard workspace domain and identity metadata."""
        lines = [
            f"Workspace Title: {workspace_meta.get('name', 'Untitled')}",
            f"Domain Type: {workspace_meta.get('domain_type', 'TECHNICAL')}",
        ]
        lang = workspace_code_language or workspace_meta.get("workspace_code_language")
        if lang:
            lines.append(f"Primary Code Language: {lang}")
        return lines

    @staticmethod
    def build_grounded_context(
        workspace_meta: Dict[str, Any],
        topics_covered: Optional[str] = None,
        max_chars: int = 50000,
        truncation_notice: str = "\n... [Context Truncated for Token Limit]",
    ) -> str:
        """Assembles workspace metadata with topics_covered outline under character budget."""
        parts = BasePromptContextBuilder.build_workspace_header(workspace_meta)
        parts.extend([
            "",
            "--- WORKSPACE TOPICS COVERED & KNOWLEDGE OUTLINE ---",
            topics_covered if topics_covered and topics_covered.strip() else "No processed topics covered outline available yet.",
        ])
        assembled = "\n".join(parts)
        if len(assembled) > max_chars:
            assembled = assembled[:max_chars] + truncation_notice
        return assembled