/**
 * Offline Storage Utility with Encryption
 * Technology: Web Crypto API, IndexedDB, AES-GCM encryption
 * 
 * Provides secure offline storage for patient data with encryption/decryption
 */

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

class OfflineStorage {
  constructor() {
    this.dbName = 'nabhacare-offline';
    this.dbVersion = 1;
    this.db = null;
    this.cryptoKey = null;
  }

  /**
   * Initialize IndexedDB and generate encryption key
   */
  async initialize() {
    try {
      console.log('Starting offline storage initialization...');
      
      // Open IndexedDB
      this.db = await this.openDatabase();
      console.log('IndexedDB opened successfully');
      
      // Generate or retrieve encryption key
      await this.initializeCryptoKey();
      console.log('Crypto key initialized successfully');
      
      console.log('Offline storage initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
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
        
        if (!db.objectStoreNames.contains('records')) {
          db.createObjectStore('records', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('prescriptions')) {
          db.createObjectStore('prescriptions', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('reports')) {
          db.createObjectStore('reports', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  /**
   * Generate or retrieve encryption key from secure storage
   */
  async initializeCryptoKey() {
    try {
      console.log('Initializing crypto key...');
      
      // Try to get existing key from sessionStorage (temporary)
      const existingKey = sessionStorage.getItem('offline-crypto-key');
      
      if (existingKey) {
        console.log('Found existing crypto key, importing...');
        const keyData = JSON.parse(existingKey);
        this.cryptoKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          ENCRYPTION_ALGORITHM,
          false,
          ['encrypt', 'decrypt']
        );
        console.log('Existing crypto key imported successfully');
      } else {
        console.log('No existing crypto key found, generating new one...');
        // Generate new key
        this.cryptoKey = await crypto.subtle.generateKey(
          {
            name: ENCRYPTION_ALGORITHM,
            length: KEY_LENGTH
          },
          true,
          ['encrypt', 'decrypt']
        );
        
        // Export and store key
        const exportedKey = await crypto.subtle.exportKey('raw', this.cryptoKey);
        sessionStorage.setItem('offline-crypto-key', JSON.stringify(Array.from(exportedKey)));
        console.log('New crypto key generated and stored');
      }
    } catch (error) {
      console.error('Failed to initialize crypto key:', error);
      console.error('Crypto key error details:', error.message, error.stack);
      throw error;
    }
  }

  /**
   * Encrypt data using AES-GCM
   */
  async encrypt(data) {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: ENCRYPTION_ALGORITHM,
          iv: iv
        },
        this.cryptoKey,
        encodedData
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);
      
      return Array.from(combined);
    } catch (error) {
      console.error('Encryption failed:', error);
      throw error;
    }
  }

  /**
   * Decrypt data using AES-GCM
   */
  async decrypt(encryptedData) {
    try {
      const combined = new Uint8Array(encryptedData);
      const iv = combined.slice(0, IV_LENGTH);
      const encrypted = combined.slice(IV_LENGTH);
      
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_ALGORITHM,
          iv: iv
        },
        this.cryptoKey,
        encrypted
      );
      
      const decodedData = new TextDecoder().decode(decryptedData);
      return JSON.parse(decodedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  }

  /**
   * Store encrypted data in IndexedDB
   */
  async store(storeName, key, data) {
    try {
      const encryptedData = await this.encrypt(data);
      
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put({ id: key, data: encryptedData, timestamp: Date.now() });
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`Failed to store data in ${storeName}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve and decrypt data from IndexedDB
   */
  async retrieve(storeName, key) {
    try {
      const result = await new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result && result.data) {
        return await this.decrypt(result.data);
      }
      
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
      
      const decryptedResults = [];
      for (const result of results) {
        if (result && result.data) {
          try {
            const decryptedData = await this.decrypt(result.data);
            decryptedResults.push({ ...decryptedData, timestamp: result.timestamp });
          } catch (error) {
            console.warn('Failed to decrypt record:', error);
          }
        }
      }
      
      return decryptedResults;
    } catch (error) {
      console.error(`Failed to get all records from ${storeName}:`, error);
      return [];
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll() {
    try {
      const storeNames = ['auth', 'profile', 'records', 'prescriptions', 'reports', 'syncQueue'];
      
      for (const storeName of storeNames) {
        await new Promise((resolve, reject) => {
          const transaction = this.db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      // Clear crypto key
      sessionStorage.removeItem('offline-crypto-key');
      this.cryptoKey = null;
      
      console.log('All offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
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
   * Store medical records
   */
  async storeRecords(records) {
    return this.store('records', 'current', records);
  }

  /**
   * Retrieve medical records
   */
  async getRecords() {
    return this.retrieve('records', 'current');
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
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
