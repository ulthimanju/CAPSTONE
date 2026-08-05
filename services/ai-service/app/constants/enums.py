from enum import Enum


class AIProvider(str, Enum):
    GEMINI = "GEMINI"


class ModelType(str, Enum):
    EMBEDDING = "EMBEDDING"
    TEXT_GENERATION = "TEXT_GENERATION"


class RequestType(str, Enum):
    EMBEDDING = "EMBEDDING"
    GENERATION = "GENERATION"
    CHAT = "CHAT"
    SUMMARY = "SUMMARY"
    FLASHCARD = "FLASHCARD"
    QUIZ = "QUIZ"
    LEARNING_OBJECTIVE = "LEARNING_OBJECTIVE"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
