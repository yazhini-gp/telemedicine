// Quick Firebase Authentication Fix Script
// Run this in browser console to diagnose and fix auth issues

console.log('🔧 Firebase Authentication Fix Script');
console.log('=====================================');

// Check current Firebase config
const currentConfig = {
  apiKey: "AIzaSyCSnvux0wmoyqBKRG7P_MUdAzPDBqZDJjo",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.firebasestorage.app",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:ef99ab93ffa243d684ea33"
};

console.log('📋 Current Firebase Config:', currentConfig);

// Test 1: Check if Firebase is loaded
if (typeof window.firebase === 'undefined') {
  console.log('❌ Firebase not loaded - check if Firebase SDK is properly imported');
} else {
  console.log('✅ Firebase SDK loaded');
}

// Test 2: Check network connectivity to Firebase
fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + currentConfig.apiKey, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'testpassword123',
    returnSecureToken: true
  })
})
.then(response => response.json())
.then(data => {
  if (data.error) {
    if (data.error.message.includes('EMAIL_EXISTS')) {
      console.log('✅ Firebase Auth API is working (email already exists is expected)');
    } else {
      console.log('⚠️ Firebase Auth API error:', data.error.message);
    }
  } else {
    console.log('✅ Firebase Auth API is working - test user created');
  }
})
.catch(error => {
  console.log('❌ Firebase Auth API error:', error.message);
});

// Test 3: Check Firestore connectivity
fetch('https://firestore.googleapis.com/v1/projects/' + currentConfig.projectId + '/databases/(default)/documents')
.then(response => {
  if (response.status === 200) {
    console.log('✅ Firestore API is accessible');
  } else {
    console.log('⚠️ Firestore API status:', response.status);
  }
})
.catch(error => {
  console.log('❌ Firestore API error:', error.message);
});

// Test 4: Check auth domain
fetch('https://' + currentConfig.authDomain + '/__/auth/iframe')
.then(response => {
  if (response.status === 200) {
    console.log('✅ Auth domain is accessible');
  } else {
    console.log('⚠️ Auth domain status:', response.status);
  }
})
.catch(error => {
  console.log('❌ Auth domain error:', error.message);
});

console.log('📝 Fix Script completed. Check results above.');
console.log('🌐 Test URLs:');
console.log('- Auth Test: http://localhost:3001/test-auth');
console.log('- DB Test: http://localhost:3001/test-db');
console.log('- Signup: http://localhost:3001/signup');
