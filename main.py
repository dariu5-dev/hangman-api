from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager

import game as game_module
import database

# ── Startup ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield

app = FastAPI(title="Hangman API", lifespan=lifespan)

# ── Schemas ───────────────────────────────────────────────────────────────────

class GuessRequest(BaseModel):
    game_id: str
    letter: str

class SaveScoreRequest(BaseModel):
    game_id: str
    username: str

# ── Game endpoints ────────────────────────────────────────────────────────────

@app.post("/api/game/new")
def new_game():
    """Start a new game and return its initial state."""
    g = game_module.create_game()
    return g.state()

@app.post("/api/game/guess")
def guess(req: GuessRequest):
    """Submit a letter guess."""
    g = game_module.get_game(req.game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found.")
    result = g.guess(req.letter)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/api/game/{game_id}")
def get_state(game_id: str):
    """Get current state of a game."""
    g = game_module.get_game(game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found.")
    return g.state()

# ── Score endpoints ───────────────────────────────────────────────────────────

@app.post("/api/scores/save")
def save_score(req: SaveScoreRequest):
    """Save a finished game's score under a username."""
    g = game_module.get_game(req.game_id)
    if not g:
        raise HTTPException(status_code=404, detail="Game not found.")
    if not g.finished or not g.won:
        raise HTTPException(status_code=400, detail="Can only save scores for won games.")
    username = req.username.strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username cannot be empty.")

    score = g.calculate_score()
    database.save_score(username, score, g.word)
    return {"saved": True, "score": score, "username": username}

@app.get("/api/scores/leaderboard")
def leaderboard():
    """Return top 10 scores."""
    return database.get_leaderboard()

@app.get("/api/scores/user/{username}")
def user_best(username: str):
    """Return a specific user's best score."""
    entry = database.get_user_best(username)
    if not entry:
        return {"found": False}
    return {"found": True, **entry}

# ── Serve frontend ────────────────────────────────────────────────────────────

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def index():
    return FileResponse("static/index.html")