from fastapi import APIRouter, HTTPException, status
from app.infrastructure.clients.providers.gemini_provider import GeminiClient, TokenCounter
from app.schemas.gateway import (
    EmbeddingRequest,
    EmbeddingResponse,
    GenerationRequest,
    GenerationResponse,
    SummaryResponse,
    FlashcardSetResponse,
    QuizResponse,
    ChatRequest,
)
from app.utils.ids import generate_uuid

router = APIRouter(prefix="/api/v1/ai", tags=["AI Gateway"])
gemini_client = GeminiClient()


@router.get("/health")
async def health_check():
    has_key = bool(gemini_client.api_key)
    return {
        "status": "healthy" if has_key else "unconfigured",
        "provider": "GEMINI",
        "configured": has_key,
    }


@router.get("/models")
async def list_models():
    return {
        "models": [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "type": "TEXT_GENERATION",
                "input_token_limit": 1048576,
                "output_token_limit": 8192,
                "supports_streaming": True,
            },
            {
                "id": "text-embedding-004",
                "name": "Text Embedding 004",
                "type": "EMBEDDING",
                "input_token_limit": 2048,
                "output_token_limit": 768,
                "supports_embeddings": True,
            },
        ]
    }


@router.post("/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(req: EmbeddingRequest):
    try:
        vectors = await gemini_client.embed_texts(req.texts, model=req.model)
        dim = len(vectors[0]) if vectors else 0
        total_tokens = sum(TokenCounter.estimate_tokens(t) for t in req.texts)
        return EmbeddingResponse(
            model=req.model,
            dimension=dim,
            vectors=vectors,
            total_tokens=total_tokens,
        )
    except Exception as e:
        print(f"DEBUG Embedding Error: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation error: {e}")



@router.post("/generate", response_model=GenerationResponse)
async def generate_text(req: GenerationRequest):
    try:
        res = await gemini_client.generate_text(
            prompt=req.prompt,
            system_instruction=req.system_instruction,
            model=req.model,
            temperature=req.temperature,
            top_p=req.top_p,
            max_output_tokens=req.max_output_tokens,
            response_mime_type=req.response_mime_type,
        )
        return GenerationResponse(
            id=generate_uuid(),
            text=res["text"],
            model=res["model"],
            provider=res["provider"],
            prompt_tokens=res["prompt_tokens"],
            completion_tokens=res["completion_tokens"],
            total_tokens=res["total_tokens"],
            latency_ms=res["latency_ms"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text generation error: {e}")


from app.domain.prompts.summary_prompt_builder import SummaryPromptBuilder


@router.post("/summaries", response_model=SummaryResponse)
async def generate_summary(req: GenerationRequest):
    try:
        sys_instruction = SummaryPromptBuilder.build_system_instruction(req.system_instruction)
        user_prompt = SummaryPromptBuilder.build_user_prompt(req.prompt)
        res = await gemini_client.generate_text(
            prompt=user_prompt,
            system_instruction=sys_instruction,
            model=req.model,
            temperature=0.3,
            response_mime_type="application/json",
            response_schema=SummaryResponse,
        )
        return SummaryResponse.model_validate_json(res["text"])
    except Exception as e:
        # Fallback raw string parsing if json schema validation fails
        res_raw = await gemini_client.generate_text(
            prompt=SummaryPromptBuilder.build_user_prompt(req.prompt),
            system_instruction=SummaryPromptBuilder.build_system_instruction(req.system_instruction),
            model=req.model,
        )
        return SummaryResponse(
            summary=res_raw["text"],
            key_takeaways=["Key educational summary generated."],
            bullet_points=[res_raw["text"][:100]],
        )


@router.post("/flashcards", response_model=FlashcardSetResponse)
async def generate_flashcards(req: GenerationRequest):
    try:
        sys_instruction = "Generate a structured set of educational study flashcards (front question, back answer, key concept) from the text."
        res = await gemini_client.generate_text(
            prompt=req.prompt,
            system_instruction=sys_instruction,
            model=req.model,
            temperature=0.5,
            response_mime_type="application/json",
            response_schema=FlashcardSetResponse,
        )
        return FlashcardSetResponse.model_validate_json(res["text"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation error: {e}")


@router.post("/quizzes", response_model=QuizResponse)
async def generate_quiz(req: GenerationRequest):
    try:
        sys_instruction = "Generate a 5-question multiple choice quiz (question, 4 options, correct_answer_index, explanation) based on the text."
        res = await gemini_client.generate_text(
            prompt=req.prompt,
            system_instruction=sys_instruction,
            model=req.model,
            temperature=0.5,
            response_mime_type="application/json",
            response_schema=QuizResponse,
        )
        return QuizResponse.model_validate_json(res["text"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation error: {e}")


from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    messages_dicts = [m.model_dump() for m in req.messages]
    
    async def sse_event_generator():
        try:
            async for token in gemini_client.stream_chat(
                messages=messages_dicts,
                system_instruction=req.system_instruction,
                model=req.model,
                temperature=req.temperature,
            ):
                yield f"data: {token}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as err:
            yield f"data: Error: {err}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")
