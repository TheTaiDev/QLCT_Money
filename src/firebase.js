import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAdCV3qcnFDaChQfAe7v9d8UZA9akh9GbA",
  authDomain: "expense-tracker-3da99.firebaseapp.com",
  projectId: "expense-tracker-3da99",
  storageBucket: "expense-tracker-3da99.appspot.com",
  messagingSenderId: "491530525822",
  appId: "1:491530525822:web:d89a1e60cd331cc0120c2f",
  measurementId: "G-G5M14WZD8F",
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
