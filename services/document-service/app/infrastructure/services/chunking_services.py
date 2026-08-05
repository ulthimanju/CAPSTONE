import re
import hashlib
from typing import Any
from app.constants.enums import ChunkType


class MarkdownAnalyzer:
    @staticmethod
    def analyze(markdown: str) -> list[dict[str, Any]]:
        # Identifies headings, paragraphs, lists, tables, and code blocks
        elements = []
        lines = markdown.splitlines()
        i = 0
        current_heading = None
        current_heading_level = None

        while i < len(lines):
            line = lines[i]

            # 1. Heading
            heading_match = re.match(r"^(#{1,6})\s+(.*)$", line)
            if heading_match:
                level = len(heading_match.group(1))
                title = heading_match.group(2).strip()
                current_heading = title
                current_heading_level = level
                elements.append({
                    "type": ChunkType.HEADING,
                    "title": title,
                    "content": line,
                    "heading_level": level,
                    "parent_heading": current_heading,
                })
                i += 1
                continue

            # 2. Code Block
            if line.startswith("```"):
                code_lines = [line]
                i += 1
                while i < len(lines) and not lines[i].startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                if i < len(lines):
                    code_lines.append(lines[i])
                    i += 1
                elements.append({
                    "type": ChunkType.CODE,
                    "title": current_heading,
                    "content": "\n".join(code_lines),
                    "heading_level": current_heading_level,
                    "parent_heading": current_heading,
                })
                continue

            # 3. Table
            if line.strip().startswith("|") and line.strip().endswith("|"):
                table_lines = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    table_lines.append(lines[i])
                    i += 1
                elements.append({
                    "type": ChunkType.TABLE,
                    "title": current_heading,
                    "content": "\n".join(table_lines),
                    "heading_level": current_heading_level,
                    "parent_heading": current_heading,
                })
                continue

            # 4. List
            if re.match(r"^\s*[-*+]\s", line) or re.match(r"^\s*\d+\.\s", line):
                list_lines = []
                while i < len(lines) and (re.match(r"^\s*[-*+]\s", lines[i]) or re.match(r"^\s*\d+\.\s", lines[i])):
                    list_lines.append(lines[i])
                    i += 1
                elements.append({
                    "type": ChunkType.LIST,
                    "title": current_heading,
                    "content": "\n".join(list_lines),
                    "heading_level": current_heading_level,
                    "parent_heading": current_heading,
                })
                continue

            # 5. Regular Text / Paragraph
            if line.strip():
                elements.append({
                    "type": ChunkType.TEXT,
                    "title": current_heading,
                    "content": line,
                    "heading_level": current_heading_level,
                    "parent_heading": current_heading,
                })

            i += 1

        return elements


class ChunkGenerator:
    @staticmethod
    def generate_semantic_chunks(elements: list[dict[str, Any]], max_chars: int = 1500) -> list[dict[str, Any]]:
        chunks = []
        current_chunk_content = []
        current_chunk_chars = 0
        current_heading = None
        current_level = None

        for el in elements:
            el_len = len(el["content"])
            if el["type"] == ChunkType.HEADING:
                current_heading = el["title"]
                current_level = el["heading_level"]

            if current_chunk_chars + el_len > max_chars and current_chunk_content:
                chunk_text = "\n\n".join(current_chunk_content)
                chunks.append({
                    "type": ChunkType.TEXT,
                    "title": current_heading,
                    "content": chunk_text,
                    "heading_level": current_level,
                    "parent_heading": current_heading,
                })
                current_chunk_content = []
                current_chunk_chars = 0

            current_chunk_content.append(el["content"])
            current_chunk_chars += el_len

        if current_chunk_content:
            chunk_text = "\n\n".join(current_chunk_content)
            chunks.append({
                "type": ChunkType.TEXT,
                "title": current_heading,
                "content": chunk_text,
                "heading_level": current_level,
                "parent_heading": current_heading,
            })

        return chunks


class ChunkValidator:
    @staticmethod
    def validate(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
        valid_chunks = []
        seen_checksums = set()

        for chunk in chunks:
            content = chunk["content"].strip()
            # 1. Filter out empty or whitespace chunks
            if not content:
                continue
            # 2. Duplicate detection
            checksum = hashlib.sha256(content.encode("utf-8")).hexdigest()
            if checksum in seen_checksums:
                continue

            seen_checksums.add(checksum)
            chunk["checksum"] = checksum
            valid_chunks.append(chunk)

        return valid_chunks


class ChunkMetadataGenerator:
    @staticmethod
    def enrich_metadata(chunk_data: dict[str, Any], index: int) -> dict[str, Any]:
        content = chunk_data["content"]
        words = len(content.split())

        return {
            "chunk_index": index,
            "chunk_type": chunk_data.get("type", ChunkType.TEXT),
            "title": chunk_data.get("title"),
            "content": content,
            "token_count": int(words * 1.3),  # Token count estimation
            "character_count": len(content),
            "page_start": 1,
            "page_end": 1,
            "heading_level": chunk_data.get("heading_level"),
            "parent_heading": chunk_data.get("parent_heading"),
            "checksum": chunk_data.get("checksum", hashlib.sha256(content.encode("utf-8")).hexdigest()),
        }
