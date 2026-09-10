import { fromYYYYMMDD, FEED_WINDOW_DAYS } from "./state.js";
import { normalizeScoreEmojis } from "./emoji.js";
import { MAX_COMMENT_LENGTH } from "../db/comments.js";

const els = {
  userSelect: () => document.getElementById("user-select"),
  tabBar: () => document.getElementById("tab-bar"),
  feedPanelTitle: () => document.getElementById("feed-panel-title"),
  feed: () => document.getElementById("feed"),
  activeUserBanner: () => document.getElementById("active-user-banner"),
  gameList: () => document.getElementById("game-list"),
  datePicker: () => document.getElementById("date-picker"),
  personalPanelTitle: () => document.getElementById("personal-panel-title"),
  personalPanel: () => document.getElementById("personal-panel"),
  groupPanelTitle: () => document.getElementById("group-panel-title"),
  groupBoard: () => document.getElementById("group-board"),
  toast: () => document.getElementById("toast"),
};

let toastTimeout = null;

export function showToast(message, isError = false) {
  const toast = els.toast();
  toast.textContent = message;
  toast.classList.toggle("toast-error", isError);
  toast.hidden = false;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.hidden = true;
  }, 4000);
}

export function renderTabs(tabs, activeTabId, onSelect) {
  const bar = els.tabBar();
  bar.innerHTML = "";

  for (const tab of tabs) {
    const isActive = tab.id === activeTabId;

    const button = document.createElement("button");
    button.type = "button";
    button.id = `tab-btn-${tab.id}`;
    button.className = "tab";
    button.classList.toggle("active", isActive);
    button.textContent = tab.label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(isActive));
    button.setAttribute("aria-controls", `tab-${tab.id}`);
    button.addEventListener("click", () => onSelect(tab.id));
    bar.appendChild(button);

    const panel = document.getElementById(`tab-${tab.id}`);
    if (panel) panel.hidden = !isActive;
  }
}

export function renderUserSelect(users, activeUserId) {
  const select = els.userSelect();
  select.innerHTML = '<option value="">Select a user…</option>';
  for (const user of users) {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = user.name;
    if (user.id === activeUserId) option.selected = true;
    select.appendChild(option);
  }

  const activeUser = users.find((u) => u.id === activeUserId);
  const banner = els.activeUserBanner();
  if (activeUser) {
    banner.textContent = `Posting as: ${activeUser.name}`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

export function renderGameList(games, selectedGameId, onSelect) {
  const container = els.gameList();
  container.innerHTML = "";

  for (const game of games) {
    const pill = document.createElement("div");
    pill.className = "game-pill";
    if (game.id === selectedGameId) pill.classList.add("active");

    const selectBtn = document.createElement("button");
    selectBtn.type = "button";
    selectBtn.className = "game-pill-select";
    selectBtn.textContent = game.gameTitle;
    selectBtn.addEventListener("click", () => onSelect(game.id));

    pill.appendChild(selectBtn);

    if (game.URL) {
      const link = document.createElement("a");
      link.className = "game-pill-link";
      link.href = game.URL;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.title = `Open ${game.gameTitle}`;
      link.setAttribute("aria-label", `Open ${game.gameTitle}`);
      link.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
      pill.appendChild(link);
    }

    container.appendChild(pill);
  }
}

export function renderDatePicker(dateISO) {
  els.datePicker().value = dateISO;
}

export function renderPanelTitles({ activeUser, game, dateISO }) {
  const gameTitle = game?.gameTitle ?? "Game";
  const userName = activeUser?.name ?? "User";
  els.personalPanelTitle().textContent = `${userName} — ${gameTitle} — ${dateISO}`;
  els.groupPanelTitle().textContent = `Everyone — ${gameTitle} — ${dateISO}`;
}

export function renderPersonalPanel({
  state,
  activeUser,
  game,
  onSubmit,
  onEdit,
  onCancelEdit,
}) {
  const panel = els.personalPanel();
  panel.innerHTML = "";

  if (!activeUser) {
    panel.innerHTML = '<p class="placeholder">Select a user to get started.</p>';
    return;
  }

  if (!game) {
    panel.innerHTML = '<p class="placeholder">Select a game.</p>';
    return;
  }

  if (state.personalLoading) {
    panel.innerHTML = '<p class="placeholder">Loading…</p>';
    return;
  }

  const score = state.personalScore;
  const canEdit = score && score.userId === state.activeUserId;

  if (!score) {
    panel.appendChild(createSubmitForm({ scoreText: "", onSubmit, submitLabel: "Submit" }));
    return;
  }

  if (canEdit && state.editing) {
    panel.appendChild(
      createSubmitForm({
        scoreText: score.score,
        onSubmit,
        submitLabel: "Save",
        onCancel: onCancelEdit,
      })
    );
    return;
  }

  if (canEdit) {
    const pre = document.createElement("pre");
    pre.className = "score-display";
    pre.textContent = normalizeScoreEmojis(score.score);
    panel.appendChild(pre);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-secondary";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", onEdit);
    panel.appendChild(editBtn);
    return;
  }

  const pre = document.createElement("pre");
  pre.className = "score-display";
  pre.textContent = normalizeScoreEmojis(score.score);
  panel.appendChild(pre);

  const note = document.createElement("p");
  note.className = "read-only-note";
  const owner = state.usersById[score.userId]?.name ?? "This user";
  note.textContent = `${owner} already submitted for this day. Switch to that user to edit.`;
  panel.appendChild(note);
}

function createSubmitForm({ scoreText, onSubmit, submitLabel, onCancel }) {
  const form = document.createElement("form");
  form.className = "score-form";

  const textarea = document.createElement("textarea");
  textarea.rows = 8;
  textarea.placeholder = "Paste your score here…";
  textarea.value = scoreText;
  textarea.required = true;

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn btn-primary";
  submitBtn.textContent = submitLabel;

  actions.appendChild(submitBtn);

  if (onCancel) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", onCancel);
    actions.appendChild(cancelBtn);
  }

  form.appendChild(textarea);
  form.appendChild(actions);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    onSubmit(textarea.value);
  });

  return form;
}

export function renderGroupBoard({
  state,
  users,
  onCommentDraftChange,
  onCommentSubmit,
  onCommentDelete,
}) {
  const board = els.groupBoard();
  const focus = captureCommentFocus();
  board.innerHTML = "";

  if (!state.selectedGameId) {
    board.innerHTML = '<p class="placeholder">Select a game.</p>';
    return;
  }

  if (state.groupLoading) {
    board.innerHTML = '<p class="placeholder">Loading…</p>';
    return;
  }

  const scoresByUserId = Object.fromEntries(
    state.groupScores.map((s) => [s.userId, s])
  );

  const list = document.createElement("ul");
  list.className = "score-list";

  for (const user of users) {
    const item = document.createElement("li");
    item.className = "score-list-item";

    const name = document.createElement("span");
    name.className = "score-list-name";
    name.textContent = user.name;

    const scoreEntry = scoresByUserId[user.id];

    item.appendChild(name);

    if (scoreEntry) {
      const pre = document.createElement("pre");
      pre.className = "score-display score-display-compact";
      pre.textContent = normalizeScoreEmojis(scoreEntry.score);
      item.appendChild(pre);
      item.appendChild(
        createCommentThread({
          scoreId: scoreEntry.id,
          surface: "board",
          state,
          onCommentDraftChange,
          onCommentSubmit,
          onCommentDelete,
        })
      );
    } else {
      const empty = document.createElement("span");
      empty.className = "score-empty";
      empty.textContent = "Not submitted";
      item.appendChild(empty);
    }

    list.appendChild(item);
  }

  board.appendChild(list);
  restoreCommentFocus(focus);
}

export function renderFeed({
  state,
  onCommentDraftChange,
  onCommentSubmit,
  onCommentDelete,
}) {
  const feed = els.feed();
  const focus = captureCommentFocus();

  els.feedPanelTitle().textContent = `Recent activity — last ${FEED_WINDOW_DAYS} days`;
  feed.innerHTML = "";

  if (state.feedLoading) {
    feed.innerHTML = '<p class="placeholder">Loading…</p>';
    return;
  }

  const entries = sortFeedEntries(state.feedScores);

  if (entries.length === 0) {
    feed.innerHTML = `<p class="placeholder">No scores posted in the last ${FEED_WINDOW_DAYS} days.</p>`;
    return;
  }

  const gamesById = Object.fromEntries(state.games.map((g) => [g.id, g]));
  let currentDate = null;

  for (const entry of entries) {
    if (entry.date !== currentDate) {
      currentDate = entry.date;
      const heading = document.createElement("h3");
      heading.className = "feed-day";
      heading.textContent = formatFeedDay(entry.date);
      feed.appendChild(heading);
    }

    feed.appendChild(
      createFeedEntry({
        entry,
        game: gamesById[entry.gameId],
        state,
        onCommentDraftChange,
        onCommentSubmit,
        onCommentDelete,
      })
    );
  }

  restoreCommentFocus(focus);
}

/**
 * Newest day first, then most recently submitted within each day.
 *
 * The day the score belongs to has to win over the moment it was submitted:
 * scores can be back-filled from the date picker, and sorting on submission
 * time alone would float a back-dated score to the top of the feed and break
 * the day grouping it sits under.
 */
function sortFeedEntries(scores) {
  return [...scores].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    return byDate !== 0 ? byDate : submittedMillis(b) - submittedMillis(a);
  });
}

function submittedMillis(score) {
  // Scores written just now (or before submittedAt existed) fall back to their
  // date so they still land in a sensible spot.
  return score.submittedAt?.toMillis?.() ?? dateKeyToMillis(score.date);
}

function createFeedEntry({
  entry,
  game,
  state,
  onCommentDraftChange,
  onCommentSubmit,
  onCommentDelete,
}) {
  const article = document.createElement("article");
  article.className = "feed-entry";

  const head = document.createElement("div");
  head.className = "feed-entry-head";

  const who = document.createElement("span");
  who.className = "feed-entry-user";
  who.textContent = state.usersById[entry.userId]?.name ?? "Unknown user";
  head.appendChild(who);

  const what = document.createElement("span");
  what.className = "feed-entry-game";
  what.textContent = game?.gameTitle ?? entry.gameId;
  head.appendChild(what);

  const when = document.createElement("span");
  when.className = "feed-entry-time";
  when.textContent = formatSubmittedTime(entry.submittedAt);
  head.appendChild(when);

  article.appendChild(head);

  const pre = document.createElement("pre");
  pre.className = "score-display score-display-compact";
  pre.textContent = normalizeScoreEmojis(entry.score);
  article.appendChild(pre);

  article.appendChild(
    createCommentThread({
      scoreId: entry.id,
      surface: "feed",
      state,
      onCommentDraftChange,
      onCommentSubmit,
      onCommentDelete,
    })
  );

  return article;
}

function createCommentThread({
  scoreId,
  surface,
  state,
  onCommentDraftChange,
  onCommentSubmit,
  onCommentDelete,
}) {
  const wrap = document.createElement("div");
  wrap.className = "comments";

  const comments = state.commentsByScoreId[scoreId] ?? [];

  if (comments.length > 0) {
    const label = document.createElement("p");
    label.className = "comments-count";
    label.textContent = `${comments.length} ${
      comments.length === 1 ? "comment" : "comments"
    }`;
    wrap.appendChild(label);

    const list = document.createElement("ul");
    list.className = "comment-list";

    for (const comment of comments) {
      const item = document.createElement("li");
      item.className = "comment";

      const meta = document.createElement("div");
      meta.className = "comment-meta";

      const author = document.createElement("span");
      author.className = "comment-author";
      author.textContent = state.usersById[comment.userId]?.name ?? "Unknown user";
      meta.appendChild(author);

      const time = document.createElement("span");
      time.className = "comment-time";
      time.textContent = formatSubmittedTime(comment.createdAt);
      meta.appendChild(time);

      if (state.activeUserId) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "comment-delete";
        remove.textContent = "Delete";
        remove.title = `Delete ${
          state.usersById[comment.userId]?.name ?? "this user"
        }'s comment`;
        remove.disabled = Boolean(state.commentDeleting[comment.id]);
        remove.addEventListener("click", () => onCommentDelete(comment));
        meta.appendChild(remove);
      }

      item.appendChild(meta);

      const body = document.createElement("p");
      body.className = "comment-body";
      body.textContent = comment.text;
      item.appendChild(body);

      list.appendChild(item);
    }

    wrap.appendChild(list);
  }

  if (!state.activeUserId) {
    const hint = document.createElement("p");
    hint.className = "comment-hint";
    hint.textContent = "Select a user to leave a comment.";
    wrap.appendChild(hint);
    return wrap;
  }

  const pending = Boolean(state.commentPending[scoreId]);

  const form = document.createElement("form");
  form.className = "comment-form";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "comment-input";
  input.placeholder = "Add a comment…";
  input.maxLength = MAX_COMMENT_LENGTH;
  input.value = state.commentDrafts[scoreId] ?? "";
  input.disabled = pending;
  // A score can appear on both the board and the feed, so the focus key names
  // the surface too — otherwise focus restore can land on the hidden copy.
  input.dataset.commentInput = `${surface}:${scoreId}`;
  input.setAttribute("aria-label", "Add a comment");
  input.addEventListener("input", () => {
    onCommentDraftChange(scoreId, input.value);
  });

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "btn btn-secondary btn-small";
  button.textContent = pending ? "Posting…" : "Post";
  button.disabled = pending;

  form.appendChild(input);
  form.appendChild(button);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    onCommentSubmit(scoreId);
  });

  wrap.appendChild(form);
  return wrap;
}

// Re-rendering replaces the comment inputs, so remember which one had focus
// and put the caret back afterwards.
function captureCommentFocus() {
  const active = document.activeElement;
  const key = active?.dataset?.commentInput;
  if (!key) return null;
  return { key, caret: active.selectionStart };
}

function restoreCommentFocus(focus) {
  if (!focus) return;
  const input = document.querySelector(
    `[data-comment-input="${CSS.escape(focus.key)}"]`
  );
  if (!input || input.disabled) return;
  input.focus();
  const caret = focus.caret ?? input.value.length;
  input.setSelectionRange(caret, caret);
}

const EASTERN_TIME = { timeZone: "America/New_York" };

function formatSubmittedTime(timestamp) {
  const millis = timestamp?.toMillis?.();
  if (millis == null) return "just now";
  return new Intl.DateTimeFormat("en-US", {
    ...EASTERN_TIME,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(millis));
}

function formatFeedDay(dateKey) {
  const millis = dateKeyToMillis(dateKey);
  if (Number.isNaN(millis)) return dateKey;

  const todayKey = new Intl.DateTimeFormat("en-CA", {
    ...EASTERN_TIME,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");

  if (dateKey === todayKey) return "Today";
  if (dateKeyToMillis(todayKey) - millis === 86400000) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(millis));
}

function dateKeyToMillis(dateKey) {
  const iso = fromYYYYMMDD(dateKey);
  return iso ? Date.parse(`${iso}T00:00:00Z`) : NaN;
}

export function getDatePickerElement() {
  return els.datePicker();
}

export function getUserSelectElement() {
  return els.userSelect();
}

export { fromYYYYMMDD };
