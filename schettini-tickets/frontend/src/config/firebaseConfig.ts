import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";

// Opcional: solo inicializar si tienes credenciales reales (evita errores en producción sin Firebase).
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "TU_API_KEY",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "TU_PROYECTO.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "TU_PROYECTO",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
const isConfigured = firebaseConfig.projectId && firebaseConfig.projectId !== "TU_PROYECTO" && !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "TU_API_KEY";

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.warn("[Firebase] No se pudo inicializar:", e);
  }
}

export { db };