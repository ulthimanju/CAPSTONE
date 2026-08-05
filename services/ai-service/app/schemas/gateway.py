import uuid
from pydantic import BaseModel, Field
from app.constants.enums import RequestType, AIProvider


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(..., description="List of text strings to embed")
    model: str = Field(default="text-embedding-004", description="Gemini embedding model name")


class EmbeddingResponse(BaseModel):
    model: str
    dimension: int
    vectors: list[list[float]]
    total_tokens: int


class GenerationRequest(BaseModel):
    prompt: str = Field(..., description="Prompt instruction")
    system_instruction: str | None = Field(default=None, description="System prompt instructions")
    model: str = Field(default="gemini-flash-latest", description="Gemini generation model name")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    max_output_tokens: int = Field(default=2048)
    response_mime_type: str | None = Field(default=None, description="e.g. application/json or text/markdown")



class GenerationResponse(BaseModel):
    id: uuid.UUID
    text: str
    model: str
    provider: AIProvider = AIProvider.GEMINI
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    latency_ms: int


class FlashcardItem(BaseModel):
    front: str
    back: str
    concept_key: str | None = None


class FlashcardSetResponse(BaseModel):
    title: str
    description: str
    cards: list[FlashcardItem]


class QuizQuestionItem(BaseModel):
    question: str
    options: list[str]
    correct_answer_index: int
    explanation: str


class QuizResponse(BaseModel):
    title: str
    questions: list[QuizQuestionItem]


class SummaryResponse(BaseModel):
    summary: str
    key_takeaways: list[str]
    bullet_points: list[str]


class ChatMessage(BaseModel):
    role: str = Field(..., description="user or model/assistant")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    system_instruction: str | None = None
    model: str = "gemini-flash-latest"
    temperature: float = 0.7

