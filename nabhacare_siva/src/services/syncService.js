/**
 * Background Sync Service
 * Technology: Service Workers, Background Sync API, IndexedDB, Fetch API
 * 
 * Handles automatic synchronization of offline data when internet is restored
 */

import offlineStorage from '../utils/enhancedOfflineStorage';

class SyncService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncListeners = [];
    this.lastSyncTime = null;
    this.syncInterval = null;
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    try {
      // Initialize offline storage
      await offlineStorage.initialize();
      
      // Set up online/offline event listeners
      this.setupNetworkListeners();
      
      // Start periodic sync when online
      this.startPeriodicSync();
      
      // Register service worker for background sync
      await this.registerServiceWorker();
      
      // Load existing offline data
      await this.loadExistingOfflineData();
      
      console.log('Sync service initialized');
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
    }
  }

  /**
   * Load existing offline data
   */
  async loadExistingOfflineData() {
    try {
      console.log('Loading existing offline data...');
      
      // Check if we have cached reports
      const cachedReports = await offlineStorage.getReports();
      if (cachedReports && cachedReports.length > 0) {
        console.log('Found existing cached reports:', cachedReports.length);
      }
      
      // Check sync queue
      const syncQueue = await offlineStorage.getSyncQueue();
      if (syncQueue && syncQueue.length > 0) {
        console.log('Found existing sync queue items:', syncQueue.length);
      }
      
      // Check auth data
      const authData = await offlineStorage.getAuth();
      if (authData) {
        console.log('Found existing auth data for user:', authData.email);
      }
      
      console.log('Existing offline data loaded successfully');
    } catch (error) {
      console.error('Failed to load existing offline data:', error);
    }
  }

  /**
   * Set up network status listeners
   */
  setupNetworkListeners() {
    const handleOnline = () => {
      this.isOnline = true;
      console.log('SyncService: Network online - starting sync');
      
      // Check sync queue before starting sync
      offlineStorage.getSyncQueue().then(syncQueue => {
        console.log('SyncService: Sync queue on online event:', syncQueue.length, 'items');
        console.log('SyncService: Sync queue details:', syncQueue.map(item => ({
          id: item.id,
          type: item.type,
          title: item.data?.title
        })));
      });
      
      // Delay sync to ensure network is fully available
      setTimeout(() => {
        console.log('SyncService: Triggering delayed sync...');
        this.startSync();
      }, 2000);
    };

    const handleOffline = () => {
      this.isOnline = false;
      console.log('SyncService: Network offline - sync paused');
      this.stopPeriodicSync();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    console.log('SyncService: Network listeners set up');
  }

  /**
   * Register service worker for background sync
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration);
        
        // Listen for background sync events
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_COMPLETE') {
            this.handleSyncComplete(event.data);
          }
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  /**
   * Start automatic synchronization
   */
  async startSync() {
    if (this.syncInProgress || !this.isOnline) {
      console.log('Sync skipped - already in progress or offline');
      return;
    }

    this.syncInProgress = true;
    this.notifySyncStart();
    console.log('Starting sync process...');

    try {
      // Check if we have offline data to sync
      const hasOfflineData = await offlineStorage.hasOfflineData();
      console.log('Has offline data:', hasOfflineData);
      
      // Check sync queue for pending items
      const syncQueue = await offlineStorage.getSyncQueue();
      console.log('Sync queue items:', syncQueue.length);
      console.log('Sync queue details:', syncQueue.map(item => ({
        id: item.id,
        type: item.type,
        title: item.data?.title,
        synced: item.synced
      })));

      // Check if we have cached reports that might need syncing
      const cachedReports = await offlineStorage.getReports();
      const hasCachedReports = cachedReports && cachedReports.length > 0;
      console.log('Has cached reports:', hasCachedReports, 'Count:', cachedReports?.length || 0);

      if (!hasOfflineData && syncQueue.length === 0 && !hasCachedReports) {
        console.log('No offline data, sync queue items, or cached reports to sync');
        this.notifySyncSuccess();
        return;
      }

      // Get stored auth data
      const authData = await offlineStorage.getAuth();
      if (!authData) {
        console.log('No auth data found for sync');
        // Still try to sync queue items if any
        if (syncQueue.length > 0) {
          console.log('Attempting to sync queue items without auth data...');
          await this.syncPendingChanges();
        }
        // If we have cached reports but no auth, we can't sync them to server
        // but we can still process any queue items
        if (hasCachedReports) {
          console.log('Found cached reports but no auth data - cannot sync to server');
        }
        return;
      }

      // Check if token needs refresh
      const tokenExpired = Date.now() > authData.expiresAt;
      if (tokenExpired) {
        console.log('Token expired, attempting to refresh...');
        try {
          // Try to refresh the token
          const { auth } = await import('../services/firebase');
          if (auth.currentUser) {
            const newToken = await auth.currentUser.getIdToken(true);
            const refreshedAuthData = {
              ...authData,
              token: newToken,
              expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };
            await offlineStorage.storeAuth(refreshedAuthData);
            console.log('Token refreshed successfully');
            authData.token = newToken;
            authData.expiresAt = refreshedAuthData.expiresAt;
          } else {
            console.log('No current user found, skipping sync');
            this.notifySyncError('Authentication expired. Please login again.');
            return;
          }
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError);
          this.notifySyncError('Authentication expired. Please login again.');
          return;
        }
      }

      // Perform sync operations
      console.log('Syncing user data...');
      await this.syncUserData(authData);
      
      console.log('Syncing pending changes...');
      await this.syncPendingChanges();
      
      this.lastSyncTime = Date.now();
      console.log('Sync completed successfully');
      this.notifySyncSuccess();
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.notifySyncError(error.message);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync user data from server
   */
  async syncUserData(authData) {
    try {
      const { getUser, getPatientPrescriptions, getPatientReports } = await import('../services/api');
      
      // Sync user profile
      const profile = await getUser(authData.uid);
      if (profile) {
        await offlineStorage.storeProfile(profile);
        console.log('Profile synced');
      }

      // Sync prescriptions
      const prescriptions = await getPatientPrescriptions(authData.uid);
      if (prescriptions) {
        await offlineStorage.storePrescriptions(prescriptions);
        console.log('Prescriptions synced');
      }

      // Sync reports
      const reports = await getPatientReports(authData.uid);
      if (reports) {
        await offlineStorage.storeReports(reports);
        console.log('Reports synced');
      }

    } catch (error) {
      console.error('Failed to sync user data:', error);
      throw error;
    }
  }

  /**
   * Sync pending changes from sync queue
   */
  async syncPendingChanges() {
    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      
      if (syncQueue.length === 0) {
        console.log('No pending changes to sync');
        return;
      }

      console.log(`Syncing ${syncQueue.length} pending changes`);

      const successfulItems = [];
      const failedItems = [];

      for (const item of syncQueue) {
        try {
          console.log(`Syncing item:`, {
            id: item.id,
            type: item.type,
            title: item.data?.title,
            patientId: item.data?.patientId,
            doctorId: item.data?.doctorId,
            hasFileData: !!item.data?.fileData,
            retries: item.retries,
            synced: item.synced
          });
          
          // Check retry count to prevent infinite loops
          if (item.retries && item.retries >= 3) {
            console.warn(`Skipping item ${item.id} - too many retries (${item.retries})`);
            continue;
          }
          
          // Check if item is already synced
          if (item.synced) {
            console.log(`Skipping item ${item.id} - already synced`);
            continue;
          }
          
          await this.syncQueueItem(item);
          successfulItems.push(item);
          console.log(`Successfully synced item:`, item.type);
        } catch (error) {
          console.error('Failed to sync queue item:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            itemId: item.id,
            itemType: item.type
          });
          
          // Increment retry count
          const failedItem = {
            ...item,
            retries: (item.retries || 0) + 1,
            lastError: error.message,
            lastRetryTime: Date.now()
          };
          
          failedItems.push(failedItem);
          console.log(`Item ${item.id} failed, retry count: ${failedItem.retries}`);
          // Continue with other items
        }
      }

      // Only clear successfully synced items
      if (successfulItems.length > 0) {
        console.log(`Successfully synced ${successfulItems.length} items`);
        
        // Clear the entire queue and re-add failed items
        await offlineStorage.clearSyncQueue();
        
        // Re-add failed items to the sync queue
        for (const failedItem of failedItems) {
          try {
            await offlineStorage.addToSyncQueue(failedItem);
            console.log('Re-added failed item to sync queue:', failedItem.type);
          } catch (error) {
            console.error('Failed to re-add item to sync queue:', error);
          }
        }
        
        console.log(`Sync completed: ${successfulItems.length} successful, ${failedItems.length} failed`);
      } else if (failedItems.length > 0) {
        console.log(`All ${failedItems.length} items failed to sync, keeping them in queue for retry`);
        // Don't clear the queue if all items failed
      } else {
        console.log('No items to sync');
      }

    } catch (error) {
      console.error('Failed to sync pending changes:', error);
      throw error;
    }
  }

  /**
   * Sync individual queue item
   */
  async syncQueueItem(item) {
    try {
      console.log('Syncing queue item:', {
        id: item.id,
        type: item.type,
        timestamp: item.timestamp,
        synced: item.synced,
        retries: item.retries
      });
      
      const { createPrescription, createReport, updateUser, deleteReport } = await import('../services/api');
      
      switch (item.type) {
        case 'prescription':
          await createPrescription(item.data);
          break;
        case 'report':
          console.log('Syncing report:', item.data);
          console.log('Report data details:', {
            id: item.data.id,
            title: item.data.title,
            patientId: item.data.patientId,
            doctorId: item.data.doctorId,
            hasFileData: !!item.data.fileData,
            isOffline: item.data.isOffline
          });
          
          // Remove temp fields before sending to server
          const cleanReportData = { ...item.data };
          delete cleanReportData.tempId;
          delete cleanReportData.syncStatus;
          delete cleanReportData.isOffline;
          
          console.log('Clean report data for server:', cleanReportData);
          
          try {
            const reportId = await createReport(cleanReportData);
            console.log('Report synced with ID:', reportId);
            
            // Update the cached reports with the real ID using the new method
            if (reportId && item.data.id && item.data.id.startsWith('temp_')) {
              console.log('Updating cached reports with real ID:', reportId);
              await this.updateReportWithRealId(item.data.id, reportId);
              console.log('Updated cached reports with real ID');
            }
          } catch (apiError) {
            console.error('API call failed:', apiError);
            console.error('API error details:', {
              code: apiError.code,
              message: apiError.message,
              stack: apiError.stack
            });
            throw apiError;
          }
          break;
        case 'delete_report':
          await deleteReport(item.data.reportId);
          break;
        case 'profile_update':
          await updateUser(item.userId, item.data);
          break;
        default:
          console.warn('Unknown sync item type:', item.type);
      }
      
      console.log(`Successfully synced ${item.type}:`, item.id || item.data?.reportId);
    } catch (error) {
      console.error(`Failed to sync ${item.type}:`, error);
      console.error('Sync error details:', error.message, error.stack);
      console.error('Full error object:', error);
      throw error;
    }
  }

  /**
   * Add item to sync queue for later synchronization
   */
  async addToSyncQueue(type, data, userId = null) {
    try {
      const item = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        userId,
        timestamp: Date.now(),
        synced: false,
        retries: 0
      };

      console.log('Adding item to sync queue:', {
        id: item.id,
        type: item.type,
        title: data.title,
        patientId: data.patientId,
        isOnline: this.isOnline
      });

      await offlineStorage.addToSyncQueue(item);
      console.log(`Added ${type} to sync queue with ID:`, item.id);

      // Try immediate sync if online
      if (this.isOnline) {
        console.log('Online detected, starting sync process...');
        // Add a small delay to ensure the item is properly stored
        setTimeout(() => {
          this.startSync();
        }, 100);
      } else {
        console.log('Offline detected, item will sync when online');
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.startSync();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manual sync trigger
   */
  async manualSync() {
    console.log('Manual sync triggered, isOnline:', this.isOnline);
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    console.log('Starting manual sync...');
    await this.startSync();
    console.log('Manual sync completed');
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      hasOfflineData: offlineStorage.hasOfflineData()
    };
  }

  /**
   * Add sync event listener
   */
  addSyncListener(callback) {
    this.syncListeners.push(callback);
  }

  /**
   * Remove sync event listener
   */
  removeSyncListener(callback) {
    this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
  }

  /**
   * Notify sync start
   */
  notifySyncStart() {
    this.syncListeners.forEach(listener => {
      try {
        listener({ type: 'sync_start' });
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Notify sync success
   */
  notifySyncSuccess() {
    this.syncListeners.forEach(listener => {
      try {
        listener({ 
          type: 'sync_success', 
          lastSyncTime: this.lastSyncTime 
        });
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Notify sync error
   */
  notifySyncError(error) {
    this.syncListeners.forEach(listener => {
      try {
        listener({ type: 'sync_error', error });
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Handle sync complete from service worker
   */
  handleSyncComplete(data) {
    console.log('Background sync completed:', data);
    this.lastSyncTime = Date.now();
    this.notifySyncSuccess();
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData() {
    try {
      await offlineStorage.clearAll();
      this.lastSyncTime = null;
      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      throw error;
    }
  }

  /**
   * Get reports with offline support
   */
  async getReportsWithOfflineSupport(patientId, doctorId = null) {
    try {
      console.log('getReportsWithOfflineSupport called:', { patientId, doctorId, isOnline: this.isOnline });
      
      let reportsData = [];
      
      // Try to get reports from server first if online
      if (this.isOnline) {
        try {
          console.log('Attempting to fetch reports online...');
          const { getPatientReports, getDoctorReports } = await import('../services/api');
          
          if (doctorId) {
            // For doctors, get reports they created
            reportsData = await getDoctorReports(doctorId);
          } else {
            // For patients, get their reports
            reportsData = await getPatientReports(patientId);
          }
          
          console.log('Online reports fetched:', reportsData);
          
          // Merge with existing cached reports to preserve offline-created reports
          const existingCachedReports = await offlineStorage.getReports() || [];
          console.log('Existing cached reports:', existingCachedReports.length);
          
          // Create a map of existing reports by ID for quick lookup
          const existingReportsMap = new Map();
          existingCachedReports.forEach(report => {
            existingReportsMap.set(report.id, report);
          });
          
          // Merge online reports with existing cached reports
          const mergedReports = [...reportsData];
          
          // Add offline reports that aren't already in the online data
          existingCachedReports.forEach(cachedReport => {
            if (cachedReport.isOffline && !existingReportsMap.has(cachedReport.id)) {
              // This is an offline-created report that hasn't been synced yet
              mergedReports.unshift(cachedReport);
            }
          });
          
          // Cache the merged reports
          if (mergedReports.length > 0) {
            await offlineStorage.storeReports(mergedReports);
            console.log('Merged reports cached for offline use:', mergedReports.length);
          }
          
          return mergedReports;
        } catch (error) {
          console.warn('Failed to fetch reports online, falling back to offline:', error);
        }
      }
      
      // Fallback to offline storage
      console.log('Fetching cached reports from offline storage...');
      const cachedReports = await offlineStorage.getReports();
      console.log('Cached reports retrieved:', cachedReports);
      
      if (cachedReports && cachedReports.length > 0) {
        console.log('Using cached reports for offline access');
        
        // Filter reports based on user role and permissions
        let filteredReports = cachedReports;
        
        // If patient, only show their own reports
        if (patientId && !doctorId) {
          filteredReports = cachedReports.filter(report => 
            report.patientId === patientId
          );
        }
        // If doctor, show reports they created or are assigned to
        else if (doctorId) {
          filteredReports = cachedReports.filter(report => 
            report.doctorId === doctorId || report.patientId === patientId
          );
        }
        
        console.log('Filtered cached reports for offline access:', filteredReports);
        return filteredReports;
      }
      
      console.log('No cached reports found');
      return [];
    } catch (error) {
      console.error('Failed to get reports with offline support:', error);
      return [];
    }
  }

  /**
   * Create report with offline support
   * Always stores locally first, then attempts online sync
   */
  async createReportWithOfflineSupport(reportData) {
    try {
      console.log('createReportWithOfflineSupport called:', { 
        reportData: {
          ...reportData,
          fileData: reportData.fileData ? '[FILE_DATA_PRESENT]' : '[NO_FILE_DATA]'
        }, 
        isOnline: this.isOnline 
      });
      
      // Always create a temporary ID first for local storage
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const reportWithTempId = { 
        ...reportData, 
        id: tempId,
        createdAt: new Date(),
        isOffline: true,
        tempId: tempId, // Keep track of temp ID for later reference
        syncStatus: 'pending' // Track sync status
      };
      
      console.log('Report data to be stored locally:', {
        id: reportWithTempId.id,
        title: reportWithTempId.title,
        patientId: reportWithTempId.patientId,
        doctorId: reportWithTempId.doctorId,
        hasFileData: !!reportWithTempId.fileData,
        syncStatus: reportWithTempId.syncStatus
      });
      
      // Store locally first (always)
      await this.storeReportLocally(reportWithTempId);
      
      // Add to sync queue for later synchronization
      await this.addToSyncQueue('report', reportWithTempId, reportData.patientId);
      console.log('Report added to sync queue successfully');
      
      // Note: Sync will be handled by the sync queue process
      
      console.log('Report saved locally with temp ID:', tempId);
      return tempId;
    } catch (error) {
      console.error('Failed to create report with offline support:', error);
      console.error('Error details:', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Store report locally in IndexedDB
   */
  async storeReportLocally(reportData) {
    try {
      const cachedReports = await offlineStorage.getReports() || [];
      console.log('Current cached reports count:', cachedReports.length);
      
      // Check if report already exists (avoid duplicates)
      const existingReportIndex = cachedReports.findIndex(r => r.id === reportData.id);
      if (existingReportIndex >= 0) {
        // Update existing report
        cachedReports[existingReportIndex] = reportData;
        console.log('Updated existing report in cache');
      } else {
        // Add new report to the beginning
        cachedReports.unshift(reportData);
        console.log('Added new report to cache');
      }
      
      await offlineStorage.storeReports(cachedReports);
      console.log('Cached reports updated with new offline report. New count:', cachedReports.length);
      
      // Verify the report was stored
      const verifyReports = await offlineStorage.getReports();
      console.log('Verification - cached reports count after storage:', verifyReports?.length || 0);
      
    } catch (cacheError) {
      console.error('Failed to update cached reports:', cacheError);
      throw cacheError;
    }
  }

  /**
   * Sync individual report to server
   */
  async syncReportToServer(reportData) {
    try {
      console.log('Syncing report to server:', reportData.id);
      
      const { createReport } = await import('../services/api');
      const reportId = await createReport(reportData);
      console.log('Report synced to server with ID:', reportId);
      
      // Update local cache with real ID
      await this.updateReportWithRealId(reportData.id, reportId);
      
      // Refresh cached reports from server
      const { getPatientReports } = await import('../services/api');
      const reports = await getPatientReports(reportData.patientId);
      if (reports) {
        await offlineStorage.storeReports(reports);
        console.log('Reports cache updated after sync');
      }
      
      return reportId;
    } catch (error) {
      console.error('Failed to sync report to server:', error);
      throw error;
    }
  }

  /**
   * Update report with real ID after successful sync
   */
  async updateReportWithRealId(tempId, realId) {
    try {
      const cachedReports = await offlineStorage.getReports() || [];
      const updatedReports = cachedReports.map(report => 
        report.id === tempId || report.tempId === tempId
          ? { 
              ...report, 
              id: realId, 
              isOffline: false, 
              tempId: undefined,
              syncStatus: 'synced',
              syncedAt: new Date()
            } 
          : report
      );
      
      await offlineStorage.storeReports(updatedReports);
      console.log('Updated report with real ID:', realId);
    } catch (error) {
      console.error('Failed to update report with real ID:', error);
    }
  }

  /**
   * Update report sync status
   */
  async updateReportSyncStatus(reportId, status) {
    try {
      const cachedReports = await offlineStorage.getReports() || [];
      const updatedReports = cachedReports.map(report => 
        report.id === reportId || report.tempId === reportId
          ? { ...report, syncStatus: status }
          : report
      );
      
      await offlineStorage.storeReports(updatedReports);
      console.log('Updated report sync status:', reportId, status);
    } catch (error) {
      console.error('Failed to update report sync status:', error);
    }
  }

  /**
   * Delete report with offline support
   */
  async deleteReportWithOfflineSupport(reportId) {
    try {
      console.log('deleteReportWithOfflineSupport called:', { reportId, isOnline: this.isOnline });
      
      if (this.isOnline) {
        try {
          const { deleteReport } = await import('../services/api');
          await deleteReport(reportId);
          console.log('Report deleted online:', reportId);
          
          // Update cached reports
          const cachedReports = await offlineStorage.getReports() || [];
          const updatedReports = cachedReports.filter(r => r.id !== reportId);
          await offlineStorage.storeReports(updatedReports);
          console.log('Cached reports updated after online deletion');
          
          return;
        } catch (error) {
          console.warn('Failed to delete report online, saving for later sync:', error);
        }
      }
      
      // Add to sync queue for later deletion
      await this.addToSyncQueue('delete_report', { reportId });
      console.log('Report deletion added to sync queue');
      
      // Update cached reports immediately
      const cachedReports = await offlineStorage.getReports() || [];
      const updatedReports = cachedReports.filter(r => r.id !== reportId);
      await offlineStorage.storeReports(updatedReports);
      console.log('Cached reports updated after offline deletion');
      
      console.log('Report deletion queued for later sync');
    } catch (error) {
      console.error('Failed to delete report with offline support:', error);
      throw error;
    }
  }

  /**
   * Get sync status with detailed information
   */
  async getSyncStatus() {
    try {
      const [profile, prescriptions, reports, syncQueue] = await Promise.all([
        offlineStorage.getProfile(),
        offlineStorage.getPrescriptions(),
        offlineStorage.getReports(),
        offlineStorage.getSyncQueue()
      ]);

      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        lastSyncTime: this.lastSyncTime,
        hasProfile: !!profile,
        cachedReports: reports?.length || 0,
        cachedPrescriptions: prescriptions?.length || 0,
        pendingSync: syncQueue?.length || 0
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        lastSyncTime: this.lastSyncTime,
        hasProfile: false,
        cachedReports: 0,
        cachedPrescriptions: 0,
        pendingSync: 0
      };
    }
  }

  /**
   * Get offline data summary
   */
  async getOfflineDataSummary() {
    try {
      const [profile, prescriptions, reports, syncQueue] = await Promise.all([
        offlineStorage.getProfile(),
        offlineStorage.getPrescriptions(),
        offlineStorage.getReports(),
        offlineStorage.getSyncQueue()
      ]);

      return {
        hasProfile: !!profile,
        prescriptionCount: prescriptions?.length || 0,
        reportCount: reports?.length || 0,
        pendingSyncCount: syncQueue?.length || 0,
        lastSyncTime: this.lastSyncTime
      };
    } catch (error) {
      console.error('Failed to get offline data summary:', error);
      return null;
    }
  }

  /**
   * Debug method to check sync queue and trigger manual sync
   */
  async debugSyncQueue() {
    try {
      console.log('=== SYNC QUEUE DEBUG ===');
      console.log('Is online:', this.isOnline);
      console.log('Sync in progress:', this.syncInProgress);
      
      const syncQueue = await offlineStorage.getSyncQueue();
      console.log('Sync queue length:', syncQueue.length);
      console.log('Sync queue items:', syncQueue.map(item => ({
        id: item.id,
        type: item.type,
        title: item.data?.title,
        synced: item.synced,
        retries: item.retries
      })));
      
      if (syncQueue.length > 0 && this.isOnline && !this.syncInProgress) {
        console.log('Triggering manual sync...');
        await this.startSync();
      } else {
        console.log('Cannot sync:', {
          hasItems: syncQueue.length > 0,
          isOnline: this.isOnline,
          syncInProgress: this.syncInProgress
        });
      }
    } catch (error) {
      console.error('Debug sync queue failed:', error);
    }
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
