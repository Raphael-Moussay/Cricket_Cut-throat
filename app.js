const numbers = [20, 19, 18, 17, 16, 15, 25];
const numberLabels = {
  20: "20",
  19: "19",
  18: "18",
  17: "17",
  16: "16",
  15: "15",
  25: "Bull"
};

const app = document.getElementById("app");
const winModal = document.getElementById("winModal");
const winTitle = document.getElementById("winTitle");
const winSubtitle = document.getElementById("winSubtitle");
const winClose = document.getElementById("winClose");

const state = {
  players: [],
  history: [],
  gameActive: false
};

function createPlayer(id, initials) {
  const hits = {};
  numbers.forEach(n => { hits[n] = 0; });
  return { id, initials, score: 0, hits };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isClosed(player, num) {
  return player.hits[num] >= 3;
}

function isComplete(player) {
  return numbers.every(n => player.hits[n] >= 3);
}

function isNumberDead(num) {
  return state.players.length > 0 && state.players.every(p => isClosed(p, num));
}

function pushHistory() {
  state.history.push(deepClone({
    players: state.players,
    gameActive: state.gameActive
  }));
}

function undoLast() {
  if (state.history.length === 0) return;
  const prev = state.history.pop();
  state.players = prev.players;
  state.gameActive = prev.gameActive;
  renderGame();
}

function startGame(initialsList) {
  state.players = initialsList.map((ini, idx) => createPlayer(idx + 1, ini));
  state.history = [];
  state.gameActive = true;
  renderGame();
}

function handleHit(playerId, num) {
  if (!state.gameActive) return;
  if (isNumberDead(num)) return;

  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  const wasComplete = isComplete(player);
  const alreadyClosed = isClosed(player, num);

  pushHistory();

  if (!alreadyClosed) {
    player.hits[num] = Math.min(3, player.hits[num] + 1);
  } else {
    // Cut-throat: penalize players who have not closed this number.
    state.players.forEach(other => {
      if (other.id !== player.id && !isClosed(other, num)) {
        other.score += num;
      }
    });
  }

  const nowComplete = isComplete(player);
  if (!wasComplete && nowComplete) {
    // House rule: completion penalty for others who are not yet complete.
    state.players.forEach(other => {
      if (other.id !== player.id && !isComplete(other)) {
        other.score += 50;
      }
    });
  }

  renderGame();
  checkVictory();
}

function checkVictory() {
  const completed = state.players.filter(p => isComplete(p));
  if (completed.length === 0) return;

  const lowestScore = Math.min(...completed.map(p => p.score));
  const winners = completed.filter(p => p.score === lowestScore);
  if (winners.length === 0) return;

  const names = winners.map(p => p.initials).join(" & ");
  winTitle.textContent = names;
  winSubtitle.textContent = `Score le plus bas: ${lowestScore}`;
  winModal.classList.remove("hidden");
  winModal.classList.add("flex");
}

function renderStart() {
  state.gameActive = false;

  app.innerHTML = `
    <div class="mx-auto max-w-xl">
      <div class="panel rounded-3xl p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <div class="app-title text-3xl">Cricket Cut-throat</div>
            <p class="mt-1 text-sm text-slate-300">Tableau de bord mobile pour le mode Penalty.</p>
          </div>
          <div class="hidden sm:block rounded-2xl bg-amber-400/20 px-3 py-2 text-xs uppercase tracking-widest text-amber-200">Cut-throat</div>
        </div>

        <div class="mt-8 space-y-5">
          <div>
            <div class="step-tag">Etape 1</div>
            <label class="mt-2 block text-sm text-slate-300">Nombre de joueurs</label>
            <select id="playerCount" class="input-shell mt-2 w-full rounded-2xl px-4 py-3 text-lg">
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
            </select>
          </div>

          <div>
            <div class="step-tag">Etape 2</div>
            <label class="mt-2 block text-sm text-slate-300">Initiales des joueurs</label>
            <div id="playerInputs" class="mt-3 space-y-3"></div>
          </div>
        </div>

        <button id="startBtn" class="mt-8 w-full rounded-2xl bg-amber-400 px-4 py-4 text-lg font-bold text-slate-900 shadow-lg shadow-amber-400/20">Demarrer la partie</button>
      </div>
    </div>
  `;

  const playerCount = document.getElementById("playerCount");
  const playerInputs = document.getElementById("playerInputs");
  const startBtn = document.getElementById("startBtn");

  function renderInputs() {
    const count = Number(playerCount.value);
    playerInputs.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 3;
      input.placeholder = `Joueur ${i + 1} (3 lettres)`;
      input.className = "input-shell w-full rounded-2xl px-4 py-3 text-lg uppercase tracking-widest";
      playerInputs.appendChild(input);
    }
  }

  renderInputs();
  playerCount.addEventListener("change", renderInputs);

  startBtn.addEventListener("click", () => {
    const initials = Array.from(playerInputs.querySelectorAll("input")).map((input, index) => {
      const value = input.value.trim().toUpperCase().slice(0, 3);
      return value || `J${index + 1}`;
    });
    startGame(initials);
  });
}

function renderHitDots(hit, isCellClosed) {
  return [0, 1, 2].map(index => {
    const on = hit > index ? "on" : "";
    const closed = on && isCellClosed ? "closed" : "";
    return `<span class="hit-dot ${on} ${closed}"></span>`;
  }).join("");
}

function renderGame() {
  const colCount = state.players.length + 1;
  const gridStyle = `grid-template-columns: repeat(${colCount}, minmax(0, 1fr));`;

  const headers = state.players.map(p => `
    <div class="score-card text-center">
      <div class="text-xs uppercase tracking-widest text-slate-400">${p.initials}</div>
      <div class="text-2xl font-black text-amber-200">${p.score}</div>
    </div>
  `).join("");

  const rows = numbers.map(num => {
    const dead = isNumberDead(num);
    const playerCells = state.players.map(p => {
      const hit = p.hits[num];
      const closed = hit >= 3;
      const cellClass = [
        "hit-cell",
        closed ? "closed" : "",
        dead ? "dead" : ""
      ].join(" ");

      return `
        <button class="${cellClass}" data-player="${p.id}" data-number="${num}" aria-label="${p.initials} ${numberLabels[num]}">
          ${renderHitDots(hit, closed)}
        </button>
      `;
    }).join("");

    const pillClass = `number-pill ${dead ? "dead" : ""}`;

    return `
      <div class="grid gap-3 items-center" style="${gridStyle}">
        <div class="text-center">
          <div class="${pillClass}">${numberLabels[num]}</div>
        </div>
        ${playerCells}
      </div>
    `;
  }).join("");

  app.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <button id="newGameBtn" class="rounded-2xl bg-slate-800 px-4 py-2 text-sm">Nouvelle partie</button>
        <button id="undoBtn" class="rounded-2xl bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900">Annuler</button>
      </div>

      <div class="panel rounded-3xl p-4 shadow-xl">
        <div class="grid gap-3 items-center" style="${gridStyle}">
          <div></div>
          ${headers}
        </div>
        <div class="mt-4 space-y-3">
          ${rows}
        </div>
      </div>
    </div>
  `;

  document.getElementById("newGameBtn").addEventListener("click", () => {
    winModal.classList.add("hidden");
    winModal.classList.remove("flex");
    renderStart();
  });

  document.getElementById("undoBtn").addEventListener("click", undoLast);

  app.querySelectorAll("button[data-player]").forEach(btn => {
    btn.addEventListener("click", () => {
      const playerId = Number(btn.dataset.player);
      const num = Number(btn.dataset.number);
      handleHit(playerId, num);
    });
  });
}

winClose.addEventListener("click", () => {
  winModal.classList.add("hidden");
  winModal.classList.remove("flex");
});

renderStart();
