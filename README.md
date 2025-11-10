# Credit Card Rewards Maximizer

An intelligent mobile app that uses AI to recommend the optimal credit card for every purchase, maximizing rewards automatically.

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- GROQ API key ([Get free key](https://console.groq.com/))

### Setup

1. Clone the repository:
```bash
git clone https://github.com/eugenelacatis/CreditCardRewardsMaximizer.git
cd CreditCardRewardsMaximizer
```

2. Create `.env` file in `backend/` directory:
```bash
cd backend
cp .env.example .env
```

3. Add your GROQ API key to `backend/.env`:
```
GROQ_API_KEY=your_groq_api_key_here
```

4. Start the application:
```bash
cd ..
docker-compose up
```

### Access the Application
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Frontend (Expo Web)**: http://localhost:19006
- **Health Check**: http://localhost:8000/health

---

## 🛠️ Manual Setup (Alternative)

### Prerequisites
- Node.js 18+
- Python 3.11+
- Expo Go app on phone (optional)

### Backend Setup

1. Navigate to backend:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file and add GROQ API key:
```bash
cp .env.example .env
# Edit .env and add: GROQ_API_KEY=your_key_here
```

5. Start backend:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Navigate to frontend:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start Expo:
```bash
npx expo start
```

4. Open app:
- Press `w` for web browser
- Scan QR code with Expo Go app on phone

### Connecting Frontend to Backend (Mobile Testing)

For mobile device testing, use LocalTunnel:

```bash
npm install -g localtunnel
lt --port 8000
```

Copy the generated URL and update `frontend/src/services/api.js` with the LocalTunnel URL.

---

## 📱 Features

- 🤖 **AI-Powered Recommendations** - Llama 3 analyzes your cards in real-time
- 💳 **Multi-Card Management** - Track multiple credit cards
- 🎯 **Goal Optimization** - Maximize cash back, travel points, or balanced rewards
- 📊 **Savings Analytics** - See potential savings
- ⚡ **Instant Decisions** - Get recommendations in <2 seconds

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- LangChain + Groq (Llama 3 AI)
- SQLite database

**Frontend:**
- React Native (Expo)
- Cross-platform (iOS, Android, Web)

## 📦 Project Structure
```
CreditCardRewardsMaximizer/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── agents.py            # AI agent system
│   ├── agentic_enhancements.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                 # Your secrets (not in Git!)
├── frontend/
│   ├── App.js
│   ├── src/
│   │   ├── screens/
│   │   └── services/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── docs/
```

## 🎯 Usage

1. Start the application (Docker or manual)
2. Open the mobile app or web interface
3. Tap "Transaction" tab
4. Enter merchant, amount, and category
5. Select optimization goal
6. Get AI-powered card recommendation!

## 📅 Project Timeline

See `docs/Work Division.md` for detailed task breakdown and team responsibilities.

## 📄 Additional Documentation

- Architecture details and project deliverables: `docs/CMPE 272 Project Deliverable.pdf`
- Previous project ideas: `docs/old_project_ideas.md`
