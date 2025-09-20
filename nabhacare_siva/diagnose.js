// Firebase Database Diagnosis Script
// Run this in browser console to check Firebase connection

console.log('🔍 Diagnosing Firebase Connection...');

// Check if Firebase is loaded
if (typeof window.firebase === 'undefined') {
  console.log('❌ Firebase not loaded');
} else {
  console.log('✅ Firebase loaded');
}

// Check Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDy0FkY9inKLpNBRghYKe8CAq5Sb4niwkM",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.appspot.com",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:nabhacare-app"
};

console.log('📋 Firebase Config:', firebaseConfig);

// Test network connectivity
fetch('https://firestore.googleapis.com/v1/projects/nabhacare-48e2c/databases/(default)/documents')
  .then(response => {
    console.log('🌐 Network connectivity:', response.status === 200 ? '✅ Connected' : '❌ Failed');
    console.log('Response status:', response.status);
  })
  .catch(error => {
    console.log('❌ Network error:', error.message);
  });

// Test Firebase Auth domain
fetch('https://nabhacare-48e2c.firebaseapp.com/__/auth/iframe')
  .then(response => {
    console.log('🔐 Auth domain:', response.status === 200 ? '✅ Accessible' : '❌ Not accessible');
  })
  .catch(error => {
    console.log('❌ Auth domain error:', error.message);
  });

console.log('📝 Diagnosis complete. Check results above.');
