// Service Worker for offline functionality
const CACHE_NAME = 'capecredit-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/logo-placeholder.png',
  '/images/favicon.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        // API requests - try network first, then cache
        if (event.request.url.includes('/api/')) {
          return fetch(fetchRequest)
            .then(response => {
              // Check if valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Clone the response
              const responseToCache = response.clone();

              // Cache the response for future
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });

              return response;
            })
            .catch(() => {
              // If network fails, try to serve from cache
              return caches.match(event.request);
            });
        }

        // For non-API requests, try network and cache the result
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Cache the response for future
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If both network and cache fail, return a fallback
            if (event.request.url.includes('/images/')) {
              return caches.match('/images/logo-placeholder.png');
            }
          });
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  } else if (event.tag === 'sync-documents') {
    event.waitUntil(syncDocuments());
  }
});

// Function to sync offline transactions
function syncTransactions() {
  return localforage.getItem('offline-transactions')
    .then(transactions => {
      if (!transactions || transactions.length === 0) {
        return;
      }

      // Get user ID from storage
      return localforage.getItem('user-id')
        .then(userId => {
          if (!userId) {
            throw new Error('User ID not found');
          }

          // Send transactions to server
          return fetch(`/api/transactions/sync/${userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ transactions })
          });
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to sync transactions');
          }
          return response.json();
        })
        .then(data => {
          // Clear synced transactions
          return localforage.setItem('offline-transactions', []);
        })
        .catch(error => {
          console.error('Transaction sync failed:', error);
        });
    });
}

// Function to sync offline documents
function syncDocuments() {
  return localforage.getItem('offline-documents')
    .then(documents => {
      if (!documents || documents.length === 0) {
        return;
      }

      // Get user ID from storage
      return localforage.getItem('user-id')
        .then(userId => {
          if (!userId) {
            throw new Error('User ID not found');
          }

          // Process each document
          return Promise.all(documents.map(doc => {
            return fetch(`/api/formalization/documents/${userId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(doc)
            });
          }));
        })
        .then(() => {
          // Clear synced documents
          return localforage.setItem('offline-documents', []);
        })
        .catch(error => {
          console.error('Document sync failed:', error);
        });
    });
}

// Push notification support
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/images/logo-placeholder.png',
    badge: '/images/favicon.png',
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});
