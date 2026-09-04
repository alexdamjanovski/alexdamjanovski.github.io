import { fromYYYYMMDD } from "./state.js";
import { normalizeScoreEmojis } from "./emoji.js";

// test commit comment

const els = {
  userSelect: () => document.getElementById("user-select"),
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

export function renderGroupBoard({ state, users }) {
  const board = els.groupBoard();
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
    } else {
      const empty = document.createElement("span");
      empty.className = "score-empty";
      empty.textContent = "Not submitted";
      item.appendChild(empty);
    }

    list.appendChild(item);
  }

  board.appendChild(list);
}

export function getDatePickerElement() {
  return els.datePicker();
}

export function getUserSelectElement() {
  return els.userSelect();
}

export { fromYYYYMMDD };
