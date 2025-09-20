import React, { useState, useEffect } from 'react';
import enhancedOfflineStorage from '../utils/enhancedOfflineStorage';
import syncService from '../services/syncService';

const OfflineTest = () => {
  const [status, setStatus] = useState('Initializing...');
  const [reports, setReports] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [authData, setAuthData] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // ✅ Function moved outside so it can be used by both effect and button
  const testOfflineStorage = async () => {
    try {
      setStatus('Testing enhanced offline storage...');

      // Initialize enhanced offline storage
      const initialized = await enhancedOfflineStorage.initialize();
      console.log('Enhanced offline storage initialized:', initialized);

      if (initialized) {
        setStatus('Enhanced offline storage initialized successfully');

        // Test retrieving data
        const retrievedData = await enhancedOfflineStorage.getReports();
        console.log('Retrieved data:', retrievedData);
        setReports(retrievedData || []);

        // Get sync queue
        const queueData = await enhancedOfflineStorage.getSyncQueue();
        console.log('Sync queue:', queueData);
        setSyncQueue(queueData || []);

        // Get auth data
        const auth = await enhancedOfflineStorage.getAuth();
        console.log('Auth data:', auth);
        setAuthData(auth);

        // Get storage stats
        const stats = await enhancedOfflineStorage.getStorageStats();
        setStorageStats(stats);

        setStatus(
          `Enhanced offline storage working! Retrieved ${retrievedData?.length || 0} reports, ${queueData?.length || 0} sync items, ${auth ? 'auth data available' : 'no auth data'}`
        );
      } else {
        setStatus('Failed to initialize enhanced offline storage');
      }
    } catch (error) {
      console.error('Enhanced offline storage test failed:', error);
      setStatus(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    testOfflineStorage();

    // Update sync queue every 5 seconds
    const interval = setInterval(async () => {
      try {
        const queueData = await enhancedOfflineStorage.getSyncQueue();
        const auth = await enhancedOfflineStorage.getAuth();
        const stats = await enhancedOfflineStorage.getStorageStats();
        setSyncQueue(queueData || []);
        setAuthData(auth);
        setStorageStats(stats);
      } catch (error) {
        console.warn('Failed to update sync queue:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const testSync = async () => {
    try {
      console.log('Testing manual sync...');
      await syncService.manualSync();
      console.log('Manual sync test completed');

      // Refresh data
      await testOfflineStorage();
    } catch (error) {
      console.error('Manual sync test failed:', error);
    }
  };

  const testOfflineToOnlineWorkflow = async () => {
    try {
      setTestResult('Running workflow test...');
      console.log('Running offline-to-online workflow test...');
      const result = await enhancedOfflineStorage.testOfflineToOnlineWorkflow();
      setTestResult(result);

      // Refresh data after test
      await testOfflineStorage();
    } catch (error) {
      console.error('Workflow test failed:', error);
      setTestResult({ success: false, error: error.message });
    }
  };

  const clearStorage = async () => {
    try {
      console.log('Clearing all offline storage...');
      await enhancedOfflineStorage.clearAll();
      console.log('Storage cleared successfully');

      // Refresh data
      await testOfflineStorage();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-bold">Offline Storage Test</h3>
        <div className="flex space-x-2">
          <button
            onClick={testOfflineStorage}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Test Storage
          </button>
          <button
            onClick={testOfflineToOnlineWorkflow}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Test Workflow
          </button>
          <button
            onClick={testSync}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Test Sync
          </button>
          <button
            onClick={clearStorage}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
          >
            Clear Storage
          </button>
        </div>
      </div>
      <p className="mb-2">Status: {status}</p>

      {/* Test Result */}
      {testResult && (
        <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-1">Test Result:</h4>
          {testResult.success ? (
            <div className="text-sm text-green-600">
              <p>✅ Test passed!</p>
              <p>Reports stored: {testResult.reportsStored}</p>
              <p>Sync queue items: {testResult.syncQueueItems}</p>
            </div>
          ) : (
            <div className="text-sm text-red-600">
              <p>❌ Test failed: {testResult.error || testResult}</p>
            </div>
          )}
        </div>
      )}

      {/* Storage Stats */}
      {storageStats && (
        <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
          <h4 className="font-semibold mb-1">Storage Statistics:</h4>
          <div className="text-sm grid grid-cols-2 gap-2">
            <p>Auth: {storageStats.auth || 0}</p>
            <p>Profile: {storageStats.profile || 0}</p>
            <p>Reports: {storageStats.reports || 0}</p>
            <p>Prescriptions: {storageStats.prescriptions || 0}</p>
            <p>Sync Queue: {storageStats.syncQueue || 0}</p>
          </div>
        </div>
      )}

      {/* Auth Data Status */}
      <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <h4 className="font-semibold mb-1">Auth Status:</h4>
        {authData ? (
          <div className="text-sm">
            <p>✅ Auth data available</p>
            <p>User: {authData.email}</p>
            <p>UID: {authData.uid}</p>
            <p>Token expires: {new Date(authData.expiresAt).toLocaleString()}</p>
          </div>
        ) : (
          <p className="text-sm text-red-600">❌ No auth data found</p>
        )}
      </div>

      {/* Reports & Sync Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Retrieved Reports ({reports.length}):</h4>
          {reports.length > 0 ? (
            <ul className="list-disc list-inside max-h-32 overflow-y-auto">
              {reports.map((report) => (
                <li key={report.id || Math.random()} className="text-sm">
                  {report.title}{' '}
                  {report.isOffline && <span className="text-orange-600">(Offline)</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No reports found</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2">Sync Queue ({syncQueue.length}):</h4>
          {syncQueue.length > 0 ? (
            <ul className="list-disc list-inside max-h-32 overflow-y-auto">
              {syncQueue.map((item, index) => (
                <li key={index} className="text-sm">
                  {item.type} - {item.data?.title || item.data?.reportId || 'Unknown'}
                  {item.synced && <span className="text-green-600 ml-1">(Synced)</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No pending sync items</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineTest;
