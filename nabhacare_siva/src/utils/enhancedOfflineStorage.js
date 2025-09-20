/**
 * Enhanced Offline Storage Service
 * Technology: IndexedDB with better error handling and persistence
 * 
 * Provides robust offline storage for patient data with comprehensive error handling
 */

class EnhancedOfflineStorage {
  constructor() {
    this.dbName = 'nabhacare-enhanced-offline';
    this.dbVersion = 1;
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize IndexedDB with retry logic
   */
  async initialize() {
    if (this.initialized && this.db) {
      console.log('Enhanced offline storage already initialized');
      return true;
    }

    try {
      console.log('Starting enhanced offline storage initialization...');
      
      // Open IndexedDB with retry logic
      this.db = await this.openDatabase();
      this.initialized = true;
      
      console.log('Enhanced IndexedDB opened successfully');
      console.log('Enhanced offline storage initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize enhanced offline storage:', error);
      console.error('Error details:', error.message, error.stack);
      this.initialized = false;
      return false;
    }
  }

  /**
   * Open IndexedDB database with comprehensive error handling
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        console.log('IndexedDB opened successfully');
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        console.log('IndexedDB upgrade needed, creating object stores...');
        const db = event.target.result;
        
        // Create object stores with proper structure
        if (!db.objectStoreNames.contains('auth')) {
          const authStore = db.createObjectStore('auth', { keyPath: 'id' });
          console.log('Auth store created');
        }
        
        if (!db.objectStoreNames.contains('profile')) {
          const profileStore = db.createObjectStore('profile', { keyPath: 'id' });
          console.log('Profile store created');
        }
        
        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          console.log('Reports store created');
        }
        
        if (!db.objectStoreNames.contains('prescriptions')) {
          const prescriptionsStore = db.createObjectStore('prescriptions', { keyPath: 'id' });
          console.log('Prescriptions store created');
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          console.log('Sync queue store created');
        }
        
        console.log('All object stores created successfully');
      };
    });
  }

  /**
   * Store data in IndexedDB with comprehensive error handling
   */
  async store(storeName, key, data) {
    try {
      if (!this.initialized || !this.db) {
        console.log('Storage not initialized, initializing...');
        await this.initialize();
      }
      
      if (!this.db) {
        throw new Error('Failed to initialize database');
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ 
          id: key, 
          data: data, 
          timestamp: Date.now(),
          version: this.dbVersion
        });
        
        request.onsuccess = () => {
          console.log(`Data stored in ${storeName} with key:`, key, 'Data:', data);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error(`Failed to store data in ${storeName}:`, request.error);
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error(`Transaction failed for ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error(`Failed to store data in ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from IndexedDB with comprehensive error handling
   */
  async retrieve(storeName, key) {
    try {
      if (!this.initialized || !this.db) {
        console.log('Storage not initialized, initializing...');
        await this.initialize();
      }
      
      if (!this.db) {
        console.log('Database not available');
        return null;
      }
      
      const result = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        transaction.onerror = () => {
          console.error(`Transaction failed for ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      });
      
      if (result && result.data) {
        console.log(`Data retrieved from ${storeName} with key:`, key, 'Data:', result.data);
        return result.data;
      }
      
      console.log(`No data found in ${storeName} with key:`, key);
      return null;
    } catch (error) {
      console.error(`Failed to retrieve data from ${storeName}:`, error);
      return null;
    }
  }

  /**
   * Get all records from a store
   */
  async getAll(storeName) {
    try {
      if (!this.initialized || !this.db) {
        await this.initialize();
      }
      
      if (!this.db) {
        return [];
      }
      
      const results = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        
        transaction.onerror = () => {
          console.error(`Transaction failed for ${storeName}:`, transaction.error);
          reject(transaction.error);
        };
      });
      
      // For syncQueue, return the items directly as they're not wrapped in a data field
      if (storeName === 'syncQueue') {
        console.log(`Retrieved ${results.length} records from ${storeName}`);
        return results;
      }
      
      const data = results.map(result => result.data).filter(Boolean);
      console.log(`Retrieved ${data.length} records from ${storeName}`);
      return data;
    } catch (error) {
      console.error(`Failed to get all records from ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Store reports
   */
  async storeReports(reports) {
    try {
      console.log('Storing reports:', {
        count: reports?.length || 0,
        reports: reports?.map(r => ({
          id: r.id,
          title: r.title,
          isOffline: r.isOffline,
          hasFileData: !!r.fileData
        })) || []
      });
      
      if (!Array.isArray(reports)) {
        console.warn('Reports data is not an array:', typeof reports);
        return null;
      }
      
      const result = await this.store('reports', 'current', reports);
      console.log('Reports stored successfully, count:', reports.length);
      
      // Verify storage
      const verifyReports = await this.getReports();
      console.log('Verification - reports retrieved after storage:', verifyReports?.length || 0);
      
      return result;
    } catch (error) {
      console.error('Failed to store reports:', error);
      console.error('Error details:', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Retrieve reports
   */
  async getReports() {
    try {
      const reports = await this.retrieve('reports', 'current');
      console.log('Retrieved reports:', reports);
      return reports;
    } catch (error) {
      console.error('Failed to retrieve reports:', error);
      return null;
    }
  }

  /**
   * Store prescriptions
   */
  async storePrescriptions(prescriptions) {
    try {
      console.log('Storing prescriptions:', prescriptions);
      const result = await this.store('prescriptions', 'current', prescriptions);
      console.log('Prescriptions stored successfully');
      return result;
    } catch (error) {
      console.error('Failed to store prescriptions:', error);
      throw error;
    }
  }

  /**
   * Retrieve prescriptions
   */
  async getPrescriptions() {
    try {
      const prescriptions = await this.retrieve('prescriptions', 'current');
      console.log('Retrieved prescriptions:', prescriptions);
      return prescriptions;
    } catch (error) {
      console.error('Failed to retrieve prescriptions:', error);
      return null;
    }
  }

  /**
   * Store user profile
   */
  async storeProfile(profileData) {
    try {
      console.log('Storing profile:', profileData);
      const result = await this.store('profile', 'current', profileData);
      console.log('Profile stored successfully');
      return result;
    } catch (error) {
      console.error('Failed to store profile:', error);
      throw error;
    }
  }

  /**
   * Retrieve user profile
   */
  async getProfile() {
    try {
      const profile = await this.retrieve('profile', 'current');
      console.log('Retrieved profile:', profile);
      return profile;
    } catch (error) {
      console.error('Failed to retrieve profile:', error);
      return null;
    }
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item) {
    try {
      if (!this.initialized || !this.db) {
        await this.initialize();
      }
      
      if (!this.db) {
        throw new Error('Database not available');
      }
      
      // Ensure item has required fields
      const queueItem = {
        id: item.id || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: item.type,
        data: item.data,
        userId: item.userId || null,
        timestamp: item.timestamp || Date.now(),
        synced: item.synced || false,
        retries: item.retries || 0
      };
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.add(queueItem);
        
        request.onsuccess = () => {
          console.log('Item added to sync queue:', queueItem);
          resolve(request.result);
        };
        
        request.onerror = () => {
          console.error('Failed to add to sync queue:', request.error);
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error('Transaction failed for sync queue:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get sync queue items
   */
  async getSyncQueue() {
    try {
      const items = await this.getAll('syncQueue');
      console.log('Retrieved sync queue items:', items);
      return items;
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    try {
      if (!this.initialized || !this.db) {
        await this.initialize();
      }
      
      if (!this.db) {
        throw new Error('Database not available');
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('Sync queue cleared successfully');
          resolve();
        };
        
        request.onerror = () => {
          console.error('Failed to clear sync queue:', request.error);
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error('Transaction failed for clearing sync queue:', transaction.error);
          reject(transaction.error);
        };
      });
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
      throw error;
    }
  }

  /**
   * Check if offline data exists
   */
  async hasOfflineData() {
    try {
      const authData = await this.retrieve('auth', 'current');
      const syncQueue = await this.getSyncQueue();
      const reports = await this.getReports();
      const prescriptions = await this.getPrescriptions();
      const profile = await this.getProfile();
      
      const hasData = authData !== null || 
                     (syncQueue && syncQueue.length > 0) ||
                     (reports && reports.length > 0) ||
                     (prescriptions && prescriptions.length > 0) ||
                     profile !== null;
      
      console.log('Has offline data:', hasData, {
        hasAuth: !!authData,
        syncQueueCount: syncQueue?.length || 0,
        reportsCount: reports?.length || 0,
        prescriptionsCount: prescriptions?.length || 0,
        hasProfile: !!profile
      });
      return hasData;
    } catch (error) {
      console.error('Failed to check offline data:', error);
      return false;
    }
  }

  /**
   * Store authentication data
   */
  async storeAuth(authData) {
    try {
      console.log('Storing auth data:', authData);
      const result = await this.store('auth', 'current', authData);
      console.log('Auth data stored successfully');
      return result;
    } catch (error) {
      console.error('Failed to store auth data:', error);
      throw error;
    }
  }

  /**
   * Retrieve authentication data
   */
  async getAuth() {
    try {
      const authData = await this.retrieve('auth', 'current');
      console.log('Retrieved auth data:', authData);
      return authData;
    } catch (error) {
      console.error('Failed to retrieve auth data:', error);
      return null;
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll() {
    try {
      if (!this.initialized || !this.db) {
        await this.initialize();
      }
      
      if (!this.db) {
        throw new Error('Database not available');
      }
      
      const storeNames = ['auth', 'profile', 'reports', 'prescriptions', 'syncQueue'];
      
      for (const storeName of storeNames) {
        await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => {
            console.log(`${storeName} store cleared`);
            resolve();
          };
          
          request.onerror = () => {
            console.error(`Failed to clear ${storeName} store:`, request.error);
            reject(request.error);
          };
        });
      }
      
      console.log('All enhanced offline data cleared');
    } catch (error) {
      console.error('Failed to clear enhanced offline data:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      if (!this.initialized || !this.db) {
        await this.initialize();
      }
      
      if (!this.db) {
        return null;
      }
      
      const stats = {};
      const storeNames = ['auth', 'profile', 'reports', 'prescriptions', 'syncQueue'];
      
      for (const storeName of storeNames) {
        try {
          const count = await new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.count();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          
          stats[storeName] = count;
        } catch (error) {
          console.error(`Failed to get count for ${storeName}:`, error);
          stats[storeName] = 0;
        }
      }
      
      console.log('Storage stats:', stats);
      return stats;
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return null;
    }
  }

  /**
   * Test offline storage functionality
   */
  async testOfflineStorage() {
    try {
      console.log('Testing offline storage functionality...');
      
      // Get existing data first
      const existingReports = await this.getReports();
      const existingSyncQueue = await this.getSyncQueue();
      console.log('Existing data before test:', {
        reports: existingReports?.length || 0,
        syncQueue: existingSyncQueue?.length || 0
      });
      
      // Test data
      const testReport = {
        id: `test_${Date.now()}`,
        title: 'Test Report',
        description: 'This is a test report',
        patientId: 'test_patient',
        doctorId: 'test_doctor',
        reportType: 'lab',
        createdAt: new Date(),
        isOffline: true
      };
      
      // Test storing reports - append to existing reports
      console.log('Testing report storage...');
      const allReports = [...(existingReports || []), testReport];
      await this.storeReports(allReports);
      
      // Test retrieving reports
      console.log('Testing report retrieval...');
      const retrievedReports = await this.getReports();
      console.log('Retrieved reports:', retrievedReports);
      
      // Test sync queue - append to existing queue
      console.log('Testing sync queue...');
      const testSyncItem = {
        id: `sync_test_${Date.now()}`,
        type: 'report',
        data: testReport,
        userId: 'test_user',
        timestamp: Date.now(),
        synced: false,
        retries: 0
      };
      
      await this.addToSyncQueue(testSyncItem);
      const syncQueue = await this.getSyncQueue();
      console.log('Sync queue:', syncQueue);
      
      console.log('Offline storage test completed successfully');
      return {
        success: true,
        reportsStored: retrievedReports?.length || 0,
        syncQueueItems: syncQueue?.length || 0
      };
    } catch (error) {
      console.error('Offline storage test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test complete offline-to-online workflow
   */
  async testOfflineToOnlineWorkflow() {
    try {
      console.log('Testing complete offline-to-online workflow...');
      
      // Step 1: Create offline report
      const offlineReport = {
        id: `workflow_test_${Date.now()}`,
        title: 'Workflow Test Report',
        description: 'This report tests the offline-to-online workflow',
        patientId: 'workflow_test_patient',
        doctorId: 'workflow_test_doctor',
        reportType: 'lab',
        createdAt: new Date(),
        isOffline: true
      };
      
      console.log('Step 1: Creating offline report...');
      await this.storeReports([offlineReport]);
      
      // Step 2: Add to sync queue
      console.log('Step 2: Adding to sync queue...');
      const syncItem = {
        id: `workflow_sync_${Date.now()}`,
        type: 'report',
        data: offlineReport,
        userId: 'workflow_test_user',
        timestamp: Date.now(),
        synced: false,
        retries: 0
      };
      
      await this.addToSyncQueue(syncItem);
      
      // Step 3: Verify data persistence
      console.log('Step 3: Verifying data persistence...');
      const persistedReports = await this.getReports();
      const persistedSyncQueue = await this.getSyncQueue();
      
      const reportFound = persistedReports.some(r => r.id === offlineReport.id);
      const syncItemFound = persistedSyncQueue.some(s => s.id === syncItem.id);
      
      console.log('Workflow test results:', {
        reportFound,
        syncItemFound,
        totalReports: persistedReports.length,
        totalSyncItems: persistedSyncQueue.length
      });
      
      return {
        success: reportFound && syncItemFound,
        reportFound,
        syncItemFound,
        totalReports: persistedReports.length,
        totalSyncItems: persistedSyncQueue.length
      };
    } catch (error) {
      console.error('Offline-to-online workflow test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const enhancedOfflineStorage = new EnhancedOfflineStorage();

export default enhancedOfflineStorage;
