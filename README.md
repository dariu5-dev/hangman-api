# hangman-api
A REST API-backed hangman game built with FastAPI. Game state, scoring, and win/loss logic all live server-side. Scores persist in SQLite with a username leaderboard. Vanilla JS frontend communicates through a clean JSON API.  `python` `fastapi` `sqlite` `rest-api`



## Run locally

pip install -r requirements.txt
uvicorn main:app --reload

Open http://localhost:8000
API docs at http://localhost:8000/docs
