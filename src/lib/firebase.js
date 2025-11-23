import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyAqQiWHLKe3G9o-5LaOUYnQT8ND1MGkIY4",
    authDomain: "invoicegen-dae80.firebaseapp.com",
    projectId: "invoicegen-dae80",
    storageBucket: "invoicegen-dae80.firebasestorage.app",
    messagingSenderId: "277519828876",
    appId: "1:277519828876:web:7c50af248477f9a315f8a9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
