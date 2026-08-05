class SharedHTTPException(Exception):
    def __init__(self, message: str, status_code: int = 400, details: str | None = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class UnauthorizedException(SharedHTTPException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, status_code=401)


class ForbiddenException(SharedHTTPException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=403)


class NotFoundException(SharedHTTPException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=404)
