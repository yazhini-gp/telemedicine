import React, { useState, useEffect } from 'react';
import { FileText, Wifi, WifiOff, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import syncService from '../services/syncService';
import offlineStorage from '../utils/enhancedOfflineStorage';

const OfflineReportTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const addTestResult = (test, status, message, details = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      status,
      message,
      details,
      timestamp: new Date()
    }]);
  };

  const runOfflineReportTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      addTestResult('Initialization', 'info', 'Starting offline report test...');
      
      // Test 1: Initialize offline storage
      addTestResult('Storage Init', 'info', 'Initializing offline storage...');
      await offlineStorage.initialize();
      addTestResult('Storage Init', 'success', 'Offline storage initialized successfully');

      // Test 2: Create offline report
      addTestResult('Create Report', 'info', 'Creating offline report...');
      const testReport = {
        patientId: 'test_patient_123',
        doctorId: 'test_doctor_456',
        title: 'Test Offline Report',
        reportType: 'lab',
        description: 'This is a test report created offline',
        date: new Date(),
        fileName: 'test-report.pdf',
        fileType: 'application/pdf',
        fileData: 'data:application/pdf;base64,test-data',
        fileSize: 1024,
        status: 'active'
      };

      const reportId = await syncService.createReportWithOfflineSupport(testReport);
      addTestResult('Create Report', 'success', `Report created with ID: ${reportId}`);

      // Test 3: Verify local storage
      addTestResult('Local Storage', 'info', 'Verifying local storage...');
      const cachedReports = await offlineStorage.getReports();
      const storedReport = cachedReports?.find(r => r.id === reportId);
      
      if (storedReport) {
        addTestResult('Local Storage', 'success', 'Report stored locally', {
          id: storedReport.id,
          title: storedReport.title,
          isOffline: storedReport.isOffline
        });
      } else {
        addTestResult('Local Storage', 'error', 'Report not found in local storage');
      }

      // Test 4: Check sync queue
      addTestResult('Sync Queue', 'info', 'Checking sync queue...');
      const syncQueue = await offlineStorage.getSyncQueue();
      const queueItem = syncQueue?.find(item => item.data?.id === reportId);
      
      if (queueItem) {
        addTestResult('Sync Queue', 'success', 'Report added to sync queue', {
          queueId: queueItem.id,
          type: queueItem.type,
          synced: queueItem.synced
        });
      } else {
        addTestResult('Sync Queue', 'error', 'Report not found in sync queue');
      }

      // Test 5: Test sync status
      addTestResult('Sync Status', 'info', 'Checking sync status...');
      const syncStatus = await syncService.getSyncStatus();
      addTestResult('Sync Status', 'success', 'Sync status retrieved', {
        isOnline: syncStatus.isOnline,
        pendingSync: syncStatus.pendingSync,
        cachedReports: syncStatus.cachedReports
      });

      // Test 6: Test offline data summary
      addTestResult('Data Summary', 'info', 'Getting offline data summary...');
      const dataSummary = await syncService.getOfflineDataSummary();
      addTestResult('Data Summary', 'success', 'Data summary retrieved', {
        hasProfile: dataSummary.hasProfile,
        reportCount: dataSummary.reportCount,
        pendingSyncCount: dataSummary.pendingSyncCount
      });

      addTestResult('Test Complete', 'success', 'All offline report tests completed successfully!');

    } catch (error) {
      addTestResult('Test Error', 'error', `Test failed: ${error.message}`, {
        error: error.stack
      });
    } finally {
      setIsRunning(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'info':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Offline Report Test
          </h3>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Network Status */}
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Test Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={runOfflineReportTest}
              disabled={isRunning}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {isRunning ? 'Running...' : 'Run Test'}
            </button>
            
            {testResults.length > 0 && (
              <button
                onClick={clearTestResults}
                className="btn-secondary text-sm"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This test verifies the complete offline report submission workflow:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Report creation and local storage</li>
          <li>Sync queue management</li>
          <li>Offline data persistence</li>
          <li>Sync status tracking</li>
        </ul>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {testResults.map((result) => (
            <div key={result.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`font-medium ${getStatusColor(result.status)}`}>
                    {result.test}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                  {result.message}
                </p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                      View Details
                    </summary>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {testResults.length === 0 && !isRunning && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Click "Run Test" to verify offline report functionality</p>
        </div>
      )}
    </div>
  );
};

export default OfflineReportTest;
