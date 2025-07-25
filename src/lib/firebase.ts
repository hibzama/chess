// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4fJwImSsfy7bLBUcJnGgqsdzHKDzIpfo",
  authDomain: "nexbattle-ymmmq.firebaseapp.com",
  projectId: "nexbattle-ymmmq",
  storageBucket: "nexbattle-ymmmq.appspot.com",
  messagingSenderId: "1022888526676",
  appId: "1:1022888526676:web:2cf620984302526cbe3ec1",
  databaseURL: "https://nexbattle-ymmmq-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
