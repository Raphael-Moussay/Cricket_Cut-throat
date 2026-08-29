/**
 * Target numbers scored in the Cricket game.
 * @type {ReadonlyArray<number>}
 */
const TARGET_NUMBERS = Object.freeze([20, 19, 18, 17, 16, 15, 25]);

/**
 * Display labels for each target number.
 * @type {Readonly<Record<number, string>>}
 */
const TARGET_LABELS = Object.freeze({
  20: "20",
  19: "19",
  18: "18",
  17: "17",
  16: "16",
  15: "15",
  25: "Bull"
});

/** Minimum number of players required to start a game. */
const MIN_REQUIRED_PLAYERS = 2;

/** Initial number of player input rows shown on the setup screen. */
const INITIAL_PLAYER_INPUT_COUNT = 2;

/** Maximum character length for player initials. */
const MAX_INITIALS_LENGTH = 3;

/** Number of hits required to close a target number. */
const HITS_TO_CLOSE = 3;

/** Points awarded/penalized for standard Shanghai. */
const SHANGHAI_POINTS_STANDARD = 50;

/** Points awarded/penalized for alternative (shifted) Shanghai. */
const SHANGHAI_POINTS_ALT = 25;

/** Penalty points inflicted on unfinished opponents when a player completes the grid. */
const GRID_COMPLETION_BONUS_PENALTY = 50;

/** Maximum number of history entries displayed in condensed view. */
const MAX_CONDENSED_HISTORY_COUNT = 30;

/** Duration in milliseconds for score and hit cell flash animations. */
const FLASH_ANIMATION_DURATION_MS = 900;

/** CSS column width for the frozen targets column. */
const GRID_TARGET_COLUMN_WIDTH = "56px";

/** CSS minimum column width for each player column. */
const GRID_PLAYER_COLUMN_MIN_WIDTH = "70px";

/** @type {HTMLElement} Main application container */
const app = document.getElementById("app");
/** @type {HTMLElement} Victory modal backdrop container */
const winModal = document.getElementById("winModal");
/** @type {HTMLElement} Victory modal title element */
const winTitle = document.getElementById("winTitle");
/** @type {HTMLElement} Victory modal subtitle element */
const winSubtitle = document.getElementById("winSubtitle");
/** @type {HTMLElement} Victory modal ranking list container */
const winRanking = document.getElementById("winRanking");
/** @type {HTMLElement} Victory modal close button */
const winClose = document.getElementById("winClose");

/**
 * @typedef {Object} Player
 * @property {number} id - Unique identifier for the player.
 * @property {string} initials - Player initials (up to 3 uppercase characters).
 * @property {number} score - Current penalty score of the player.
 * @property {Record<number, number>} hits - Number of hits recorded per target number.
 */

/**
 * @typedef {Object} ActionLogEntry
 * @property {string} message - Description of the action.
 * @property {string} time - Formatted timestamp (HH:MM).
 */

/**
 * @typedef {Object} FlashCell
 * @property {number} playerId - Identifier of the penalized player.
 * @property {number} num - Target number associated with the penalty.
 */

/**
 * @typedef {Object} GameState
 * @property {Player[]} players - Active players in the match.
 * @property {Array<Object>} history - Undo stack storing previous state snapshots.
 * @property {boolean} gameActive - Flag indicating if a game is currently in progress.
 * @property {ActionLogEntry[]} actionLog - Chronological log of game events.
 * @property {boolean} showHistory - Visibility toggle for the action history drawer.
 * @property {boolean} showAllHistory - Toggle to display all or condensed history items.
 * @property {FlashCell[]} flashCells - List of cells scheduled for penalty flash animation.
 * @property {number[]} flashScores - List of player IDs whose score cards should flash.
 */

/** @type {GameState} Central reactive application state */
const state = {
  players: [],
  history: [],
  gameActive: false,
  actionLog: [],
  showHistory: false,
  showAllHistory: false,
  flashCells: [],
  flashScores: []
};

/**
 * Creates and initializes a new Player object.
 * @param {number} id - Unique player identifier.
 * @param {string} initials - Player initials.
 * @returns {Player} Newly instantiated player object.
 */
function createPlayer(id, initials) {
  const hits = {};
  TARGET_NUMBERS.forEach(n => { hits[n] = 0; });
  return { id, initials, score: 0, hits };
}

/**
 * Creates a deep clone of a serializable object.
 * @template T
 * @param {T} obj - Object to clone.
 * @returns {T} Cloned copy of the object.
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Determines whether a player has closed a specific target number.
 * @param {Player} player - Player to inspect.
 * @param {number} targetNumber - Target number to check.
 * @returns {boolean} True if the player hit the target 3 or more times.
 */
function isClosed(player, targetNumber) {
  return (player.hits[targetNumber] || 0) >= HITS_TO_CLOSE;
}

/**
 * Determines whether a player has closed all target numbers on the board.
 * @param {Player} player - Player to inspect.
 * @returns {boolean} True if all target numbers are closed.
 */
function isComplete(player) {
  return TARGET_NUMBERS.every(n => isClosed(player, n));
}

/**
 * Determines whether a target number is closed by all active players ("dead").
 * @param {number} targetNumber - Target number to check.
 * @returns {boolean} True if all players have closed this target number.
 */
function isNumberDead(targetNumber) {
  return state.players.length > 0 && state.players.every(p => isClosed(p, targetNumber));
}

/**
 * Saves a snapshot of current game state onto the history stack for undo operations.
 * @returns {void}
 */
function pushHistory() {
  state.history.push(deepClone({
    players: state.players,
    gameActive: state.gameActive,
    actionLog: state.actionLog,
    showHistory: state.showHistory,
    showAllHistory: state.showAllHistory
  }));
}

/**
 * Restores the previous game state from the undo history stack.
 * @returns {void}
 */
function undoLast() {
  if (state.history.length === 0) return;
  const previousState = state.history.pop();
  state.players = previousState.players;
  state.gameActive = previousState.gameActive;
  state.actionLog = previousState.actionLog || [];
  state.showHistory = Boolean(previousState.showHistory);
  state.showAllHistory = Boolean(previousState.showAllHistory);
  renderGame();
}

/**
 * Initializes and starts a new game with the given list of player initials.
 * @param {string[]} initialsList - Array of player initials.
 * @returns {void}
 */
function startGame(initialsList) {
  state.players = initialsList.map((initials, index) => createPlayer(index + 1, initials));
  state.history = [];
  state.gameActive = true;
  state.actionLog = [];
  state.showHistory = false;
  state.showAllHistory = false;
  state.flashCells = [];
  state.flashScores = [];
  renderGame();
}

/**
 * Adds a new entry to the action log with the current timestamp.
 * @param {string} message - Action message description.
 * @returns {void}
 */
function addLog(message) {
  state.actionLog.unshift({
    message,
    time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  });
}

/**
 * Applies Shanghai penalty points to all opponents of a given player.
 * @param {number} playerId - Identifier of the scoring player.
 * @param {number} points - Penalty points to inflict on each opponent.
 * @param {string} label - Display label for the Shanghai event.
 * @returns {void}
 */
function applyShanghai(playerId, points, label) {
  if (!state.gameActive) return;

  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  pushHistory();

  const targetNames = [];
  state.players.forEach(otherPlayer => {
    if (otherPlayer.id !== player.id) {
      otherPlayer.score += points;
      targetNames.push(otherPlayer.initials);
      state.flashScores.push(otherPlayer.id);
    }
  });

  if (targetNames.length > 0) {
    addLog(`${player.initials} ${label}: +${points} a ${targetNames.join(", ")}`);
  }

  renderGame();
  checkVictory();
}

/**
 * Handles a dart hit event for a specific player on a target number.
 * Implements Cut-throat rules: if closed, scores penalty on opponents who have not closed it.
 * @param {number} playerId - Identifier of the player registering the hit.
 * @param {number} targetNumber - Hit target number.
 * @returns {void}
 */
function handleHit(playerId, targetNumber) {
  if (!state.gameActive) return;
  if (isNumberDead(targetNumber)) return;

  const player = state.players.find(p => p.id === playerId);
  if (!player) return;

  const wasComplete = isComplete(player);
  const alreadyClosed = isClosed(player, targetNumber);

  pushHistory();

  if (!alreadyClosed) {
    const nextHit = Math.min(HITS_TO_CLOSE, player.hits[targetNumber] + 1);
    player.hits[targetNumber] = nextHit;
    addLog(`${player.initials} touche ${TARGET_LABELS[targetNumber]} (${nextHit}/${HITS_TO_CLOSE})`);
  } else {
    // Cut-throat rule: penalize opponents who have not closed this target
    const targetNames = [];
    state.players.forEach(otherPlayer => {
      if (otherPlayer.id !== player.id && !isClosed(otherPlayer, targetNumber)) {
        otherPlayer.score += targetNumber;
        targetNames.push(otherPlayer.initials);
        state.flashCells.push({ playerId: otherPlayer.id, num: targetNumber });
      }
    });
    if (targetNames.length > 0) {
      addLog(`${player.initials} penalise ${targetNames.join(", ")} +${targetNumber}`);
    }
  }

  const nowComplete = isComplete(player);
  if (!wasComplete && nowComplete) {
    // House rule: completion penalty for all opponents who have not finished their grid
    const unfinishedOpponents = [];
    state.players.forEach(otherPlayer => {
      if (otherPlayer.id !== player.id && !isComplete(otherPlayer)) {
        otherPlayer.score += GRID_COMPLETION_BONUS_PENALTY;
        unfinishedOpponents.push(otherPlayer.initials);
        state.flashScores.push(otherPlayer.id);
      }
    });
    if (unfinishedOpponents.length > 0) {
      addLog(`${player.initials} complete la grille: +${GRID_COMPLETION_BONUS_PENALTY} a ${unfinishedOpponents.join(", ")}`);
    }
  }

  renderGame();
  checkVictory();
}

/**
 * Checks if the game has ended by verifying if any player has completed all targets.
 * In Cut-throat Cricket, the winner is the player who completed all targets with the lowest score.
 * @returns {void}
 */
function checkVictory() {
  const completedPlayers = state.players.filter(p => isComplete(p));
  if (completedPlayers.length === 0) return;

  state.gameActive = false;

  const lowestScore = Math.min(...state.players.map(p => p.score));
  const winners = state.players.filter(p => p.score === lowestScore);
  if (winners.length === 0) return;

  const winnerNames = winners.map(p => p.initials).join(" & ");
  winTitle.textContent = winnerNames;
  winSubtitle.textContent = `Score le plus bas: ${lowestScore}`;

  const ranking = [...state.players].sort((playerA, playerB) => playerA.score - playerB.score);
  winRanking.innerHTML = ranking.map((player, index) => `
    <div class="ranking-row">
      <div class="ranking-rank">${index + 1}</div>
      <div class="ranking-name">${player.initials}</div>
      <div class="ranking-score">${player.score}</div>
    </div>
  `).join("");

  winModal.classList.remove("hidden");
  winModal.classList.add("flex");
}

/**
 * Generates the HTML string representing the 3 hit indicator dots for a target cell.
 * @param {number} hitCount - Number of registered hits (0 to 3).
 * @param {boolean} isCellClosed - Whether the cell is fully closed (3 hits).
 * @returns {string} HTML markup for hit dots.
 */
function renderHitDots(hitCount, isCellClosed) {
  return [0, 1, 2].map(dotIndex => {
    const onClass = hitCount > dotIndex ? "on" : "";
    const closedClass = onClass && isCellClosed ? "closed" : "";
    return `<span class="hit-dot ${onClass} ${closedClass}"></span>`;
  }).join("");
}

/**
 * Renders the start/setup screen with progressive dynamic player inputs.
 * @returns {void}
 */
function renderStart() {
  state.gameActive = false;

  app.innerHTML = `
    <div class="mx-auto max-w-xl">
      <div class="panel rounded-3xl p-6 shadow-2xl">
        <div class="flex items-center justify-between">
          <div>
            <div class="app-title text-2xl sm:text-3xl text-white">Cricket Cut-throat</div>
            <p class="mt-1 text-xs sm:text-sm text-slate-400">Mode Penalty officiel • Arbitrage de précision</p>
          </div>
          <div class="hidden sm:block rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 text-xs font-chakra font-bold uppercase tracking-widest text-emerald-400">Cut-throat Pro</div>
        </div>

        <div class="mt-8 space-y-5">
          <div>
            <div class="step-tag">Joueurs</div>
            <label class="mt-2 block text-xs uppercase tracking-wider font-semibold text-slate-400">Initiales des participants</label>
            <div id="playerInputsList" class="mt-3 space-y-3"></div>
          </div>
        </div>

        <button id="startBtn" class="mt-8 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-4 text-base sm:text-lg font-chakra font-bold uppercase tracking-wider text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.99] transition-all">Démarrer la partie</button>
      </div>
    </div>
  `;

  const playerInputsList = document.getElementById("playerInputsList");
  const startBtn = document.getElementById("startBtn");

  /**
   * Refreshes placeholders and button visibility for all player rows.
   * @returns {void}
   */
  function refreshInputPlaceholders() {
    const rows = Array.from(playerInputsList.querySelectorAll(".player-input-row"));
    rows.forEach((row, index) => {
      const input = row.querySelector("input");
      const removeBtn = row.querySelector(".player-remove-btn");
      if (input) {
        input.placeholder = `Joueur ${index + 1} (3 lettres)`;
        input.dataset.index = String(index);
      }
      if (removeBtn) {
        removeBtn.style.display = rows.length > MIN_REQUIRED_PLAYERS ? "flex" : "none";
      }
    });
  }

  /**
   * Creates a new DOM row element for entering player initials.
   * @param {string} [initialValue=""] - Initial text value.
   * @returns {HTMLDivElement} Configured player input row element.
   */
  function createInputRow(initialValue = "") {
    const row = document.createElement("div");
    row.className = "player-input-row w-full";

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = MAX_INITIALS_LENGTH;
    input.value = initialValue;
    input.className = "input-shell flex-1 min-w-0 rounded-2xl px-4 py-3 text-lg uppercase tracking-widest text-white";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "player-remove-btn";
    removeBtn.title = "Supprimer ce joueur";
    removeBtn.setAttribute("aria-label", "Supprimer le joueur");
    removeBtn.textContent = "×";

    removeBtn.addEventListener("click", () => {
      const currentRows = playerInputsList.querySelectorAll(".player-input-row");
      if (currentRows.length > MIN_REQUIRED_PLAYERS) {
        row.remove();
        refreshInputPlaceholders();
        ensureTrailingEmptyInput();
      }
    });

    row.appendChild(input);
    row.appendChild(removeBtn);
    return row;
  }

  /**
   * Ensures that a single trailing empty input is available when the last input has content,
   * and trims excess empty inputs if deleted.
   * @returns {void}
   */
  function ensureTrailingEmptyInput() {
    const inputs = Array.from(playerInputsList.querySelectorAll("input"));
    if (inputs.length === 0) return;

    const lastInput = inputs[inputs.length - 1];
    if (lastInput.value.trim().length > 0) {
      const newRow = createInputRow();
      playerInputsList.appendChild(newRow);
      refreshInputPlaceholders();
    } else if (inputs.length > MIN_REQUIRED_PLAYERS) {
      const secondLastInput = inputs[inputs.length - 2];
      if (secondLastInput && secondLastInput.value.trim().length === 0 && lastInput.value.trim().length === 0) {
        lastInput.closest(".player-input-row")?.remove();
        refreshInputPlaceholders();
      }
    }
  }

  // Populate initial rows
  for (let i = 0; i < INITIAL_PLAYER_INPUT_COUNT; i += 1) {
    playerInputsList.appendChild(createInputRow());
  }
  refreshInputPlaceholders();

  // Listen to input changes
  playerInputsList.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      target.value = target.value.toUpperCase();
      ensureTrailingEmptyInput();
    }
  });

  // Handle Enter key for fast keyboard input
  playerInputsList.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const target = event.target;
      if (target instanceof HTMLInputElement) {
        const inputs = Array.from(playerInputsList.querySelectorAll("input"));
        const currentIndex = inputs.indexOf(target);
        if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
        } else {
          startBtn.click();
        }
      }
    }
  });

  // Start game click handler
  startBtn.addEventListener("click", () => {
    const inputs = Array.from(playerInputsList.querySelectorAll("input"));
    const enteredInitials = inputs
      .map(input => input.value.trim().toUpperCase().slice(0, MAX_INITIALS_LENGTH))
      .filter(val => val.length > 0);

    let finalInitials = enteredInitials;
    if (finalInitials.length < MIN_REQUIRED_PLAYERS) {
      finalInitials = inputs.map((input, idx) => {
        const val = input.value.trim().toUpperCase().slice(0, MAX_INITIALS_LENGTH);
        return val || `J${idx + 1}`;
      }).slice(0, Math.max(MIN_REQUIRED_PLAYERS, inputs.length > MIN_REQUIRED_PLAYERS ? inputs.length - 1 : inputs.length));

      while (finalInitials.length < MIN_REQUIRED_PLAYERS) {
        finalInitials.push(`J${finalInitials.length + 1}`);
      }
    }

    startGame(finalInitials);
  });
}

/**
 * Renders the main scoreboard screen with frozen target column and horizontal scrolling.
 * @returns {void}
 */
function renderGame() {
  const previousScrollContainer = app.querySelector(".board-scroll-container");
  const previousScrollLeft = previousScrollContainer ? previousScrollContainer.scrollLeft : 0;

  const visibleHistory = state.showAllHistory
    ? state.actionLog
    : state.actionLog.slice(0, MAX_CONDENSED_HISTORY_COUNT);

  const playerCount = state.players.length;
  const gridStyle = `grid-template-columns: ${GRID_TARGET_COLUMN_WIDTH} repeat(${playerCount}, minmax(${GRID_PLAYER_COLUMN_MIN_WIDTH}, 1fr));`;

  const headers = state.players.map(p => `
    <div class="score-card text-center">
      <div class="player-initials" title="${p.initials}">${p.initials}</div>
      <div class="text-2xl font-black text-amber-200 score-value" data-score="${p.id}">${p.score}</div>
      <div class="mt-3 space-y-2">
        <button class="shanghai-btn" data-shanghai="${SHANGHAI_POINTS_STANDARD}" data-player="${p.id}">
          <span>SHA</span>
          <span>+${SHANGHAI_POINTS_STANDARD}</span>
        </button>
        <button class="shanghai-btn shanghai-alt" data-shanghai="${SHANGHAI_POINTS_ALT}" data-player="${p.id}">
          <span>SHA</span>
          <span class="shanghai-break">DEC <span class="shanghai-num">+${SHANGHAI_POINTS_ALT}</span></span>
        </button>
      </div>
    </div>
  `).join("");

  const rows = TARGET_NUMBERS.map(num => {
    const dead = isNumberDead(num);
    const playerCells = state.players.map(p => {
      const hit = p.hits[num];
      const closed = hit >= HITS_TO_CLOSE;
      const shouldFlash = state.flashCells.some(flash => flash.playerId === p.id && flash.num === num);
      const cellClass = [
        "hit-cell",
        closed ? "closed" : "",
        dead ? "dead" : "",
        shouldFlash ? "penalty-flash" : ""
      ].filter(Boolean).join(" ");

      return `
        <button class="${cellClass}" data-player="${p.id}" data-number="${num}" aria-label="${p.initials} ${TARGET_LABELS[num]}">
          ${renderHitDots(hit, closed)}
        </button>
      `;
    }).join("");

    const pillClass = `number-pill ${dead ? "dead" : ""}`;

    return `
      <div class="sticky-col">
        <div class="${pillClass}">${TARGET_LABELS[num]}</div>
      </div>
      ${playerCells}
    `;
  }).join("");

  app.innerHTML = `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <button id="newGameBtn" class="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-chakra uppercase font-bold text-slate-300 hover:bg-white/10 hover:text-white active:scale-95 transition-all">Nouvelle partie</button>
        <div class="flex items-center gap-2">
          <button id="historyBtn" class="rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-chakra uppercase font-bold text-slate-300 hover:bg-white/10 hover:text-white active:scale-95 transition-all">Historique</button>
          <button id="undoBtn" class="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-chakra uppercase font-bold text-slate-950 shadow-md shadow-amber-400/20 hover:brightness-110 active:scale-95 transition-all">Annuler</button>
        </div>
      </div>

      <div class="panel rounded-3xl p-4 shadow-xl ${state.showHistory ? "" : "hidden"}" id="historyPanel">
        <div class="flex items-center justify-between">
          <div class="text-xs uppercase tracking-widest text-slate-400">Derniers coups</div>
          <button id="historyToggleBtn" class="history-toggle">${state.showAllHistory ? "Voir moins" : "Tout afficher"}</button>
        </div>
        <div class="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
          ${state.actionLog.length === 0 ? "<div class=\"text-sm text-slate-400\">Aucune action pour le moment.</div>" : visibleHistory.map(entry => `
            <div class="history-row">
              <div class="history-time">${entry.time}</div>
              <div class="history-text">${entry.message}</div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="panel rounded-3xl p-4 shadow-xl">
        <div class="board-scroll-container">
          <div class="board-grid" style="${gridStyle}">
            <div class="sticky-col header-corner"></div>
            ${headers}
            ${rows}
          </div>
        </div>
      </div>
    </div>
  `;

  // Restore horizontal scroll position
  const currentScrollContainer = app.querySelector(".board-scroll-container");
  if (currentScrollContainer && previousScrollLeft > 0) {
    currentScrollContainer.scrollLeft = previousScrollLeft;
  }

  document.getElementById("newGameBtn").addEventListener("click", () => {
    winModal.classList.add("hidden");
    winModal.classList.remove("flex");
    renderStart();
  });

  document.getElementById("undoBtn").addEventListener("click", undoLast);

  document.getElementById("historyBtn").addEventListener("click", () => {
    state.showHistory = !state.showHistory;
    renderGame();
  });

  const historyToggle = document.getElementById("historyToggleBtn");
  if (historyToggle) {
    historyToggle.addEventListener("click", () => {
      state.showAllHistory = !state.showAllHistory;
      renderGame();
    });
  }

  app.querySelectorAll("button[data-player]").forEach(btn => {
    if (btn.dataset.number) {
      btn.addEventListener("click", () => {
        const playerId = Number(btn.dataset.player);
        const num = Number(btn.dataset.number);
        handleHit(playerId, num);
      });
    }
  });

  app.querySelectorAll("button[data-shanghai]").forEach(btn => {
    btn.addEventListener("click", () => {
      const playerId = Number(btn.dataset.player);
      const points = Number(btn.dataset.shanghai);
      const label = points === SHANGHAI_POINTS_STANDARD ? "Shangai" : "Shangai decale";
      applyShanghai(playerId, points, label);
    });
  });

  if (state.flashScores.length > 0) {
    state.flashScores.forEach(id => {
      const target = app.querySelector(`.score-value[data-score="${id}"]`);
      if (target) target.classList.add("score-flash");
    });
    setTimeout(() => {
      app.querySelectorAll(".score-flash").forEach(node => node.classList.remove("score-flash"));
    }, FLASH_ANIMATION_DURATION_MS);
    state.flashScores = [];
  }

  if (state.flashCells.length > 0) {
    setTimeout(() => {
      app.querySelectorAll(".penalty-flash").forEach(node => node.classList.remove("penalty-flash"));
    }, FLASH_ANIMATION_DURATION_MS);
    state.flashCells = [];
  }
}

winClose.addEventListener("click", () => {
  winModal.classList.add("hidden");
  winModal.classList.remove("flex");
});

// Initial boot
renderStart();

