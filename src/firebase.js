import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgqlJc7xuMKhPuxQiedHKKDQg398FCSDs",
  authDomain: "daily-games-db.firebaseapp.com",
  projectId: "daily-games-db",
  storageBucket: "daily-games-db.firebasestorage.app",
  messagingSenderId: "816822104465",
  appId: "1:816822104465:web:0ee2de1b6db8211fa62a30",
  measurementId: "G-YW3QP91QW0",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
