// firebase.js
// Import the functions you need from Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-analytics.js";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
  getDatabase, ref, push, set, update, remove, onValue, get 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { 
  getStorage, ref as sRef, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-storage.js";

// ✅ Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBgg69Tq4hqzDeGwflnoV9b8ALrVIxAYdQ",
    authDomain: "lizaz-enterprises-ltd.firebaseapp.com",
    projectId: "lizaz-enterprises-ltd",
    storageBucket: "lizaz-enterprises-ltd.firebasestorage.app",
    messagingSenderId: "465801710974",
    appId: "1:465801710974:web:0dbe9d8a91e3d8c0bff72f",
    measurementId: "G-V4R36ZYP2T"

  // ----------------- Taseen -----------------

  // apiKey: "AIzaSyCDcm6q_UPyfjoaPnJcLyyqvXoMUDUxvI0",
  // authDomain: "lizaz-enterprizes.firebaseapp.com",
  // databaseURL: "https://lizaz-enterprizes-default-rtdb.firebaseio.com",
  // projectId: "lizaz-enterprizes",
  // storageBucket: "lizaz-enterprizes.firebasestorage.app",
  // messagingSenderId: "291248472589",
  // appId: "1:291248472589:web:71c7663fb51783ecb70b44",
  // measurementId: "G-1FKXZMPL1Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Export modules
export { 
  analytics, auth, db, storage, ref, push, set, update, remove, onValue, get, 
  signInWithEmailAndPassword, onAuthStateChanged, sRef, uploadBytes, getDownloadURL 
};
