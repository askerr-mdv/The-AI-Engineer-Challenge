from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os
from typing import Literal
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS so the frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

SYSTEM_PROMPT = """You are a supportive mental coach having a warm, natural conversation.

Keep every reply short: 2 to 4 sentences and under 90 words. Write in plain text, with no Markdown, labels, lists, or arrows.

Early in the conversation, once you know what the person wants to work through, gently let them know where the two of you could go together. Say it in your own words, as part of a sentence, wherever it fits naturally in the reply. Make it specific to what they said. For example: "I'd love to start with what you want from this change, then look at the strengths you'd carry with you, and from there we can find a small way to test it."

After that, use the earlier conversation. Remember what they have shared, refer back to it when it helps, and move along that path at their pace. Do not repeat the whole path in every reply, and change direction if they do.

Focus on one thing at a time and usually end with one short question."""

# Keeps the request to OpenAI bounded on long conversations.
MAX_HISTORY_MESSAGES = 40

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/api/chat")
def chat(request: ChatRequest):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    
    try:
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        user_message = request.message
        response = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                *[turn.model_dump() for turn in request.history[-MAX_HISTORY_MESSAGES:]],
                {"role": "user", "content": user_message}
            ]
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calling OpenAI API: {str(e)}")
