const ACTIVE_USER_KEY = "activeUserId";

export function createInitialState() {
  return {
    users: [],
    games: [],
    usersById: {},
    activeUserId: localStorage.getItem(ACTIVE_USER_KEY) || "",
    selectedGameId: "",
    selectedDate: getTodayInEastern(),
    personalScore: null,
    groupScores: [],
    personalLoading: false,
    groupLoading: false,
    editing: false,
  };
}

export function setActiveUserId(state, userId) {
  state.activeUserId = userId;
  if (userId) {
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } else {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

export function getActiveUser(state) {
  return state.usersById[state.activeUserId] ?? null;
}

export function getSelectedGame(state) {
  return state.games.find((g) => g.id === state.selectedGameId) ?? null;
}

export function getTodayInEastern() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function toYYYYMMDD(isoDate) {
  return isoDate.replace(/-/g, "");
}

export function fromYYYYMMDD(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return "";
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function buildUsersById(users) {
  return Object.fromEntries(users.map((u) => [u.id, u]));
}
