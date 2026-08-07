from uuid import UUID
from shared.constants import SYSTEM_USER_ID
from shared import SYSTEM_USER_ID as IMPORTED_SYSTEM_USER_ID


def test_system_user_id_constant():
    assert isinstance(SYSTEM_USER_ID, UUID)
    assert str(SYSTEM_USER_ID) == "00000000-0000-0000-0000-000000000000"
    assert SYSTEM_USER_ID == IMPORTED_SYSTEM_USER_ID
