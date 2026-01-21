import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, collectionGroup, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAIMqVAtds5BZvOWE5MMGg_eOf7ML5y9BU",
  authDomain: "nutritrack-91404.firebaseapp.com",
  projectId: "nutritrack-91404",
  storageBucket: "nutritrack-91404.firebasestorage.app",
  messagingSenderId: "100029954628",
  appId: "1:100029954628:web:9cb6e8f527f08b18151a11"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

/**
 * SUGGESTED FIRESTORE RULES:
 * 
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     // Global food list
 *     match /foodList/{foodId} {
 *       allow read: if true;
 *       allow write: if request.auth != null; // Or restrict to admins
 *     }
 *
 *     // User-specific data
 *     match /users/{userId} {
 *       allow read, write: if request.auth != null && request.auth.uid == userId;
 *
 *       // Foods within user folder: Publicly readable, but only owner can write
 *       match /foods/{foodId} {
 *         allow read: if true;
 *         allow create, update, delete: if request.auth != null && request.auth.uid == userId;
 *       }
 *
 *       match /weightEntries/{entryId} {
 *         allow read, write: if request.auth != null && request.auth.uid == userId;
 *       }
 *     }
 *
 *     // Global rule for collectionGroup: Allow reading any 'foods' subcollection across all users
 *     match /{path=**}/foods/{foodId} {
 *       allow read: if true;
 *     }
 *   }
 * }
 */

export { 
    app, db, auth, provider, 
    signInWithPopup, signOut, onAuthStateChanged, 
    collection, collectionGroup, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, getDoc 
};