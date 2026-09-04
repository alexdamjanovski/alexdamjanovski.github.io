import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

export async function fetchGames() {
  const snapshot = await getDocs(collection(db, "games"));
  const games = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return games.sort((a, b) => {
    if (a.sortOrder != null && b.sortOrder != null) {
      return a.sortOrder - b.sortOrder;
    }
    return a.gameTitle.localeCompare(b.gameTitle);
  });
}
