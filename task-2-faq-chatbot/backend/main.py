from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from faq_engine import FAQS, answer_question


class ChatRequest(BaseModel):
    message: str


class Match(BaseModel):
    question: str
    score: float


class ChatResponse(BaseModel):
    answer: str
    matched_question: str | None
    confidence: float
    suggestions: List[Match]


app = FastAPI(title="FAQ Chatbot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "faq_count": len(FAQS)}


@app.get("/faqs")
def list_faqs():
    return FAQS


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    return answer_question(request.message)
