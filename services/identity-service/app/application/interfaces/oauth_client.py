from abc import ABC, abstractmethod


class OAuthClientInterface(ABC):
    @abstractmethod
    async def login_redirect(self, request, redirect_uri: str): ...

    @abstractmethod
    async def fetch_user_info_and_tokens(self, request) -> tuple[dict, dict]: ...
