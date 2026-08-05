from dataclasses import dataclass
from typing import Generic, TypeVar

T = TypeVar("T")


@dataclass
class CursorPage(Generic[T]):
    items: list[T]
    next_cursor: str | None
    prev_cursor: str | None
    has_next: bool
    has_prev: bool

    @classmethod
    def create(
        cls,
        items: list[T],
        next_cursor: str | None = None,
        prev_cursor: str | None = None,
        has_next: bool = False,
        has_prev: bool = False,
    ) -> "CursorPage[T]":
        return cls(
            items=items,
            next_cursor=next_cursor,
            prev_cursor=prev_cursor,
            has_next=has_next,
            has_prev=has_prev,
        )
