import React, { useState } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const DatabaseTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testDatabaseConnection = async () => {
    setLoading(true);
    setTestResult('Testing database connection...');
    
    try {
      // Test 1: Check if we can access the database
      console.log('Testing database connection...');
      console.log('Database instance:', db);
      
      // Test 2: Try to read from a collection
      const testCollection = collection(db, 'test');
      console.log('Test collection reference:', testCollection);
      
      // Test 3: Try to add a test document
      const testDoc = await addDoc(testCollection, {
        message: 'Database connection test',
        timestamp: new Date(),
        status: 'success'
      });
      
      console.log('Test document created:', testDoc.id);
      
      // Test 4: Try to read the document back
      const querySnapshot = await getDocs(testCollection);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      console.log('Documents retrieved:', docs);
      
      setTestResult(`✅ Database connection successful! 
      
Test Results:
- Database instance: Connected
- Collection access: Working
- Document creation: Success (ID: ${testDoc.id})
- Document retrieval: Success (${docs.length} documents found)

Firebase configuration is working correctly!`);
      
    } catch (error) {
      console.error('Database test failed:', error);
      setTestResult(`❌ Database connection failed!

Error Details:
- Code: ${error.code || 'Unknown'}
- Message: ${error.message}
- Full Error: ${JSON.stringify(error, null, 2)}

Please check:
1. Firebase project configuration
2. Internet connection
3. Firebase project permissions
4. Firestore rules`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 m-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Database Connection Test
      </h2>
      
      <button
        onClick={testDatabaseConnection}
        disabled={loading}
        className="btn-primary mb-4"
      >
        {loading ? 'Testing...' : 'Test Database Connection'}
      </button>
      
      {testResult && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DatabaseTest;
