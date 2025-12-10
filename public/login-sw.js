// Service Worker for login persistence
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle fetch events to intercept auth-related requests if needed
self.addEventListener('fetch', (event) => {
  // Just pass through all requests for now
  // This could be enhanced later to handle offline auth or caching auth-related assets
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STORE_AUTH') {
    // Store auth data in IndexedDB or other persistent storage if needed
  }
});
