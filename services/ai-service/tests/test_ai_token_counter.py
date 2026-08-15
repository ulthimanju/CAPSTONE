from app.infrastructure.clients.providers.gemini_provider import TokenCounter


def test_token_counter_empty_and_short_strings():
    assert TokenCounter.estimate_tokens("") == 0
    assert TokenCounter.estimate_tokens("   ") == 0
    assert TokenCounter.estimate_tokens("hello") >= 1


def test_token_counter_scaling():
    short_text = "Data Structures and Algorithms"
    long_text = short_text * 50
    short_count = TokenCounter.estimate_tokens(short_text)
    long_count = TokenCounter.estimate_tokens(long_text)
    assert long_count > short_count
    assert long_count >= short_count * 40
