import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const AuthTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    setTestResult('Testing Firebase Authentication...');
    
    try {
      console.log('Testing Firebase Auth...');
      console.log('Auth instance:', auth);
      console.log('Auth config:', auth.config);
      
      // Test 1: Check if auth is initialized
      if (!auth) {
        throw new Error('Firebase Auth not initialized');
      }
      
      setTestResult(prev => prev + '\n✅ Firebase Auth initialized');
      
      // Test 2: Try to create a test user (this will fail if email already exists, which is expected)
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'testpassword123';
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        setTestResult(prev => prev + `\n✅ Test user created: ${userCredential.user.uid}`);
        
        // Clean up - delete the test user
        await userCredential.user.delete();
        setTestResult(prev => prev + '\n✅ Test user cleaned up');
        
      } catch (createError) {
        if (createError.code === 'auth/email-already-in-use') {
          setTestResult(prev => prev + '\n⚠️ Test email already exists (this is normal)');
        } else {
          throw createError;
        }
      }
      
      setTestResult(prev => prev + '\n\n🎉 Firebase Authentication is working correctly!');
      
    } catch (error) {
      console.error('Auth test failed:', error);
      setTestResult(`❌ Firebase Authentication test failed!

Error Details:
- Code: ${error.code || 'Unknown'}
- Message: ${error.message}
- Full Error: ${JSON.stringify(error, null, 2)}

Possible Solutions:
1. Check Firebase Console → Authentication → Sign-in method
2. Enable Email/Password provider
3. Check Firebase project configuration
4. Verify internet connection`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 m-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Firebase Authentication Test
      </h2>
      
      <button
        onClick={testAuth}
        disabled={loading}
        className="btn-primary mb-4"
      >
        {loading ? 'Testing...' : 'Test Firebase Authentication'}
      </button>
      
      {testResult && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {testResult}
          </pre>
        </div>
      )}
      
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Current Firebase Config:
        </h3>
        <pre className="text-xs text-blue-800 dark:text-blue-200">
{JSON.stringify({
  apiKey: "AIzaSyCSnvux0wmoyqBKRG7P_MUdAzPDBqZDJjo",
  authDomain: "nabhacare-48e2c.firebaseapp.com",
  projectId: "nabhacare-48e2c",
  storageBucket: "nabhacare-48e2c.firebasestorage.app",
  messagingSenderId: "665549963978",
  appId: "1:665549963978:web:ef99ab93ffa243d684ea33"
}, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default AuthTest;
