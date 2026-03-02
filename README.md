# Website Generator Project

This project consists of three main components:
1. **Frontend**: A Vite + React application.
2. **Backend**: A Python (FastAPI) backend.
3. **Devika**: An AI agent framework.

## Project Setup & Running

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Bun (optional, but `bun.lockb` exists)

---

### 2. Frontend Setup
Navigate to the root directory and install dependencies:
```sh
npm install
# or
bun install
```

Start the development server:
```sh
npm run dev
# or
bun dev
```
The frontend will typically run at `http://localhost:5173`.

---

### 3. Backend Setup
Navigate to the `backend` directory:
```sh
cd backend
# Create and activate a virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file based on the template below:
```sh
DEVIKA_URL=http://127.0.0.1:1337
DEVIKA_PROJECT_NAME=Agent_ChatBot
DEVIKA_MODEL=llama-3.3-70b-versatile
GROQ_API_KEY=your_groq_api_key_here
```

Run the backend server:
```sh
python main.py
```
The backend will run at `http://localhost:8001`.

---

### 4. Devika Setup
Navigate to the `devika` directory:
```sh
cd devika
# Create and activate a virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On Linux/macOS: source venv/bin/activate

# Install dependencies (specific for Windows if applicable)
pip install -r requirements_win.txt
```

Create/edit `config.toml` (copy from `sample.config.toml`) and add your API keys.

Run the Devika server:
```sh
python devika.py
```
Devika will run at `http://localhost:1337`.

---

## 🔒 Masked API Keys
Ensure you replace the placeholders in the following files with your actual API keys:
- `backend/.env` (GROQ_API_KEY)
- `devika/config.toml` (GROQ, BING, GOOGLE_SEARCH, etc.)

---

## Technologies Used
- **Frontend**: Vite, React, shadcn-ui, Tailwind CSS
- **Backend**: FastAPI, Uvicorn, Python
- **AI Agent**: Devika (SocketIO, Flask)
