import { fetchGames } from "./db/games.js";
import {
  buildScoreId,
  submitScore,
  subscribeToScore,
  subscribeToScoresForGameDate,
  subscribeToScoresSince,
} from "./db/scores.js";
import {
  MAX_COMMENT_LENGTH,
  submitComment,
  subscribeToCommentsForScoreIds,
} from "./db/comments.js";
import { fetchUsers } from "./db/users.js";
import {
  getActiveUser,
  getFeedCutoffDate,
  getSelectedGame,
  getTodayInEastern,
  createInitialState,
  setActiveTab,
  setActiveUserId,
  buildUsersById,
  toYYYYMMDD,
  TABS,
} from "./ui/state.js";
import { normalizeScoreEmojis } from "./ui/emoji.js";
import {
  renderDatePicker,
  renderFeed,
  renderGameList,
  renderGroupBoard,
  renderPanelTitles,
  renderPersonalPanel,
  renderTabs,
  renderUserSelect,
  showToast,
  getDatePickerElement,
  getUserSelectElement,
} from "./ui/render.js";
import "./styles.css";

const state = createInitialState();
let unsubscribePersonal = null;
let unsubscribeGroup = null;
let unsubscribeFeed = null;
let unsubscribeComments = null;
// Signature of the score IDs the comment listener currently covers, so an
// unrelated score snapshot doesn't tear it down and rebuild it.
let watchedCommentScoreIds = "";

function handleFirestoreError(error) {
  console.error(error);
  showToast(error.message || "Something went wrong.", true);
}

let commentErrorReported = false;

/**
 * Comment threads are a nice-to-have next to the scores themselves, and the
 * listener re-attaches on every tab and score change — so a persistent failure
 * (most likely rules that haven't been deployed yet) is reported once rather
 * than as a toast per attempt.
 */
function handleCommentError(error) {
  console.error(error);
  if (commentErrorReported) return;
  commentErrorReported = true;
  showToast("Comments are unavailable right now.", true);
}

function renderAll() {
  const activeUser = getActiveUser(state);
  const game = getSelectedGame(state);

  renderTabs(TABS, state.activeTab, (tabId) => {
    if (tabId === state.activeTab) return;
    setActiveTab(state, tabId);
    renderAll();
    attachListeners();
  });
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
  renderGroupBoard({
    state,
    users: state.users,
    onCommentDraftChange: handleCommentDraftChange,
    onCommentSubmit: handleCommentSubmit,
  });
  renderFeed({
    state,
    onCommentDraftChange: handleCommentDraftChange,
    onCommentSubmit: handleCommentSubmit,
  });
}

function attachListeners() {
  attachFeedListener();
  syncCommentListener();

  unsubscribePersonal?.();
  unsubscribeGroup?.();

  const activeUser = getActiveUser(state);
  const game = getSelectedGame(state);

  if (!activeUser || !game) {
    state.personalScore = null;
    state.groupScores = [];
    state.personalLoading = false;
    state.groupLoading = false;
    syncCommentListener();
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
      syncCommentListener();
      renderAll();
    },
    handleFirestoreError
  );
}

/**
 * The feed spans every game, so it needs its own listener. It is opened the
 * first time the feed tab is used and then kept for the rest of the session.
 */
function attachFeedListener() {
  if (unsubscribeFeed || state.activeTab !== "feed") return;

  state.feedLoading = true;
  unsubscribeFeed = subscribeToScoresSince(
    getFeedCutoffDate(),
    (scores) => {
      state.feedScores = scores;
      state.feedLoading = false;
      syncCommentListener();
      renderAll();
    },
    handleFirestoreError
  );
}

/** Points the comment listener at whichever scores the active tab shows. */
function syncCommentListener() {
  const scores = state.activeTab === "feed" ? state.feedScores : state.groupScores;
  const scoreIds = scores.map((score) => score.id);
  const signature = [...new Set(scoreIds)].sort().join("|");

  if (signature === watchedCommentScoreIds && unsubscribeComments) return;
  watchedCommentScoreIds = signature;

  unsubscribeComments?.();
  unsubscribeComments = subscribeToCommentsForScoreIds(
    scoreIds,
    (commentsByScoreId) => {
      state.commentsByScoreId = commentsByScoreId;
      renderAll();
    },
    handleCommentError
  );
}

function handleCommentDraftChange(scoreId, text) {
  // Kept out of the render cycle so typing doesn't rebuild the DOM; the draft
  // is read back whenever a snapshot forces a re-render.
  state.commentDrafts[scoreId] = text;
}

async function handleCommentSubmit(scoreId) {
  const activeUser = getActiveUser(state);
  if (!activeUser) {
    showToast("Select a user to leave a comment.", true);
    return;
  }

  const text = (state.commentDrafts[scoreId] ?? "").trim();
  if (!text) return;

  if (text.length > MAX_COMMENT_LENGTH) {
    showToast(`Comments are limited to ${MAX_COMMENT_LENGTH} characters.`, true);
    return;
  }

  state.commentPending[scoreId] = true;
  renderAll();

  try {
    await submitComment({ scoreId, userId: activeUser.id, text });
    state.commentDrafts[scoreId] = "";
  } catch (error) {
    handleFirestoreError(error);
  } finally {
    delete state.commentPending[scoreId];
    renderAll();
  }
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
      score: normalizeScoreEmojis(scoreText),
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
  unsubscribeFeed?.();
  unsubscribeComments?.();
});

init();
