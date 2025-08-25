// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCohB4psuWDBKK65kP7q5ZkuQB1Md1Lq_E",
  authDomain: "xn--rgbjim0f.firebaseapp.com",
  projectId: "xn--rgbjim0f",
  storageBucket: "xn--rgbjim0f.appspot.com",
  messagingSenderId: "2223721000",
  appId: "1:2223721000:web:2e25b3343fc6473094431d",
  measurementId: "G-380G5LH948"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const functions = getFunctions(app, 'asia-southeast1'); // Specify region if needed
