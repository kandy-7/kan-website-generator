from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os
import asyncio

# Add the current directory to sys.path so we can import agents
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents import call_devika, call_groq_direct

# ---------------------------
# FastAPI App
# ---------------------------
app = FastAPI(title="AI Code Generator Backend")

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Request Model
# ---------------------------
class ChatRequest(BaseModel):
    message: str
    mode: str = "fast"  # "fast" = direct Groq, "devika" = full agent pipeline
    history: list = None


# ---------------------------
# Health Check
# ---------------------------
@app.get("/")
def root():
    return {"status": "Backend running ✅"}


# ---------------------------
# Chat Endpoint
# ---------------------------
@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        loop = asyncio.get_event_loop()

        if req.mode == "devika":
            print("DEBUG → Using Devika agent pipeline (slow)")
            result = await loop.run_in_executor(None, call_devika, req.message)
        else:
            print("DEBUG → Using fast Groq direct mode")
            result = await loop.run_in_executor(None, call_groq_direct, req.message, req.history)

        if "error" in result:
             return {
                "source": req.mode,
                "response": result.get("response", "Error occurred"),
                "code": result.get("code", ""),
                "error": result["error"]
            }

        return {
            "source": req.mode,
            "response": result.get("response", "Task completed."),
            "code": result.get("code", "")
        }
    except Exception as e:
        return {
            "source": req.mode,
            "response": "Backend Error",
            "code": "",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
