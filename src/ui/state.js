const ACTIVE_USER_KEY = "activeUserId";
const ACTIVE_TAB_KEY = "activeTab";

export const TABS = [
  { id: "scores", label: "Scores" },
  { id: "feed", label: "Feed" },
];

// How far back the feed reaches, counting today as day 1.
export const FEED_WINDOW_DAYS = 7;

export function createInitialState() {
  return {
    users: [],
    games: [],
    usersById: {},
    activeUserId: localStorage.getItem(ACTIVE_USER_KEY) || "",
    activeTab: readStoredTab(),
    selectedGameId: "",
    selectedDate: getTodayInEastern(),
    personalScore: null,
    groupScores: [],
    personalLoading: false,
    groupLoading: false,
    editing: false,
    feedScores: [],
    feedLoading: false,
    commentsByScoreId: {},
    commentDrafts: {},
    commentPending: {},
  };
}

function readStoredTab() {
  const stored = localStorage.getItem(ACTIVE_TAB_KEY);
  return TABS.some((tab) => tab.id === stored) ? stored : TABS[0].id;
}

export function setActiveTab(state, tabId) {
  state.activeTab = tabId;
  localStorage.setItem(ACTIVE_TAB_KEY, tabId);
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

/**
 * The YYYYMMDD key for the oldest day the feed should include, counting back
 * from today in Eastern time.
 */
export function getFeedCutoffDate(windowDays = FEED_WINDOW_DAYS) {
  const [year, month, day] = getTodayInEastern().split("-").map(Number);
  const cutoff = new Date(Date.UTC(year, month - 1, day));
  cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
  return cutoff.toISOString().slice(0, 10).replace(/-/g, "");
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
