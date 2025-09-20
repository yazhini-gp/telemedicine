import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';

const SimpleSignupTest = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleSimpleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult('Starting simple signup test...');

    try {
      console.log('=== SIMPLE SIGNUP TEST ===');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Name:', name);
      console.log('Auth instance:', auth);

      // Step 1: Create Firebase Auth user
      setResult(prev => prev + '\nStep 1: Creating Firebase Auth user...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase Auth user created:', user.uid);
      setResult(prev => prev + `\n✅ Firebase Auth user created: ${user.uid}`);

      // Step 2: Update display name
      setResult(prev => prev + '\nStep 2: Updating display name...');
      await user.updateProfile({
        displayName: name
      });
      
      console.log('✅ Display name updated');
      setResult(prev => prev + '\n✅ Display name updated');

      // Step 3: Create Firestore document
      setResult(prev => prev + '\nStep 3: Creating Firestore document...');
      const { db } = await import('../services/firebase');
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        id: user.uid,
        email: user.email,
        name: name,
        role: 'patient',
        domain: '',
        availability: 'available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Firestore document created');
      setResult(prev => prev + '\n✅ Firestore document created');

      setResult(prev => prev + '\n\n🎉 SIMPLE SIGNUP SUCCESSFUL!');
      toast.success('Simple signup successful!');

    } catch (error) {
      console.error('❌ Simple signup failed:', error);
      setResult(`❌ SIMPLE SIGNUP FAILED!

Error Details:
- Code: ${error.code || 'Unknown'}
- Message: ${error.message}
- Full Error: ${JSON.stringify(error, null, 2)}

Common Solutions:
1. Check if email is already in use
2. Check Firebase Authentication is enabled
3. Check Firestore security rules
4. Check internet connection`);
      
      toast.error(`Signup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 m-4 max-w-md">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Simple Signup Test
      </h2>
      
      <form onSubmit={handleSimpleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="test@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="min 6 characters"
            required
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Your name"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password || !name}
          className="w-full btn-primary"
        >
          {loading ? 'Testing...' : 'Test Simple Signup'}
        </button>
      </form>

      {result && (
        <div className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SimpleSignupTest;
