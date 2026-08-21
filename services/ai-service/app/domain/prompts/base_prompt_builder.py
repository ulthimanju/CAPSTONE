import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class BasePromptContextBuilder:
    """
    Standardized context builder and grounding utility for all AI generation prompts.
    Handles workspace metadata formatting, outline stitching, source document injection,
    and token/character length guardrails.
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

    @staticmethod
    def build_summary_grounded_context(
        workspace_meta: Dict[str, Any],
        topics_covered: Optional[str] = None,
        source_chunks: Optional[List[Dict[str, Any]]] = None,
        max_chars: int = 150000,
        truncation_notice: str = "\n... [Source Content Truncated for Budget Limit]",
    ) -> str:
        """
        Assembles a comprehensive multi-tier context containing:
        1. Workspace Identity & Domain Header
        2. Global Topics Covered Outline
        3. Real Source Document Content & Lecture Notes
        """
        parts = BasePromptContextBuilder.build_workspace_header(workspace_meta)
        parts.extend([
            "",
            "--- GLOBAL WORKSPACE TOPICS & KNOWLEDGE OUTLINE ---",
            topics_covered if topics_covered and topics_covered.strip() else "No processed topics outline available.",
        ])

        if source_chunks:
            parts.extend([
                "",
                "--- FULL SOURCE DOCUMENT MATERIALS, LECTURE NOTES & INTERVIEW Q&AS ---",
            ])
            for idx, chunk in enumerate(source_chunks):
                doc_name = chunk.get("document_filename") or chunk.get("title") or f"Document {idx+1}"
                content = (chunk.get("content") or "").strip()
                if content:
                    parts.append(f"#### [Source File: {doc_name} | Section: {chunk.get('title', 'Content')} | Chunk #{chunk.get('chunk_index', idx+1)}]\n{content}\n")

        assembled = "\n".join(parts)
        if len(assembled) > max_chars:
            assembled = assembled[:max_chars] + truncation_notice
        return assembled