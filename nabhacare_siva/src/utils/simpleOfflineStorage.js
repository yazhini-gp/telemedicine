/**
 * Simple Offline Storage without encryption
 * Technology: IndexedDB
 * 
 * Provides offline storage for patient data without encryption for debugging
 */

class SimpleOfflineStorage {
  constructor() {
    this.dbName = 'nabhacare-simple-offline';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   */
  async initialize() {
    try {
      console.log('Starting simple offline storage initialization...');
      
      // Open IndexedDB
      this.db = await this.openDatabase();
      console.log('Simple IndexedDB opened successfully');
      
      console.log('Simple offline storage initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize simple offline storage:', error);
      console.error('Error details:', error.message, error.stack);
      return false;
    }
  }

  /**
   * Open IndexedDB database
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('auth')) {
          db.createObjectStore('auth', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('profile')) {
          db.createObjectStore('profile', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('prescriptions')) {
          db.createObjectStore('prescriptions', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Store data in IndexedDB (without encryption)
   */
  async store(storeName, key, data) {
    try {
      if (!this.db) {
        await this.initialize();
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ id: key, data: data, timestamp: Date.now() });
        
        request.onsuccess = () => {
          console.log(`Data stored in ${storeName} with key:`, key);
          resolve(request.result);
        };
        request.onerror = () => {
          console.error(`Failed to store data in ${storeName}:`, request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error(`Failed to store data in ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve data from IndexedDB (without decryption)
   */
  async retrieve(storeName, key) {
    try {
      if (!this.db) {
        await this.initialize();
      }
      
      const result = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result && result.data) {
        console.log(`Data retrieved from ${storeName} with key:`, key);
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
      const results = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      return results.map(result => result.data).filter(Boolean);
    } catch (error) {
      console.error(`Failed to get all records from ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Store reports
   */
  async storeReports(reports) {
    return this.store('reports', 'current', reports);
  }

  /**
   * Retrieve reports
   */
  async getReports() {
    return this.retrieve('reports', 'current');
  }

  /**
   * Store prescriptions
   */
  async storePrescriptions(prescriptions) {
    return this.store('prescriptions', 'current', prescriptions);
  }

  /**
   * Retrieve prescriptions
   */
  async getPrescriptions() {
    return this.retrieve('prescriptions', 'current');
  }

  /**
   * Store user profile
   */
  async storeProfile(profileData) {
    return this.store('profile', 'current', profileData);
  }

  /**
   * Retrieve user profile
   */
  async getProfile() {
    return this.retrieve('profile', 'current');
  }

  /**
   * Add item to sync queue
   */
  async addToSyncQueue(item) {
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.add({
          ...item,
          timestamp: Date.now(),
          synced: false
        });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
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
    return this.getAll('syncQueue');
  }

  /**
   * Clear sync queue
   */
  async clearSyncQueue() {
    try {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['syncQueue'], 'readwrite');
        const store = transaction.objectStore('syncQueue');
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
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
      return authData !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Store authentication data
   */
  async storeAuth(authData) {
    return this.store('auth', 'current', authData);
  }

  /**
   * Retrieve authentication data
   */
  async getAuth() {
    return this.retrieve('auth', 'current');
  }

  /**
   * Clear all offline data
   */
  async clearAll() {
    try {
      const storeNames = ['auth', 'profile', 'reports', 'prescriptions', 'syncQueue'];
      
      for (const storeName of storeNames) {
        await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      console.log('All simple offline data cleared');
    } catch (error) {
      console.error('Failed to clear simple offline data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const simpleOfflineStorage = new SimpleOfflineStorage();

export default simpleOfflineStorage;
