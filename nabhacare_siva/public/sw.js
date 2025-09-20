/**
 * Service Worker for Background Sync
 * Technology: Service Worker API, Background Sync API, Cache API
 * 
 * Handles background synchronization when the app is not active
 */

const CACHE_NAME = 'nabhacare-offline-v1';
const OFFLINE_URL = '/offline.html';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching offline page');
        return cache.add(OFFLINE_URL);
      })
      .then(() => {
        console.log('Service worker installed');
        return self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service worker activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service worker activated');
        return self.clients.claim();
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Return offline page if network fails
          return caches.match(OFFLINE_URL);
        })
    );
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    console.log('Starting background sync');
    
    // Get all clients (tabs)
    const clients = await self.clients.matchAll();
    
    // Send sync start message to all clients
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_START'
      });
    });
    
    // Perform sync operations
    await performSyncOperations();
    
    // Send sync complete message to all clients
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
    
    // Send sync error message to all clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC_ERROR',
        error: error.message
      });
    });
  }
}

// Perform actual sync operations
async function performSyncOperations() {
  try {
    // Import sync service
    const { default: syncService } = await import('/src/services/syncService.js');
    
    // Initialize and start sync
    await syncService.initialize();
    await syncService.startSync();
    
  } catch (error) {
    console.error('Sync operations failed:', error);
    throw error;
  }
}

// Message event handler
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'REGISTER_BACKGROUND_SYNC') {
    // Register background sync
    self.registration.sync.register('background-sync')
      .then(() => {
        console.log('Background sync registered');
        event.ports[0].postMessage({ success: true });
      })
      .catch((error) => {
        console.error('Failed to register background sync:', error);
        event.ports[0].postMessage({ success: false, error: error.message });
      });
  }
});

// Periodic background sync (if supported)
if ('serviceWorker' in navigator && 'periodicBackgroundSync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('periodicsync', (event) => {
    console.log('Periodic background sync:', event.tag);
    
    if (event.tag === 'content-sync') {
      event.waitUntil(doBackgroundSync());
    }
  });
}

console.log('Service worker loaded');
