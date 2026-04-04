from backend.contextlib import asynccontextmanager

from backend.fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from backend.fastapi.middleware.cors import CORSMiddleware
from backend.fastapi.responses import StreamingResponse, Response, JSONResponse
from backend.pydantic import BaseModel

from backend.config import MAX_FILE_SIZE_MB
from backend.auth import get_current_user
from backend.database import (
    init_db,
    db_get_document,
    db_get_pdf_data,
    db_save_pdf_data,
    db_create_chat,
    db_list_chats,
    db_get_chat,
    db_update_chat,
    db_delete_chat,
    db_get_messages,
    db_add_message,
    db_clear_messages,
    db_export_chat,
    db_attach_document_to_chat,
)
from backend.pdf_processor import process_pdf, delete_document, list_documents
from backend.rag_engine import chat, chat_stream, summarize, generate_quiz


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="ChatPDF API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    document_id: str | None = None
    document_ids: list[str] | None = None
    chat_history: list[dict] | None = None

    def get_document_ids(self) -> list[str]:
        if self.document_ids:
            return self.document_ids
        if self.document_id:
            return [self.document_id]
        return []


class SummaryRequest(BaseModel):
    document_id: str | None = None
    document_ids: list[str] | None = None
    summary_type: str = "global"

    def get_document_ids(self) -> list[str]:
        if self.document_ids:
            return self.document_ids
        if self.document_id:
            return [self.document_id]
        return []


class SaveMessageRequest(BaseModel):
    role: str
    content: str
    sources: list[dict] | None = None


class CreateChatRequest(BaseModel):
    document_id: str
    title: str | None = None


class UpdateChatRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None


class AttachDocumentRequest(BaseModel):
    document_id: str


class AiDetectRequest(BaseModel):
    text: str


class QuizRequest(BaseModel):
    document_id: str | None = None
    document_ids: list[str] | None = None
    difficulty: str = "medium"  # easy | medium | hard
    language: str = "fr"

    def get_document_ids(self) -> list[str]:
        if self.document_ids:
            return self.document_ids
        if self.document_id:
            return [self.document_id]
        return []


# --- Upload & Documents ---

import os
import mimetypes

@app.post("/api/upload")
async def upload_document(
    file: UploadFile = File(...), 
    create_chat: bool = Form(True),
    user_id: str = Depends(get_current_user)
):
    allowed_extensions = {".pdf", ".docx", ".doc", ".pptx", ".txt"}
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only PDF, Word (.docx), PowerPoint (.pptx), and TXT files are accepted.")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB.",
        )

    try:
        doc_meta = await process_pdf(contents, file.filename, user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

    if create_chat:
        chat_session = db_create_chat(user_id, doc_meta["id"], title=doc_meta["filename"])
        return {"status": "success", "document": doc_meta, "chat": chat_session}
    
    return {"status": "success", "document": doc_meta}


@app.get("/api/documents")
async def get_documents(user_id: str = Depends(get_current_user)):
    return {"documents": list_documents(user_id)}


@app.get("/api/documents/{doc_id}/pdf")
async def get_document_file(doc_id: str, user_id: str = Depends(get_current_user)):
    doc = db_get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    file_bytes = db_get_pdf_data(doc_id)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="File content not found.")
        
    filename = doc["filename"]
    ext = os.path.splitext(filename)[1].lower()
    
    mime_types = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".txt": "text/plain",
    }
    
    media_type = mime_types.get(ext, "application/octet-stream")
    return Response(content=file_bytes, media_type=media_type)


@app.post("/api/documents/{doc_id}/pdf")
async def attach_file(doc_id: str, file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    allowed_extensions = {".pdf", ".docx", ".doc", ".pptx", ".txt"}
    
    doc = db_get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
        
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")
        
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Only PDF, Word (.docx), PowerPoint (.pptx), and TXT files are accepted.")
        
    contents = await file.read()
    db_save_pdf_data(doc_id, contents)
    return {"status": "success", "document_id": doc_id}


@app.delete("/api/documents/{doc_id}")
async def remove_document(doc_id: str, user_id: str = Depends(get_current_user)):
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"status": "deleted", "document_id": doc_id}


# --- Chat ---

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, user_id: str = Depends(get_current_user)):
    doc_ids = request.get_document_ids()
    if not doc_ids:
        raise HTTPException(status_code=400, detail="No document selected.")
    try:
        result = await chat(request.question, doc_ids, request.chat_history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")
    return result


@app.post("/api/chat/stream")
async def chat_stream_endpoint(request: ChatRequest, user_id: str = Depends(get_current_user)):
    doc_ids = request.get_document_ids()
    if not doc_ids:
        raise HTTPException(status_code=400, detail="No document selected.")
    return StreamingResponse(
        chat_stream(request.question, doc_ids, request.chat_history),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/summary")
async def summary_endpoint(request: SummaryRequest, user_id: str = Depends(get_current_user)):
    doc_ids = request.get_document_ids()
    if not doc_ids:
        raise HTTPException(status_code=400, detail="No document selected.")
    try:
        result = await summarize(doc_ids, request.summary_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")
    return result


@app.post("/api/quiz")
async def quiz_endpoint(request: QuizRequest, user_id: str = Depends(get_current_user)):
    doc_ids = request.get_document_ids()
    if not doc_ids:
        raise HTTPException(status_code=400, detail="No document selected.")
    try:
        result = await generate_quiz(doc_ids, request.difficulty, request.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")
    return result


import json as _json
from backend.openai import AsyncOpenAI as _AsyncOpenAI
from backend.config import OPENAI_API_KEY as _OPENAI_API_KEY

@app.post("/api/ai-detect")
async def ai_detect_endpoint(request: AiDetectRequest, user_id: str = Depends(get_current_user)):
    text = request.text.strip()
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Le texte doit contenir au moins 50 caractères.")

    system_prompt = (
        "You are an expert AI content detector. Analyze the given text and determine whether it was written by a human or generated by an AI.\n\n"
        "Evaluate carefully:\n"
        "- Writing style (naturalness, personal voice, imperfections)\n"
        "- Sentence structure (varied vs. formulaic patterns)\n"
        "- Coherence and logical flow\n"
        "- Vocabulary richness and diversity\n"
        "- Presence of filler phrases, transitions typical of AI\n"
        "- Emotional authenticity and personal anecdotes\n"
        "- Repetition of ideas or structural symmetry\n\n"
        "Be cautious: perfect detection is impossible. Lean toward 'uncertain' when evidence is mixed.\n\n"
        "Respond ONLY with a valid JSON object (no markdown, no code blocks) with these exact fields:\n"
        "{\n"
        '  "verdict": "ai" | "human" | "uncertain",\n'
        '  "ai_probability": <integer 0-100>,\n'
        '  "human_probability": <integer 0-100>,\n'
        '  "explanation": "<paragraph explaining your reasoning>",\n'
        '  "clues": ["<short clue 1>", "<short clue 2>", ...]\n'
        "}\n"
        "ai_probability + human_probability must equal 100. Provide 3 to 6 clues."
    )

    try:
        client = _AsyncOpenAI(api_key=_OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Analyze this text:\n\n{text}"},
            ],
            temperature=0.2,
            max_tokens=600,
        )
        raw = response.choices[0].message.content or ""
        # strip possible markdown fences
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = _json.loads(raw.strip())
        # Ensure required fields exist
        result.setdefault("verdict", "uncertain")
        result.setdefault("ai_probability", 50)
        result.setdefault("human_probability", 50)
        result.setdefault("explanation", "")
        result.setdefault("clues", [])
        return result
    except _json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during analysis: {str(e)}")



# --- Chat Sessions ---

@app.get("/api/chats")
async def list_chats(user_id: str = Depends(get_current_user)):
    return {"chats": db_list_chats(user_id)}


@app.post("/api/chats")
async def create_chat(request: CreateChatRequest, user_id: str = Depends(get_current_user)):
    doc = db_get_document(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    session = db_create_chat(user_id, request.document_id, request.title)
    return session


@app.patch("/api/chats/{chat_id}")
async def update_chat(chat_id: str, request: UpdateChatRequest, user_id: str = Depends(get_current_user)):
    result = db_update_chat(chat_id, title=request.title, pinned=request.pinned)
    if not result:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return result


@app.delete("/api/chats/{chat_id}")
async def delete_chat_endpoint(chat_id: str, user_id: str = Depends(get_current_user)):
    if not db_delete_chat(chat_id):
        raise HTTPException(status_code=404, detail="Chat not found.")
    return {"status": "deleted", "chat_id": chat_id}


@app.post("/api/chats/{chat_id}/reset")
async def reset_chat(chat_id: str, user_id: str = Depends(get_current_user)):
    chat_session = db_get_chat(chat_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat not found.")
    db_clear_messages(chat_id)
    return {"status": "reset", "chat_id": chat_id}


@app.get("/api/chats/{chat_id}/export")
async def export_chat(chat_id: str, user_id: str = Depends(get_current_user)):
    data = db_export_chat(chat_id)
    if not data:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return data


@app.get("/api/chats/{chat_id}/messages")
async def get_chat_messages(chat_id: str, user_id: str = Depends(get_current_user)):
    chat_session = db_get_chat(chat_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat not found.")
    return {"messages": db_get_messages(chat_id)}


@app.post("/api/chats/{chat_id}/documents")
async def attach_chat_document(chat_id: str, request: AttachDocumentRequest, user_id: str = Depends(get_current_user)):
    chat_session = db_get_chat(chat_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat not found.")
    doc = db_get_document(request.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    success = db_attach_document_to_chat(chat_id, request.document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to attach document.")
    return {"status": "attached", "chat_id": chat_id, "document_id": request.document_id}


@app.post("/api/chats/{chat_id}/messages")
async def add_chat_message(chat_id: str, request: SaveMessageRequest, user_id: str = Depends(get_current_user)):
    chat_session = db_get_chat(chat_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Chat not found.")
    msg = db_add_message(chat_id, request.role, request.content, request.sources)
    return msg
