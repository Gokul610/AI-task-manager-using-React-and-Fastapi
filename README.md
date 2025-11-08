# 🚀 AI-Powered Task Management System

[cite_start]This is a next-generation task management application that acts as a personal productivity partner[cite: 2]. [cite_start]It uses intelligent, transparent algorithms and a deeply engaging user experience to help users not only manage their tasks but to fundamentally optimize their workflow[cite: 3].

## ✨ Key Features

* **Google OAuth 2.0:** Secure sign-in using your Google account.
* **Google Calendar Two-Way Sync:** Tasks with due dates are automatically created, updated, or deleted from your Google Calendar.
* **Natural Language Task Creation:** Create tasks with conversational text (e.g., "Finish the report by Friday at 5pm #urgent").
* **Voice-Powered Creation:** Add tasks hands-free using your voice.
* **Explainable Priority Engine:** A dynamic priority score is calculated for every task based on urgency, importance, and ML-driven factors. You can hover over the score to see *why* it was rated.
* **ML Personalization:** The system learns from your habits to predict task difficulty, personalize importance, and identify high-friction tasks you tend to avoid.
* **AI-Powered Suggestions:**
    * **Task Splitting:** The AI will offer to break large, complex tasks into smaller sub-tasks.
    * **Smart Scheduling:** The AI learns your peak productivity windows and suggests scheduling high-effort tasks during those times.
* **Productivity Insights Dashboard:**
    * **Velocity Chart:** A predictive burndown chart that shows your project's trajectory.
    * **Productivity Heatmap:** A visual grid showing your task completion volume by day and hour.
    * **AI Weekly Summary:** A generative AI report on your week's accomplishments and bottlenecks.
* **Gamification Engine:** Stay motivated with activity streaks and by unlocking achievements.

## 💻 Technology Stack

* **Frontend:** React, Framer Motion, Tailwind CSS
* [cite_start]**Backend:** FastAPI, SQLAlchemy (ORM), Alembic (Migrations) [cite: 40, 41, 42, 43]
* [cite_start]**Database:** PostgreSQL [cite: 41]
* **AI/ML:** Google Gemini, Scikit-learn
* **Containerization:** Docker & Docker Compose

## 📦 Running the Project (Docker - Recommended)

This is the fastest and most reliable way to run the entire application.

### 1. Environment Setup (CRITICAL)

This project requires **two** identical `.env` files to run correctly with Docker.

1.  **Root `.env` (for Docker Compose):**
    * Create a file named `.env` in the project root (`ai-task-manager/.env`).
    * Copy the contents of `1.zip/1/.env` into it.
    * **CRITICAL:** In this file, you *must* change the `POSTGRESQL_SERVER` variable to point to the Docker service name:
        ```env
        POSTGRESQL_SERVER=db
        ```

2.  **Backend `.env` (for Local Dev):**
    * Create a file named `.env` inside the `backend/` folder (`backend/.env`).
    * Copy the *exact same content* into this file.
    * **CRITICAL:** In this file, `POSTGRESQL_SERVER` must remain `localhost`:
        ```env
        POSTGRESQL_SERVER=localhost
        ```

### 2. Build and Run Containers

Make sure Docker Desktop is running. Then, from the project root folder (`ai-task-manager/`), run:

```bash
docker-compose up --build
```

This will build the images for the frontend and backend, start all three containers, and show you the combined logs.

### 3. Run Database Migrations (One-Time Setup)

The containers are running, but the database is empty. We need to create our tables.

1.  Keep the containers running from the previous step.
2.  Open a **new** terminal window.
3.  In the project root, run this command:

    ```bash
    docker-compose exec backend alembic upgrade head
    ```

This command executes `alembic upgrade head` *inside* the running backend container, which connects to the `db` container and builds all the tables (`users`, `tasks`, `user_logs`).

### 4. Access the Application

You can now access the running application in your browser:

* **Frontend:** `http://localhost:3000`
* **Backend API Docs:** `http://localhost:8000/docs`

---

## 🔧 Running Locally (Alternative)

If you prefer not to use Docker, you can run the services manually.

### 1. Environment Setup

* Ensure you have a `.env` file inside the `backend/` folder.
* Make sure `POSTGRESQL_SERVER` is set to `localhost`.
* Ensure you have PostgreSQL installed and running locally.

### 2. Backend Setup

```bash
# From the project root
cd backend/

# 1. Create and activate a virtual environment
python -m venv project-env
source project-env/bin/activate  # (or .\project-env\Scripts\activate on Windows)

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create the database (if it doesn't exist)
python scripts/create_db.py

# 4. Run the database migrations to create tables
alembic upgrade head

# 5. Run the server
uvicorn app.main:app --reload
```

Your backend is now running on `http://localhost:8000`.

### 3. Frontend Setup

```bash
# From the project root, open a NEW terminal
cd frontend/

# 1. Install dependencies
npm install

# 2. Run the development server
npm start
```

Your frontend is now running on `http://localhost:3000`.

## 📁 Project Structure

```
ai-task-manager/
├── .env                  # Root .env for Docker Compose
├── .gitignore
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── .env              # .env for local development
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── migrations/       # Alembic migration scripts
│   ├── scripts/
│   │   └── create_db.py
│   └── app/              # FastAPI application
│       ├── api/          # API Routers (auth, tasks, insights)
│       ├── core/         # Config, Database session
│       ├── models/       # SQLAlchemy models
│       ├── schemas/      # Pydantic schemas
│       └── services/     # All business logic (auth, nlp, ml)
│
├── frontend/
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── components/   # UI components
│       ├── pages/        # Top-level page components
│       └── services/     # API clients (axios)
│
└── ml/
    ├── models/           # (Ignored by Git) Trained .pkl models
    └── scripts/          # Python scripts for model training
        ├── train_user_model.py
        └── recalculate_priorities.py
```