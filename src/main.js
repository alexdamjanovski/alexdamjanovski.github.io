import { fetchGames } from "./db/games.js";
import {
  buildScoreId,
  submitScore,
  subscribeToScore,
  subscribeToScoresForGameDate,
} from "./db/scores.js";
import { fetchUsers } from "./db/users.js";
import {
  getActiveUser,
  getSelectedGame,
  getTodayInEastern,
  createInitialState,
  setActiveUserId,
  buildUsersById,
  toYYYYMMDD,
} from "./ui/state.js";
import {
  renderDatePicker,
  renderGameList,
  renderGroupBoard,
  renderPanelTitles,
  renderPersonalPanel,
  renderUserSelect,
  showToast,
  getDatePickerElement,
  getUserSelectElement,
} from "./ui/render.js";

const state = createInitialState();
let unsubscribePersonal = null;
let unsubscribeGroup = null;

function handleFirestoreError(error) {
  console.error(error);
  showToast(error.message || "Something went wrong.", true);
}

function renderAll() {
  const activeUser = getActiveUser(state);
  const game = getSelectedGame(state);

  renderUserSelect(state.users, state.activeUserId);
  renderGameList(state.games, state.selectedGameId, (gameId) => {
    state.selectedGameId = gameId;
    state.editing = false;
    attachListeners();
    renderAll();
  });
  renderDatePicker(state.selectedDate);
  renderPanelTitles({
    activeUser,
    game,
    dateISO: state.selectedDate,
  });
  renderPersonalPanel({
    state,
    activeUser,
    game,
    onSubmit: handleSubmit,
    onEdit: () => {
      state.editing = true;
      renderAll();
    },
    onCancelEdit: () => {
      state.editing = false;
      renderAll();
    },
  });
  renderGroupBoard({ state, users: state.users });
}

function attachListeners() {
  unsubscribePersonal?.();
  unsubscribeGroup?.();

  const activeUser = getActiveUser(state);
  const game = getSelectedGame(state);

  if (!activeUser || !game) {
    state.personalScore = null;
    state.groupScores = [];
    state.personalLoading = false;
    state.groupLoading = false;
    renderAll();
    return;
  }

  const date = toYYYYMMDD(state.selectedDate);
  const scoreId = buildScoreId(activeUser.name, game.gameTitle, date);

  state.personalLoading = true;
  state.groupLoading = true;
  renderAll();

  unsubscribePersonal = subscribeToScore(
    scoreId,
    (score) => {
      state.personalScore = score;
      state.personalLoading = false;
      renderAll();
    },
    handleFirestoreError
  );

  unsubscribeGroup = subscribeToScoresForGameDate(
    game.id,
    date,
    (scores) => {
      state.groupScores = scores;
      state.groupLoading = false;
      renderAll();
    },
    handleFirestoreError
  );
}

async function handleSubmit(scoreText) {
  const activeUser = getActiveUser(state);
  const game = getSelectedGame(state);

  if (!activeUser || !game) {
    showToast("Select a user and game first.", true);
    return;
  }

  const date = toYYYYMMDD(state.selectedDate);
  const scoreId = buildScoreId(activeUser.name, game.gameTitle, date);

  const existing = state.personalScore;
  if (existing && existing.userId !== state.activeUserId) {
    showToast("You can only edit your own score.", true);
    return;
  }

  try {
    await submitScore({
      scoreId,
      userId: activeUser.id,
      gameId: game.id,
      score: scoreText,
      date,
    });
    state.editing = false;
    showToast("Score saved!");
  } catch (error) {
    handleFirestoreError(error);
  }
}

async function init() {
  try {
    const [users, games] = await Promise.all([fetchUsers(), fetchGames()]);
    state.users = users;
    state.games = games;
    state.usersById = buildUsersById(users);

    if (!state.activeUserId || !state.usersById[state.activeUserId]) {
      setActiveUserId(state, "");
    }

    if (!state.selectedGameId && games.length > 0) {
      state.selectedGameId = games[0].id;
    }

    if (!state.selectedDate) {
      state.selectedDate = getTodayInEastern();
    }

    getUserSelectElement().addEventListener("change", (e) => {
      setActiveUserId(state, e.target.value);
      state.editing = false;
      attachListeners();
      renderAll();
    });

    getDatePickerElement().addEventListener("change", (e) => {
      state.selectedDate = e.target.value || getTodayInEastern();
      state.editing = false;
      attachListeners();
      renderAll();
    });

    attachListeners();
    renderAll();
  } catch (error) {
    handleFirestoreError(error);
  }
}

window.addEventListener("beforeunload", () => {
  unsubscribePersonal?.();
  unsubscribeGroup?.();
});

init();
