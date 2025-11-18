// /firebase-init.js

const firebaseConfig = {
  apiKey: "AIzaSyA5vu1AzlUPRbszYzjM0WTxpxZmJhbUR74", 
  authDomain: "yuan-birthday-gam.firebaseapp.com", 
  projectId: "yuan-birthday-gam", 
  storageBucket: "yuan-birthday-gam.firebasestorage.app", 
  messagingSenderId: "891333323583", 
  appId: "1:891333323583:web:2bdf6e420db3ba9f5b018a" 
};


const app = firebase.initializeApp(firebaseConfig);


const db = firebase.firestore();