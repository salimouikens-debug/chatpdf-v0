import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine, Column, String, Integer, Boolean, Text, DateTime, LargeBinary, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from config import SUPABASE_DB_URL

if not SUPABASE_DB_URL:
    raise RuntimeError(
        "SUPABASE_DB_URL is not set. Add it to .env.local, e.g.:\n"
        "SUPABASE_DB_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres"
    )

engine = create_engine(SUPABASE_DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class DocumentModel(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    total_pages = Column(Integer, nullable=False)
    total_chunks = Column(Integer, nullable=False)
    pdf_data = Column(LargeBinary, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "total_pages": self.total_pages,
            "total_chunks": self.total_chunks,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    pinned = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "document_id": self.document_id,
            "pinned": self.pinned,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatSessionDocument(Base):
    __tablename__ = "chat_session_documents"

    chat_id = Column(String, ForeignKey("chat_sessions.id"), primary_key=True)
    document_id = Column(String, ForeignKey("documents.id"), primary_key=True)
    added_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    sources_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "sources": json.loads(self.sources_json) if self.sources_json else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    return SessionLocal()


# --- Document CRUD ---

def db_save_document(user_id: str, doc_id: str, filename: str, total_pages: int, total_chunks: int, pdf_data: bytes | None = None):
    db = get_db()
    try:
        doc = DocumentModel(
            id=doc_id,
            user_id=user_id,
            filename=filename,
            total_pages=total_pages,
            total_chunks=total_chunks,
            pdf_data=pdf_data,
        )
        db.add(doc)
        db.commit()
    finally:
        db.close()


def db_get_document(doc_id: str) -> dict | None:
    db = get_db()
    try:
        doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        return doc.to_dict() if doc else None
    finally:
        db.close()


def db_list_documents(user_id: str) -> list[dict]:
    db = get_db()
    try:
        rows = db.query(
            DocumentModel.id,
            DocumentModel.filename,
            DocumentModel.total_pages,
            DocumentModel.total_chunks,
            DocumentModel.created_at,
            (DocumentModel.pdf_data.isnot(None)).label("has_pdf"),
        ).filter(
            DocumentModel.user_id == user_id
        ).order_by(DocumentModel.created_at.desc()).all()
        return [
            {
                "id": r.id,
                "filename": r.filename,
                "total_pages": r.total_pages,
                "total_chunks": r.total_chunks,
                "has_pdf": bool(r.has_pdf),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    finally:
        db.close()


def db_delete_document(doc_id: str) -> dict | None:
    db = get_db()
    try:
        doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        if not doc:
            return None
        doc_dict = doc.to_dict()
        sessions = db.query(ChatSession).filter(ChatSession.document_id == doc_id).all()
        for s in sessions:
            db.query(ChatMessage).filter(ChatMessage.chat_id == s.id).delete()
        db.query(ChatSession).filter(ChatSession.document_id == doc_id).delete()
        db.delete(doc)
        db.commit()
        return doc_dict
    finally:
        db.close()


def db_get_pdf_data(doc_id: str) -> bytes | None:
    db = get_db()
    try:
        doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        return doc.pdf_data if doc else None
    finally:
        db.close()


def db_save_pdf_data(doc_id: str, pdf_data: bytes) -> bool:
    db = get_db()
    try:
        doc = db.query(DocumentModel).filter(DocumentModel.id == doc_id).first()
        if not doc:
            return False
        doc.pdf_data = pdf_data
        db.commit()
        return True
    finally:
        db.close()


# --- Chat Session CRUD ---

def db_create_chat(user_id: str, document_id: str, title: str | None = None) -> dict:
    db = get_db()
    try:
        if not title:
            doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
            title = doc.filename if doc else "New chat"
        session = ChatSession(id=str(uuid.uuid4()), user_id=user_id, title=title, document_id=document_id)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session.to_dict()
    finally:
        db.close()


def db_list_chats(user_id: str) -> list[dict]:
    db = get_db()
    try:
        sessions = (
            db.query(ChatSession, DocumentModel.filename, DocumentModel.total_pages)
            .join(DocumentModel, ChatSession.document_id == DocumentModel.id)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.pinned.desc(), ChatSession.updated_at.desc())
            .all()
        )
        
        # Load extra documents
        result = []
        for s, doc_filename, doc_pages in sessions:
            d = s.to_dict()
            d["document_filename"] = doc_filename
            d["document_pages"] = doc_pages
            
            # Fetch additional documents for this chat
            extra_docs = (
                db.query(DocumentModel.id, DocumentModel.filename, DocumentModel.total_pages)
                .join(ChatSessionDocument, ChatSessionDocument.document_id == DocumentModel.id)
                .filter(ChatSessionDocument.chat_id == s.id)
                .all()
            )
            d["extra_documents"] = [
                {
                    "id": ed.id,
                    "filename": ed.filename,
                    "total_pages": ed.total_pages
                } for ed in extra_docs
            ]
            result.append(d)
        return result
    finally:
        db.close()


def db_get_chat(chat_id: str) -> dict | None:
    db = get_db()
    try:
        s = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if not s:
            return None
        d = s.to_dict()
        extra_docs = (
            db.query(DocumentModel.id, DocumentModel.filename, DocumentModel.total_pages)
            .join(ChatSessionDocument, ChatSessionDocument.document_id == DocumentModel.id)
            .filter(ChatSessionDocument.chat_id == s.id)
            .all()
        )
        d["extra_documents"] = [
            {
                "id": ed.id,
                "filename": ed.filename,
                "total_pages": ed.total_pages
            } for ed in extra_docs
        ]
        return d
    finally:
        db.close()


def db_update_chat(chat_id: str, title: str | None = None, pinned: bool | None = None) -> dict | None:
    db = get_db()
    try:
        s = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if not s:
            return None
        if title is not None:
            s.title = title
        if pinned is not None:
            s.pinned = pinned
        s.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(s)
        return s.to_dict()
    finally:
        db.close()


def db_attach_document_to_chat(chat_id: str, document_id: str) -> bool:
    db = get_db()
    try:
        # verify chat exists
        s = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if not s:
            return False
            
        # check if already attached
        existing = db.query(ChatSessionDocument).filter(
            ChatSessionDocument.chat_id == chat_id,
            ChatSessionDocument.document_id == document_id
        ).first()
        if existing or s.document_id == document_id:
            return True
            
        link = ChatSessionDocument(chat_id=chat_id, document_id=document_id)
        db.add(link)
        s.updated_at = datetime.now(timezone.utc)
        db.commit()
        return True
    finally:
        db.close()


def db_delete_chat(chat_id: str) -> bool:
    db = get_db()
    try:
        s = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if not s:
            return False
        db.query(ChatMessage).filter(ChatMessage.chat_id == chat_id).delete()
        db.query(ChatSessionDocument).filter(ChatSessionDocument.chat_id == chat_id).delete()
        db.delete(s)
        db.commit()
        return True
    finally:
        db.close()


# --- Chat Messages CRUD ---

def db_get_messages(chat_id: str) -> list[dict]:
    db = get_db()
    try:
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.chat_id == chat_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        return [m.to_dict() for m in msgs]
    finally:
        db.close()


def db_add_message(chat_id: str, role: str, content: str, sources: list | None = None) -> dict:
    db = get_db()
    try:
        msg = ChatMessage(
            chat_id=chat_id,
            role=role,
            content=content,
            sources_json=json.dumps(sources or []),
        )
        db.add(msg)
        s = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if s:
            s.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(msg)
        return msg.to_dict()
    finally:
        db.close()


def db_clear_messages(chat_id: str) -> bool:
    db = get_db()
    try:
        count = db.query(ChatMessage).filter(ChatMessage.chat_id == chat_id).delete()
        db.commit()
        return count > 0
    finally:
        db.close()


def db_export_chat(chat_id: str) -> dict | None:
    db = get_db()
    try:
        s = db.query(ChatSession).filter(ChatSession.id == chat_id).first()
        if not s:
            return None
        doc = db.query(DocumentModel).filter(DocumentModel.id == s.document_id).first()
        
        extra_docs = (
            db.query(DocumentModel)
            .join(ChatSessionDocument, ChatSessionDocument.document_id == DocumentModel.id)
            .filter(ChatSessionDocument.chat_id == s.id)
            .all()
        )
        
        msgs = (
            db.query(ChatMessage)
            .filter(ChatMessage.chat_id == chat_id)
            .order_by(ChatMessage.created_at.asc())
            .all()
        )
        return {
            "chat": s.to_dict(),
            "document": doc.to_dict() if doc else None,
            "extra_documents": [ed.to_dict() for ed in extra_docs],
            "messages": [m.to_dict() for m in msgs],
        }
    finally:
        db.close()
