import random

WORDS = ["elephant", "algorithm", "cascade", "ninety", "fortune", "betrayal", "staged", "accident"]

def get_random_word() -> str:
    return random.choice(WORDS).upper()