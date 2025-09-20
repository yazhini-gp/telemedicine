// Firebase Authentication Status Checker
// Run this in browser console to check if Email/Password auth is enabled

console.log('🔍 Checking Firebase Authentication Status...');
console.log('==========================================');

const firebaseConfig = {
  apiKey: "AIzaSyCSnvux0wmoyqBKRG7P_MUdAzPDBqZDJjo",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.firebasestorage.app",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:ef99ab93ffa243d684ea33"
};

console.log('📋 Firebase Config:', firebaseConfig);

// Test 1: Check if we can access Firebase Auth API
fetch('https://identitytoolkit.googleapis.com/v1/projects/nabhacare-48e2c/config', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + firebaseConfig.apiKey
  }
})
.then(response => response.json())
.then(data => {
  console.log('🔐 Firebase Auth Config:', data);
  
  if (data.signIn && data.signIn.email) {
    console.log('✅ Email/Password authentication appears to be configured');
  } else {
    console.log('❌ Email/Password authentication may not be enabled');
  }
})
.catch(error => {
  console.log('❌ Cannot access Firebase Auth config:', error.message);
});

// Test 2: Try to create a test user (this will fail if auth is not enabled)
const testSignup = async () => {
  try {
    const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + firebaseConfig.apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test-auth-check@example.com',
        password: 'testpassword123',
        returnSecureToken: true
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      if (data.error.message.includes('EMAIL_EXISTS')) {
        console.log('✅ Email/Password authentication is ENABLED (email already exists is expected)');
      } else if (data.error.message.includes('OPERATION_NOT_ALLOWED')) {
        console.log('❌ Email/Password authentication is NOT ENABLED');
        console.log('🔧 Solution: Enable Email/Password in Firebase Console → Authentication → Sign-in method');
      } else {
        console.log('⚠️ Authentication error:', data.error.message);
      }
    } else {
      console.log('✅ Email/Password authentication is ENABLED and working');
      console.log('🎉 Test user created successfully:', data.localId);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

testSignup();

console.log('📝 Auth Status Check completed. Check results above.');
console.log('🌐 Firebase Console: https://console.firebase.google.com/project/nabhacare-48e2c/authentication/providers');
