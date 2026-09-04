import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";

export async function fetchUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  const users = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return users.sort((a, b) => a.name.localeCompare(b.name));
}
