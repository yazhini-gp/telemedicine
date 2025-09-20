// Offline Storage Service using IndexedDB
class OfflineStorageService {
  constructor() {
    this.dbName = 'NabhaCareOffline';
    this.dbVersion = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create reports store
        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('patientId', 'patientId', { unique: false });
          reportsStore.createIndex('doctorId', 'doctorId', { unique: false });
          reportsStore.createIndex('createdAt', 'createdAt', { unique: false });
          reportsStore.createIndex('reportType', 'reportType', { unique: false });
        }

        // Create sync queue store for offline operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('operation', 'operation', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Reports operations
  async saveReport(report) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const request = store.put(report);

      request.onsuccess = () => {
        console.log('Report saved offline:', report.id);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error saving report offline:', request.error);
        reject(request.error);
      };
    });
  }

  async getReports(patientId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const index = store.index('patientId');
      const request = index.getAll(patientId);

      request.onsuccess = () => {
        const reports = request.result.sort((a, b) => 
          new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt)
        );
        resolve(reports);
      };

      request.onerror = () => {
        console.error('Error getting reports offline:', request.error);
        reject(request.error);
      };
    });
  }

  async getReportById(reportId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const request = store.get(reportId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error getting report offline:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteReport(reportId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const request = store.delete(reportId);

      request.onsuccess = () => {
        console.log('Report deleted offline:', reportId);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error deleting report offline:', request.error);
        reject(request.error);
      };
    });
  }

  // Sync queue operations for offline actions
  async addToSyncQueue(operation, data) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const syncItem = {
        operation,
        data,
        timestamp: new Date().toISOString(),
        retries: 0
      };
      const request = store.add(syncItem);

      request.onsuccess = () => {
        console.log('Operation added to sync queue:', operation);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error adding to sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  async getSyncQueue() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error getting sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  async removeFromSyncQueue(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Operation removed from sync queue:', id);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error removing from sync queue:', request.error);
        reject(request.error);
      };
    });
  }

  // Clear all offline data
  async clearAllData() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reports', 'syncQueue'], 'readwrite');
      
      const reportsStore = transaction.objectStore('reports');
      const syncStore = transaction.objectStore('syncQueue');
      
      const reportsRequest = reportsStore.clear();
      const syncRequest = syncStore.clear();

      let completed = 0;
      const onComplete = () => {
        completed++;
        if (completed === 2) {
          console.log('All offline data cleared');
          resolve();
        }
      };

      reportsRequest.onsuccess = onComplete;
      syncRequest.onsuccess = onComplete;

      reportsRequest.onerror = () => reject(reportsRequest.error);
      syncRequest.onerror = () => reject(syncRequest.error);
    });
  }

  // Check if we're online
  isOnline() {
    return navigator.onLine;
  }

  // Get storage usage info
  async getStorageInfo() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reports', 'syncQueue'], 'readonly');
      
      const reportsStore = transaction.objectStore('reports');
      const syncStore = transaction.objectStore('syncQueue');
      
      const reportsRequest = reportsStore.count();
      const syncRequest = syncStore.count();

      let completed = 0;
      const result = { reports: 0, pendingSync: 0 };

      const onComplete = () => {
        completed++;
        if (completed === 2) {
          resolve(result);
        }
      };

      reportsRequest.onsuccess = () => {
        result.reports = reportsRequest.result;
        onComplete();
      };

      syncRequest.onsuccess = () => {
        result.pendingSync = syncRequest.result;
        onComplete();
      };

      reportsRequest.onerror = () => reject(reportsRequest.error);
      syncRequest.onerror = () => reject(syncRequest.error);
    });
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorageService();

export default offlineStorage;
