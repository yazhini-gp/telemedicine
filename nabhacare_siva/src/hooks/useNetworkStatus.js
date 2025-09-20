/**
 * Network Status Hook
 * Technology: React Hooks, Navigator API
 * 
 * Provides real-time network status and sync information
 */

import { useState, useEffect, useCallback } from 'react';
import syncService from '../services/syncService';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    inProgress: false,
    lastSyncTime: null,
    error: null
  });

  // Handle network status changes
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    console.log('Network online');
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    console.log('Network offline');
  }, []);

  // Handle sync status updates
  const handleSyncEvent = useCallback((event) => {
    switch (event.type) {
      case 'sync_start':
        setSyncStatus(prev => ({ ...prev, inProgress: true, error: null }));
        break;
      case 'sync_success':
        setSyncStatus(prev => ({ 
          ...prev, 
          inProgress: false, 
          lastSyncTime: event.lastSyncTime,
          error: null 
        }));
        break;
      case 'sync_error':
        setSyncStatus(prev => ({ 
          ...prev, 
          inProgress: false, 
          error: event.error 
        }));
        break;
    }
  }, []);

  useEffect(() => {
    // Set up network listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up sync listeners
    syncService.addSyncListener(handleSyncEvent);

    // Get initial sync status
    const status = syncService.getSyncStatus();
    setSyncStatus({
      inProgress: status.syncInProgress,
      lastSyncTime: status.lastSyncTime,
      error: null
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.removeSyncListener(handleSyncEvent);
    };
  }, [handleOnline, handleOffline, handleSyncEvent]);

  const manualSync = useCallback(async () => {
    try {
      await syncService.manualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  }, []);

  return {
    isOnline,
    syncStatus,
    manualSync
  };
};
