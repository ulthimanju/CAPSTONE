from app.api.routers.gateway import (
    divide_into_regions,
    calculate_block_importance,
    split_content_blocks,
    select_representative_passages,
    build_chunk_knowledge_map,
)


def test_divide_into_regions():
    chunks = [{"id": i} for i in range(25)]
    regions = divide_into_regions(chunks, region_count=5)
    assert len(regions) == 5
    assert sum(len(r) for r in regions) == 25


def test_calculate_block_importance():
    definition_block = "Definition: A binary search tree is a node-based binary tree data structure."
    plain_block = "The weather was cloudy on that afternoon."
    mermaid_block = "```mermaid\ngraph TD;\nA-->B;\n```"

    def_score = calculate_block_importance(definition_block)
    plain_score = calculate_block_importance(plain_block)
    mermaid_score = calculate_block_importance(mermaid_block)

    assert def_score > plain_score
    assert mermaid_score > plain_score


def test_split_content_blocks():
    content = "# Heading 1\nContent 1\n## Heading 2\nContent 2"
    blocks = split_content_blocks(content)
    assert len(blocks) == 2


def test_select_representative_passages():
    chunks = [
        {"chunk_index": i, "title": f"Doc {i}", "content": f"# Chapter {i}\nDefinition of concept {i}."}
        for i in range(10)
    ]
    selected = select_representative_passages(chunks, detailed_token_budget=5000)
    assert len(selected) > 0
    assert len(selected) <= len(chunks)


def test_build_chunk_knowledge_map():
    chunk = {
        "title": "Machine Learning",
        "content": "# Overview\n**Supervised Learning** and `Unsupervised Learning` are key topics.\n```mermaid\ngraph TD;\nA-->B\n```",
    }
    km = build_chunk_knowledge_map(chunk)
    assert "Title: Machine Learning" in km
    assert "Mermaid diagram" in km
