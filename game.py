import uuid
import time
from typing import Optional
from words import get_random_word

MAX_WRONG = 6

class HangmanGame:
    def __init__(self):
        self.game_id: str = str(uuid.uuid4())
        self.word: str = get_random_word()
        self.guessed_letters: set[str] = set()
        self.wrong_guesses: int = 0
        self.start_time: float = time.time()
        self.finished: bool = False
        self.won: bool = False

    @property
    def masked_word(self) -> str:
        return "".join(c if c in self.guessed_letters else "_" for c in self.word)

    @property
    def wrong_letters(self) -> list[str]:
        return sorted([l for l in self.guessed_letters if l not in self.word])

    @property
    def remaining_attempts(self) -> int:
        return MAX_WRONG - self.wrong_guesses

    def guess(self, letter: str) -> dict:
        letter = letter.upper()

        if self.finished:
            return {"error": "Game is already over."}
        if len(letter) != 1 or not letter.isalpha():
            return {"error": "Invalid guess. Single letters only."}
        if letter in self.guessed_letters:
            return {"error": f"You already guessed '{letter}'."}

        self.guessed_letters.add(letter)
        correct = letter in self.word

        if not correct:
            self.wrong_guesses += 1

        # Check win
        if all(c in self.guessed_letters for c in self.word):
            self.finished = True
            self.won = True

        # Check loss
        if self.wrong_guesses >= MAX_WRONG:
            self.finished = True
            self.won = False

        return self.state()

    def calculate_score(self) -> int:
        if not self.won:
            return 0
        elapsed = time.time() - self.start_time
        time_bonus = max(0, 300 - int(elapsed))           # up to 300 pts for speed
        length_bonus = len(self.word) * 10                 # 10 pts per letter
        accuracy_bonus = self.remaining_attempts * 20      # 20 pts per life remaining
        return time_bonus + length_bonus + accuracy_bonus

    def state(self) -> dict:
        return {
            "game_id": self.game_id,
            "masked_word": self.masked_word,
            "wrong_guesses": self.wrong_guesses,
            "wrong_letters": self.wrong_letters,
            "remaining_attempts": self.remaining_attempts,
            "max_wrong": MAX_WRONG,
            "guessed_letters": sorted(list(self.guessed_letters)),
            "finished": self.finished,
            "won": self.won,
            "word": self.word if self.finished else None,
            "score": self.calculate_score() if self.finished else None,
        }


# In-memory store of active games
_games: dict[str, HangmanGame] = {}

def create_game() -> HangmanGame:
    game = HangmanGame()
    _games[game.game_id] = game
    return game

def get_game(game_id: str) -> Optional[HangmanGame]:
    return _games.get(game_id)