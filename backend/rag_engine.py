from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.schema import HumanMessage, SystemMessage, AIMessage

from config import (
    OPENAI_API_KEY,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    EMBEDDING_MODEL,
    LLM_MODEL,
    TOP_K,
)
from pinecone import Pinecone

_embeddings = None
_llm = None
_index = None


def _get_embeddings():
    global _embeddings
    if _embeddings is None:
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set in .env.local")
        _embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL, openai_api_key=OPENAI_API_KEY)
    return _embeddings


def _get_llm():
    global _llm
    if _llm is None:
        if not OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY is not set in .env.local")
        _llm = ChatOpenAI(model=LLM_MODEL, openai_api_key=OPENAI_API_KEY, temperature=0.2)
    return _llm


def _get_index():
    global _index
    if _index is None:
        if not PINECONE_API_KEY:
            raise RuntimeError("PINECONE_API_KEY is not set in .env.local")
        pc = Pinecone(api_key=PINECONE_API_KEY)
        _index = pc.Index(PINECONE_INDEX_NAME)
    return _index


SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided document context.

Rules:
- Only answer based on the provided context. If the answer is not in the context, say so clearly.
- When the context comes from multiple documents, clearly indicate which document each piece of information comes from using [Document: filename, Page X] format.
- When the context comes from a single document, cite the page number(s) using [Page X] format.
- When the user asks for details or in-depth explanations, provide thorough and comprehensive answers using all available context.
- When the user asks for a summary, provide a structured summary with key points.
- When the user asks to compare documents, highlight similarities, differences, and key points from each document.
- Use markdown formatting to structure your answers: use ## or ### for section headings, **bold** for key terms, and bullet points or numbered lists when listing items. Keep the text readable and well-structured.
- Answer in the same language as the user's question.
- Never refuse to give a detailed answer if the context contains the information. Use all relevant context provided."""


def _extract_matches(results) -> list:
    """Extract matches from Pinecone query results, handling both dict and object responses."""
    if hasattr(results, "matches"):
        return results.matches or []
    if isinstance(results, dict):
        return results.get("matches", [])
    return []


def _extract_metadata(match) -> dict:
    """Extract metadata from a Pinecone match, handling both dict and object responses."""
    if hasattr(match, "metadata"):
        return match.metadata or {}
    if isinstance(match, dict):
        return match.get("metadata", {})
    return {}


def _get_meta_field(meta, field: str, default=""):
    """Safely extract a field from metadata (dict or object)."""
    if isinstance(meta, dict):
        return meta.get(field, default)
    return getattr(meta, field, default)


def _build_context(matches: list, multi_doc: bool = False) -> tuple[str, list[dict]]:
    """Build a context string from Pinecone matches and extract source info."""
    context_parts = []
    sources = []
    seen = set()

    for match in matches:
        meta = _extract_metadata(match)
        text = _get_meta_field(meta, "text", "")
        page = _get_meta_field(meta, "page", 0)
        filename = _get_meta_field(meta, "filename", "")

        source_key = f"{filename}:{page}:{text[:80]}"
        if source_key in seen:
            continue
        seen.add(source_key)

        if multi_doc and filename:
            context_parts.append(f"[Document: {filename}, Page {page}]: {text}")
        else:
            context_parts.append(f"[Page {page}]: {text}")

        source_entry = {"page": page, "text": text[:200]}
        if multi_doc and filename:
            source_entry["filename"] = filename
        sources.append(source_entry)

    return "\n\n".join(context_parts), sources


import json
from collections.abc import AsyncGenerator


def _build_pinecone_filter(document_ids: list[str]) -> dict:
    """Build Pinecone metadata filter for one or many documents."""
    if len(document_ids) == 1:
        return {"document_id": {"$eq": document_ids[0]}}
    return {"document_id": {"$in": document_ids}}


async def _prepare_rag(question: str, document_ids: list[str], chat_history: list[dict] | None = None):
    """Shared RAG retrieval: embed question, search Pinecone, build messages. Returns (messages, sources, context) or a no-match tuple."""
    embeddings = _get_embeddings()
    question_vector = await embeddings.aembed_query(question)

    multi_doc = len(document_ids) > 1

    index = _get_index()
    results = index.query(
        vector=question_vector,
        top_k=TOP_K * (2 if multi_doc else 1),
        include_metadata=True,
        filter=_build_pinecone_filter(document_ids),
    )

    matches = _extract_matches(results)
    if not matches:
        return None, [], ""

    context, sources = _build_context(matches, multi_doc=multi_doc)

    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    if chat_history:
        for msg in chat_history[-6:]:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))

    doc_label = "documents" if multi_doc else "document"
    user_prompt = f"""Context from the {doc_label}:
---
{context}
---

User question: {question}"""

    messages.append(HumanMessage(content=user_prompt))
    return messages, sources, context


async def chat(question: str, document_ids: list[str], chat_history: list[dict] | None = None) -> dict:
    """RAG pipeline (non-streaming): embed question -> search -> build prompt -> generate answer."""
    messages, sources, _ctx = await _prepare_rag(question, document_ids, chat_history)
    if messages is None:
        return {
            "answer": "I couldn't find relevant information in the selected document(s) to answer your question.",
            "sources": [],
        }

    llm = _get_llm()
    response = await llm.ainvoke(messages)
    return {"answer": response.content, "sources": sources}


async def chat_stream(question: str, document_ids: list[str], chat_history: list[dict] | None = None) -> AsyncGenerator[str, None]:
    """RAG pipeline with SSE streaming."""
    messages, sources, rag_context = await _prepare_rag(question, document_ids, chat_history)

    if messages is None:
        no_match_msg = "I couldn't find relevant information in the selected document(s) to answer your question."
        yield f"event: sources\ndata: {json.dumps({'sources': []})}\n\n"
        yield f"event: token\ndata: {json.dumps({'token': no_match_msg})}\n\n"
        yield "event: done\ndata: {}\n\n"
        return

    yield f"event: sources\ndata: {json.dumps({'sources': sources})}\n\n"

    llm = _get_llm()
    full_answer = ""
    async for chunk in llm.astream(messages):
        token = chunk.content
        if token:
            full_answer += token
            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

    yield "event: done\ndata: {}\n\n"

    suggestions = await _generate_suggestions(question, full_answer, rag_context)
    yield f"event: suggestions\ndata: {json.dumps({'suggestions': suggestions})}\n\n"


async def _generate_suggestions(question: str, answer: str, context: str) -> list[str]:
    """Generate 3 follow-up questions based on the PDF content and the answer."""
    try:
        llm = _get_llm()
        prompt = f"""Here is the actual content extracted from the user's PDF document:
---
{context[:3000]}
---

The user asked: "{question}"
The assistant answered: "{answer[:800]}"

Based ONLY on the PDF content above, generate exactly 3 follow-up questions.
Each question MUST reference specific topics, names, terms, or facts that appear in the PDF content above.
For example, if the PDF talks about "machine learning algorithms", a good question would be "Quels algorithmes de machine learning sont mentionnes ?"
Do NOT generate generic questions like "Can you explain more?" or "What are the key points?"

Rules:
- Each question MUST mention a specific element from the PDF content
- Each question must be concise (max 15 words)
- Write in the same language as the user's question
- Return ONLY the 3 questions, one per line, no numbering, no bullets"""

        response = await llm.ainvoke([HumanMessage(content=prompt)])
        lines = [l.strip() for l in response.content.strip().split("\n") if l.strip()]
        return lines[:3]
    except Exception:
        return []


async def summarize(document_ids: list[str], summary_type: str = "global") -> dict:
    """Generate a summary by retrieving key chunks from one or multiple documents."""
    multi_doc = len(document_ids) > 1

    summary_queries = {
        "global": "What are the main topics and key points of this entire document?",
        "key_points": "What are the most important facts and conclusions in this document?",
        "brief": "Provide a very brief overview of this document in 2-3 sentences.",
    }
    if multi_doc:
        summary_queries = {
            "global": "What are the main topics and key points across all these documents?",
            "key_points": "What are the most important facts and conclusions across all these documents?",
            "brief": "Provide a very brief overview of these documents in 2-3 sentences.",
        }
    query = summary_queries.get(summary_type, summary_queries["global"])

    embeddings = _get_embeddings()
    query_vector = await embeddings.aembed_query(query)

    index = _get_index()
    results = index.query(
        vector=query_vector,
        top_k=TOP_K * (3 if multi_doc else 2),
        include_metadata=True,
        filter=_build_pinecone_filter(document_ids),
    )

    matches = _extract_matches(results)
    if not matches:
        return {"summary": "No content found for the selected document(s).", "sources": []}

    context, sources = _build_context(matches, multi_doc=multi_doc)

    prompt_map = {
        "global": "Provide a comprehensive summary. Structure it with clear sections and key points.",
        "key_points": "Extract and list the key points and main takeaways as a numbered list.",
        "brief": "Provide a brief 2-3 sentence summary.",
    }
    if multi_doc:
        prompt_map = {
            "global": "Provide a comprehensive cross-document summary. Compare and synthesize information across all documents. Clearly indicate which information comes from which document.",
            "key_points": "Extract and list the key points and main takeaways from all documents as a numbered list. Indicate which document each point comes from.",
            "brief": "Provide a brief 2-3 sentence summary covering all documents.",
        }
    instruction = prompt_map.get(summary_type, prompt_map["global"])

    doc_label = "documents" if multi_doc else "document"
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=f"""Context from the {doc_label}:
---
{context}
---

{instruction}"""),
    ]

    llm = _get_llm()
    response = await llm.ainvoke(messages)
    return {"summary": response.content, "sources": sources}


async def generate_quiz(document_ids: list[str], difficulty: str = "medium", language: str = "fr") -> dict:
    """Generate 10 MCQ questions from document content using RAG."""
    query = "main concepts, definitions, key information, important facts and principles"

    embeddings = _get_embeddings()
    query_vector = await embeddings.aembed_query(query)

    index = _get_index()
    results = index.query(
        vector=query_vector,
        top_k=TOP_K * 3,
        include_metadata=True,
        filter=_build_pinecone_filter(document_ids),
    )

    matches = _extract_matches(results)
    if not matches:
        return {"questions": []}

    context, _ = _build_context(matches, multi_doc=len(document_ids) > 1)

    difficulty_instructions = {
        "easy": "Generate straightforward factual questions testing basic recall and simple definitions.",
        "medium": "Generate a mix of factual, comprehension, and application questions. Avoid trivially obvious answers.",
        "hard": "Generate challenging questions requiring deep understanding, inference, or comparison between concepts.",
    }
    diff_instr = difficulty_instructions.get(difficulty, difficulty_instructions["medium"])

    lang_instructions = {
        "fr": "Write ALL text in French.",
        "en": "Write ALL text in English.",
        "ar": "Write ALL text in Arabic.",
    }
    lang_instr = lang_instructions.get(language, lang_instructions["fr"])

    prompt = f"""You are an expert educator creating a multiple-choice quiz from a document.

Document content:
---
{context[:6000]}
---

Instructions:
- {lang_instr}
- {diff_instr}
- Generate exactly 10 questions based ONLY on the document content above.
- Each question must have exactly 4 options labeled A, B, C, D.
- Vary question types: definitions, comprehension, application.
- Avoid overly generic or trivially obvious questions.
- Each question must have a clear, unique correct answer found in the document.

Return ONLY a valid JSON array (no markdown, no explanation outside JSON) with this exact structure:
[
  {{
    "id": 1,
    "question": "...",
    "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
    "correct": "A",
    "explanation": "Short explanation of why this is correct, referencing the document."
  }},
  ...
]
"""

    llm = _get_llm()
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = response.content.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    questions = json.loads(raw)
    return {"questions": questions}

