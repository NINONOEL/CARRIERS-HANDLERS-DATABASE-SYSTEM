import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBE9GiYoNWI-8oMdLzOZjQVeJ0wq6DlZ1g",
  authDomain: "carriers-handlers-databa-7cdce.firebaseapp.com",
  projectId: "carriers-handlers-databa-7cdce",
  storageBucket: "carriers-handlers-databa-7cdce.firebasestorage.app",
  messagingSenderId: "702749404997",
  appId: "1:702749404997:web:f2877081578172ccfe982c",
  measurementId: "G-FZJSM3G3HY"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
