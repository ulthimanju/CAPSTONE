from abc import ABC, abstractmethod


class OAuthClientInterface(ABC):
    @abstractmethod
    async def get_authorization_url(self, redirect_uri: str) -> str: ...

    @abstractmethod
    async def fetch_user_info_and_tokens(self, request) -> tuple[dict, dict]: ...
