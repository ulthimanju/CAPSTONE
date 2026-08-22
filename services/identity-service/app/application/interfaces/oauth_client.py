from abc import ABC, abstractmethod
from app.application.dto.oauth import GoogleUserDTO, GoogleTokenDTO


class OAuthClientInterface(ABC):
    @abstractmethod
    async def login_redirect(self, request, redirect_uri: str, include_drive: bool = False): ...

    @abstractmethod
    async def fetch_user_info_and_tokens(self, request) -> tuple[GoogleUserDTO, GoogleTokenDTO]: ...
