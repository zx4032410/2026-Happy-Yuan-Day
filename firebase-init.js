// /firebase-init.js

// 1. 貼上您從 Firebase 複製的 '鑰匙'
const firebaseConfig = {
  apiKey: "AIzaSyA5vu1AzlUPRbszYzjM0WTxpxZmJhbUR74", // <--- 換成您的
  authDomain: "yuan-birthday-gam.firebaseapp.com", // <--- 換成您的
  projectId: "yuan-birthday-gam", // <--- 換成您的
  storageBucket: "yuan-birthday-gam.firebasestorage.app", // <--- 換成您的
  messagingSenderId: "891333323583", // <--- 換成您的
  appId: "1:891333323583:web:2bdf6e420db3ba9f5b018a" // <--- 換成您的
};

// 2. 初始化 Firebase App
const app = firebase.initializeApp(firebaseConfig);

// 3. 初始化 Firestore 資料庫
const db = firebase.firestore();