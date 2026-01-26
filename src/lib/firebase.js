import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBu-PQIPfe8rnIyv5zjVxF6UocGfh44itg",
    authDomain: "ricochetpolishopen2026.firebaseapp.com",
    projectId: "ricochetpolishopen2026",
    storageBucket: "ricochetpolishopen2026.firebasestorage.app",
    messagingSenderId: "983389152525",
    appId: "1:983389152525:web:d4a10e3a5ba8813138dc44",
    measurementId: "G-TM2QGN37V0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const isFirebaseConfigured = true;
