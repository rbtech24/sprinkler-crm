const CACHE_NAME = 'sprinklertech-v1.0.0'
const OFFLINE_URL = '/tech/offline'

// Essential files for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/tech',
  '/tech/offline',
  '/auth/login',
  '/manifest.json',
  // Add critical CSS/JS files here
]

// API endpoints to cache for offline access
const API_CACHE_URLS = [
  '/api/dashboard/stats',
  '/api/work-orders',
  '/api/inspections',
  '/api/clients',
]

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('[SW] Install event')
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME)
        console.log('[SW] Caching essential resources')
        await cache.addAll(STATIC_CACHE_URLS)
        
        // Skip waiting to activate immediately
        self.skipWaiting()
      } catch (error) {
        console.error('[SW] Cache installation failed:', error)
      }
    })()
  )
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event')
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
      
      // Claim all clients
      self.clients.claim()
    })()
  )
})

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Handle tech dashboard routes
  if (url.pathname.startsWith('/tech')) {
    event.respondWith(
      (async () => {
        try {
          // Try network first for tech pages
          const networkResponse = await fetch(request)
          
          // Cache successful responses
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, networkResponse.clone())
          }
          
          return networkResponse
        } catch (error) {
          // Fallback to cache when offline
          console.log('[SW] Network failed, trying cache for:', url.pathname)
          
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            return cachedResponse
          }
          
          // Show offline page for tech routes when no cache
          if (url.pathname.startsWith('/tech')) {
            return caches.match('/tech/offline')
          }
          
          throw error
        }
      })()
    )
    return
  }
  
  // Handle API requests
  if (url.pathname.startsWith('/api')) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request)
          
          // Cache successful API responses
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME)
            
            // Only cache specific API endpoints
            if (API_CACHE_URLS.some(endpoint => url.pathname.includes(endpoint.split('/api')[1]))) {
              cache.put(request, networkResponse.clone())
            }
          }
          
          return networkResponse
        } catch (error) {
          console.log('[SW] API request failed, trying cache:', url.pathname)
          
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            // Add offline indicator to cached API responses
            const response = cachedResponse.clone()
            return new Response(
              JSON.stringify({
                ...await response.json(),
                _offline: true,
                _cached_at: new Date().toISOString()
              }), 
              {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
              }
            )
          }
          
          // Return minimal offline response for critical endpoints
          if (url.pathname.includes('/work-orders')) {
            return new Response(JSON.stringify({
              data: [],
              message: 'Offline - no work orders available',
              _offline: true
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            })
          }
          
          throw error
        }
      })()
    )
    return
  }
  
  // Handle all other requests with cache-first strategy
  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request)
      if (cachedResponse) {
        return cachedResponse
      }
      
      try {
        const networkResponse = await fetch(request)
        
        // Cache successful responses
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, networkResponse.clone())
        }
        
        return networkResponse
      } catch (error) {
        console.error('[SW] Request failed:', error)
        throw error
      }
    })()
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'inspection-sync') {
    event.waitUntil(syncInspections())
  }
  
  if (event.tag === 'photo-sync') {
    event.waitUntil(syncPhotos())
  }
})

// Sync offline inspections when back online
async function syncInspections() {
  try {
    console.log('[SW] Syncing offline inspections...')
    
    // Get offline inspections from IndexedDB
    // This would need to be implemented with actual offline storage
    const offlineInspections = await getOfflineInspections()
    
    for (const inspection of offlineInspections) {
      try {
        const response = await fetch('/api/inspections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${inspection.token}`
          },
          body: JSON.stringify(inspection.data)
        })
        
        if (response.ok) {
          await removeOfflineInspection(inspection.id)
          console.log('[SW] Synced inspection:', inspection.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync inspection:', error)
      }
    }
  } catch (error) {
    console.error('[SW] Inspection sync failed:', error)
  }
}

// Sync offline photos
async function syncPhotos() {
  try {
    console.log('[SW] Syncing offline photos...')
    // Implementation would depend on photo storage strategy
  } catch (error) {
    console.error('[SW] Photo sync failed:', error)
  }
}

// Push notifications for new work assignments
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  const options = {
    title: 'New Work Assignment',
    body: 'You have a new inspection scheduled',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'work-assignment',
    data: {
      url: '/tech'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.title = data.title || options.title
    options.body = data.body || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  
  event.notification.close()
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/tech'
    
    event.waitUntil(
      clients.openWindow(url)
    )
  }
})

// Placeholder functions for offline storage (would need IndexedDB implementation)
async function getOfflineInspections() {
  // Return offline inspections from IndexedDB
  return []
}

async function removeOfflineInspection(id) {
  // Remove synced inspection from IndexedDB
  console.log('Removing offline inspection:', id)
}