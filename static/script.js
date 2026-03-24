// ── State ──────────────────────────────────────────────────────────────────
let gameId = null;

const BODY_PARTS = ["part-head", "part-body", "part-arm-l", "part-arm-r", "part-leg-l", "part-leg-r"];

// ── Screen helpers ─────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ── API helpers ────────────────────────────────────────────────────────────
async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Start ──────────────────────────────────────────────────────────────────
document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-play-again").addEventListener("click", startGame);
document.getElementById("btn-to-board").addEventListener("click", () => { loadLeaderboard(); showScreen("screen-board"); });
document.getElementById("btn-to-board-result").addEventListener("click", () => { loadLeaderboard(); showScreen("screen-board"); });
document.getElementById("btn-back").addEventListener("click", () => showScreen("screen-start"));

async function startGame() {
  try {
    const state = await api("/api/game/new", "POST");
    gameId = state.game_id;
    renderGame(state);
    showScreen("screen-game");
  } catch (e) {
    alert("Could not start game: " + e.message);
  }
}

// ── Render game state ──────────────────────────────────────────────────────
function renderGame(state) {
  // Gallows parts
  BODY_PARTS.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.toggle("visible", i < state.wrong_guesses);
  });

  // Attempts label
  const label = document.getElementById("attempts-label");
  label.textContent = `${state.remaining_attempts} attempt${state.remaining_attempts !== 1 ? "s" : ""} left`;
  label.style.color = state.remaining_attempts <= 2 ? "var(--danger)" : "var(--muted)";

  // Word display
  const wordEl = document.getElementById("word-display");
  wordEl.innerHTML = "";
  state.masked_word.split("").forEach((ch) => {
    const div = document.createElement("div");
    div.className = "word-letter";
    const span = document.createElement("span");
    if (ch !== "_") {
      span.textContent = ch;
      span.className = "revealed";
    } else {
      span.textContent = "\u00A0"; // non-breaking space keeps height
    }
    div.appendChild(span);
    wordEl.appendChild(div);
  });

  // Wrong letters
  const wrongEl = document.getElementById("wrong-letters");
  wrongEl.textContent = state.wrong_letters.length
    ? "Wrong: " + state.wrong_letters.join("  ")
    : "";

  // Keyboard
  const kbd = document.getElementById("keyboard");
  kbd.innerHTML = "";
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    const btn = document.createElement("button");
    btn.className = "key";
    btn.textContent = letter;
    btn.dataset.letter = letter;

    if (state.guessed_letters.includes(letter)) {
      btn.disabled = true;
      btn.classList.add(state.wrong_letters.includes(letter) ? "wrong" : "correct");
    } else {
      btn.addEventListener("click", () => submitGuess(letter));
    }
    kbd.appendChild(btn);
  }

  // Clear msg
  setMsg("");
}

// ── Guess ──────────────────────────────────────────────────────────────────
async function submitGuess(letter) {
  try {
    const state = await api("/api/game/guess", "POST", { game_id: gameId, letter });
    renderGame(state);
    if (state.finished) setTimeout(() => showResult(state), 400);
  } catch (e) {
    setMsg(e.message);
  }
}

function setMsg(text) {
  const el = document.getElementById("msg-area");
  el.textContent = text;
  el.classList.toggle("hidden", !text);
}

// ── Keyboard support ───────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  const screen = document.querySelector(".screen.active");
  if (!screen || screen.id !== "screen-game") return;
  const letter = e.key.toUpperCase();
  if (/^[A-Z]$/.test(letter)) {
    const btn = document.querySelector(`.key[data-letter="${letter}"]:not(:disabled)`);
    if (btn) btn.click();
  }
});

// ── Result screen ──────────────────────────────────────────────────────────
function showResult(state) {
  document.getElementById("result-icon").textContent  = state.won ? "🎉" : "💀";
  document.getElementById("result-title").textContent = state.won ? "You won!" : "Game over";
  document.getElementById("result-word").textContent  = `The word was: ${state.word}`;

  const scoreBadge = document.getElementById("result-score");
  const saveForm   = document.getElementById("save-score-form");
  const saveConf   = document.getElementById("save-confirmation");

  saveConf.classList.add("hidden");
  saveConf.textContent = "";

  if (state.won) {
    scoreBadge.textContent = `${state.score} pts`;
    scoreBadge.classList.remove("hidden");
    saveForm.classList.remove("hidden");
    document.getElementById("username-input").value = "";
  } else {
    scoreBadge.classList.add("hidden");
    saveForm.classList.add("hidden");
  }

  showScreen("screen-result");
}

// ── Save score ─────────────────────────────────────────────────────────────
document.getElementById("btn-save").addEventListener("click", async () => {
  const username = document.getElementById("username-input").value.trim();
  if (!username) {
    document.getElementById("username-input").focus();
    return;
  }
  try {
    const res = await api("/api/scores/save", "POST", { game_id: gameId, username });
    document.getElementById("save-score-form").classList.add("hidden");
    const conf = document.getElementById("save-confirmation");
    conf.textContent = `✓ Score saved for ${res.username}`;
    conf.classList.remove("hidden");
  } catch (e) {
    alert("Could not save score: " + e.message);
  }
});

// allow Enter key in username input
document.getElementById("username-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("btn-save").click();
});

// ── Leaderboard ────────────────────────────────────────────────────────────
async function loadLeaderboard() {
  const listEl = document.getElementById("board-list");
  listEl.innerHTML = `<p class="board-empty">Loading…</p>`;
  try {
    const rows = await api("/api/scores/leaderboard");
    if (!rows.length) {
      listEl.innerHTML = `<p class="board-empty">No scores yet. Be the first!</p>`;
      return;
    }
    listEl.innerHTML = "";
    rows.forEach((row, i) => {
      const div = document.createElement("div");
      div.className = "board-row";
      const ts = new Date(row.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      div.innerHTML = `
        <span class="board-rank">${i + 1}</span>
        <span class="board-name">${escHtml(row.username)}</span>
        <span class="board-word">${escHtml(row.word)}</span>
        <span class="board-score">${row.score}</span>
      `;
      listEl.appendChild(div);
    });
  } catch (e) {
    listEl.innerHTML = `<p class="board-empty">Could not load scores.</p>`;
  }
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}