import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase.js";

export const MAX_COMMENT_LENGTH = 500;

// Firestore caps `in` filters at 30 values, so watching more score threads
// than that means splitting the work across several listeners.
const IN_FILTER_LIMIT = 30;

export async function submitComment({ scoreId, userId, text }) {
  await addDoc(collection(db, "comments"), {
    scoreId,
    userId,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function deleteComment(commentId) {
  await deleteDoc(doc(db, "comments", commentId));
}

/**
 * Watches every comment thread for the given score IDs and reports them as a
 * map of scoreId -> comments (oldest first). Sorting happens client-side so no
 * composite index is required.
 */
export function subscribeToCommentsForScoreIds(scoreIds, onChange, onError) {
  const unique = [...new Set(scoreIds)].filter(Boolean);
  if (unique.length === 0) {
    onChange({});
    return () => {};
  }

  const chunks = [];
  for (let i = 0; i < unique.length; i += IN_FILTER_LIMIT) {
    chunks.push(unique.slice(i, i + IN_FILTER_LIMIT));
  }

  const perChunk = chunks.map(() => []);
  const emit = () => onChange(groupByScoreId(perChunk.flat()));

  const unsubscribes = chunks.map((chunk, index) =>
    onSnapshot(
      query(collection(db, "comments"), where("scoreId", "in", chunk)),
      (snap) => {
        perChunk[index] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      onError
    )
  );

  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

function groupByScoreId(comments) {
  const byScoreId = {};
  for (const comment of comments) {
    (byScoreId[comment.scoreId] ??= []).push(comment);
  }
  for (const thread of Object.values(byScoreId)) {
    thread.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
  }
  return byScoreId;
}

// A just-written comment has a null serverTimestamp until the server responds;
// treat it as "now" so it stays at the bottom of its thread.
function toMillis(timestamp) {
  return timestamp?.toMillis?.() ?? Date.now();
}
