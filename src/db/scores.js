import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

export function buildScoreId(userName, gameTitle, dateYYYYMMDD) {
  return `${userName}${gameTitle}${dateYYYYMMDD}`;
}

export async function submitScore({ scoreId, userId, gameId, score, date }) {
  await setDoc(
    doc(db, "scores", scoreId),
    {
      userId,
      gameId,
      score: score.trim(),
      date,
      submittedAt: serverTimestamp(),
    },
    { merge: false }
  );
}

export function subscribeToScore(scoreId, onChange, onError) {
  return onSnapshot(
    doc(db, "scores", scoreId),
    (snap) => {
      onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    },
    onError
  );
}

/**
 * Watches every score submitted on or after `fromDate` (a YYYYMMDD string).
 * Dates sort lexicographically in that format, so a single range filter is
 * enough and no composite index is needed.
 */
export function subscribeToScoresSince(fromDate, onChange, onError) {
  const q = query(collection(db, "scores"), where("date", ">=", fromDate));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError
  );
}

export function subscribeToScoresForGameDate(gameId, date, onChange, onError) {
  const q = query(
    collection(db, "scores"),
    where("gameId", "==", gameId),
    where("date", "==", date)
  );
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    onError
  );
}
