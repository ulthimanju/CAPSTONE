from datetime import datetime, timezone


def test_timezone_aware_utc_timestamp_convention():
    now_utc = datetime.now(timezone.utc)
    assert now_utc.tzinfo is not None
    assert now_utc.tzinfo == timezone.utc
    assert now_utc.utcoffset().total_seconds() == 0
