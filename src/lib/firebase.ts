// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDjF4Rtr0wcclS87IbT4W2N8g37WOZZEFA",
  authDomain: "mainnextbattle.firebaseapp.com",
  projectId: "mainnextbattle",
  storageBucket: "mainnextbattle.appspot.com",
  messagingSenderId: "690186872654",
  appId: "1:690186872654:web:3fafecf2e45ba773d4a01f",
  measurementId: "G-D0KGF0X1QH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
