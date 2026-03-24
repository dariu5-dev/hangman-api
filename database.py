import sqlite3
from datetime import datetime

DB_PATH = "hangman.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                username  TEXT    NOT NULL,
                score     INTEGER NOT NULL,
                word      TEXT    NOT NULL,
                timestamp TEXT    NOT NULL
            )
        """)
        conn.commit()

def save_score(username: str, score: int, word: str):
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO scores (username, score, word, timestamp) VALUES (?, ?, ?, ?)",
            (username.strip(), score, word, datetime.utcnow().isoformat())
        )
        conn.commit()

def get_leaderboard(limit: int = 10) -> list[dict]:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            """
            SELECT username, score, word, timestamp
            FROM scores
            ORDER BY score DESC
            LIMIT ?
            """,
            (limit,)
        ).fetchall()
    return [dict(r) for r in rows]

def get_user_best(username: str) -> dict | None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT username, score, word, timestamp FROM scores WHERE username = ? ORDER BY score DESC LIMIT 1",
            (username.strip(),)
        ).fetchone()
    return dict(row) if row else None