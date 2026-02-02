import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  // ... resto de credenciales de Firebase Console
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);