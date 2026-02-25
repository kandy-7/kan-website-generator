import os
import requests
import time
import socketio
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

DEVIKA_URL = os.getenv("DEVIKA_URL", "http://127.0.0.1:1337")
PROJECT_NAME = os.getenv("DEVIKA_PROJECT_NAME", "Agent_ChatBot")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEVIKA_MODEL = "LLAMA-3.3 70B"
GROQ_MODEL = "llama-3.3-70b-versatile"


def call_groq_direct(task: str, history: list = None) -> dict:
    """
    Fast path: call Groq directly to generate code without Devika's 
    multi-agent pipeline. Now includes history for contextual responses.
    """
    print(f"DEBUG → [FAST MODE] Calling Groq directly for: {task[:60]}...")

    system_prompt = """You are a Senior Full-Stack AI Developer (Precision Mode). 
Your objective is to generate professional, pixel-perfect, production-ready code.

1. LAW OF MINIMUM CHANGE: 
   - When modifying code, ONLY change the specific properties or elements requested.
   - NEVER modify layout logic (Flexbox/Grid/Margins/Padding) if only colors or text are requested.
   - Preserve 100% of the surrounding code structure and formatting.

2. PROFESSIONAL LAYOUTS: 
   - Use Flexbox or CSS Grid for all alignments. 
   - Avoid absolute positioning for main containers.
   - Ensure `min-height: 100vh` and perfect centering for web pages.

3. SEMANTIC ACCURACY:
   - If a specific color is requested (e.g., "white"), use exactly that (`#fff` or `white`).
   - Do not guess or substitute similar colors.

4. OUTPUT FORMAT:
   - Provide complete, runnable code in a markdown block (```language ... ```).
   - Add a brief 1-line technical comment at the top.
   - Include CSS and JS inline for portable web previews."""

    # Map frontend roles to Groq roles
    messages = [{"role": "system", "content": system_prompt}]
    
    if history:
        for msg in history:
            role = "assistant" if msg.get("role") == "assistant" else "user"
            messages.append({"role": role, "content": msg.get("content", "")})
    
    # Add the current task
    messages.append({"role": "user", "content": task})

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GROQ_MODEL,
                "messages": messages,
                "max_tokens": 4096,
                "temperature": 0.3
            },
            timeout=30
        )

        if response.status_code != 200:
            print(f"DEBUG → Groq API error: {response.status_code} {response.text}")
            return {"response": f"API Error: {response.status_code}", "code": ""}

        data = response.json()
        content = data["choices"][0]["message"]["content"]
        print(f"DEBUG → Groq response received ({len(content)} chars)")

        # Extract code from markdown code blocks
        code = ""
        chat_text = content.strip()

        if "```" in content:
            parts = content.split("```")
            # If we have content before/after code blocks, it's the chat text
            # If we have a code block, extract it
            if len(parts) >= 2:
                code_block = parts[1]
                # Remove language identifier from first line
                lines = code_block.split("\n")
                if lines and lines[0].strip() in ["python", "html", "javascript", "js", "css", "tsx", "jsx", "typescript", "ts", "py"]:
                    code = "\n".join(lines[1:]).strip()
                else:
                    code = code_block.strip()

                # Text before/after the code block
                before = parts[0].strip()
                after = parts[2].strip() if len(parts) > 2 else ""
                if before and after:
                    chat_text = f"{before}\n\n{after}"
                else:
                    chat_text = before or after or "Here's the generated code:"
        else:
            # PURELY conversational or the model forgot bits
            # If it doesn't look like code (no matching tags/imports/syntax), it's just chat
            code = ""
            chat_text = content.strip()

        return {
            "response": chat_text,
            "code": code
        }

    except Exception as e:
        print(f"DEBUG → Groq direct error: {e}")
        return {"response": f"Error: {str(e)}", "code": ""}


def call_devika(task: str) -> dict:
    """
    Devika multi-agent path (slower, ~30-60s).
    Uses Planner → Researcher → Coder pipeline.
    """
    timestamp = int(time.time())
    project_name = f"Project_{timestamp}"

    print(f"DEBUG → [DEVIKA MODE] Starting task for project: {project_name}")
    print(f"DEBUG → Task: {task[:60]}...")

    try:
        requests.post(
            f"{DEVIKA_URL}/api/create-project",
            json={"project_name": project_name},
            timeout=30
        )

        sio = socketio.SimpleClient()
        sio.connect(DEVIKA_URL)

        sio.emit("user-message", {
            "message": task,
            "project_name": project_name,
            "base_model": DEVIKA_MODEL,
            "search_engine": "duckduckgo"
        })
        print("DEBUG → Message sent via socket")

        start = time.time()
        while time.time() - start < 600:
            state_r = requests.post(
                f"{DEVIKA_URL}/api/get-agent-state",
                json={"project_name": project_name},
                timeout=30
            )
            state = state_r.json().get("state", {})
            elapsed = int(time.time() - start)
            print(f"DEBUG → [{elapsed}s] step: {state.get('step')} | active: {state.get('agent_is_active')} | completed: {state.get('completed')}")

            if state.get("completed"):
                msg_r = requests.post(
                    f"{DEVIKA_URL}/api/messages",
                    json={"project_name": project_name},
                    timeout=30
                )
                messages = msg_r.json().get("messages", [])

                final_text = "Task completed."
                for msg in reversed(messages):
                    content = msg.get("message", "").lower()
                    if not msg.get("from_devika"):
                        continue
                    is_status = any(s in content for s in [
                        "completed the my task",
                        "think i can proceed",
                        "searching the web",
                        "without searching"
                    ])
                    if not is_status:
                        final_text = msg.get("message")
                        break

                code_content = ""
                try:
                    project_slug = project_name.lower().replace(" ", "-")
                    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                    projects_dir = os.path.join(root_dir, "devika", "data", "projects", project_slug)

                    if os.path.exists(projects_dir):
                        files = [f for f in os.listdir(projects_dir)
                                if os.path.isfile(os.path.join(projects_dir, f)) and not f.startswith("`")]
                        if files:
                            priority_exts = ['.py', '.tsx', '.jsx', '.js', '.html', '.css']
                            best_file = files[0]
                            for f in files:
                                if any(f.endswith(ext) for ext in priority_exts):
                                    best_file = f
                                    break
                            with open(os.path.join(projects_dir, best_file), "r", encoding="utf-8") as f:
                                code_content = f.read()
                except Exception as ce:
                    print(f"DEBUG → Error reading code: {ce}")

                sio.disconnect()
                return {"response": final_text, "code": code_content}

            time.sleep(4)

        sio.disconnect()
        return {"response": "Timeout: Devika did not finish within 10 minutes.", "code": ""}

    except Exception as e:
        print("DEVIKA ERROR:", e)
        if 'sio' in locals():
            sio.disconnect()
        return {"error": str(e), "response": "Backend Error", "code": ""}
