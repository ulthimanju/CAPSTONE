from enum import StrEnum


class Role(StrEnum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class OAuthProvider(StrEnum):
    GOOGLE = "google"
